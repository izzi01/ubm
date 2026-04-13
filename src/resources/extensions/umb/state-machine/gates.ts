/**
 * GSD Approval Gate System.
 *
 * Provides configurable approval gates that intercept state machine
 * transitions and pause execution when human approval is required.
 *
 * Gate policies:
 * - 'always': Always block the transition, requiring explicit approval.
 * - 'high-risk-only': Only block for slices with risk level 'high'.
 * - 'never': Never block (gate is effectively disabled).
 *
 * Gate config is stored per-slice in a runtime registry (no new DB table).
 * Use setGateConfig() to register a gate config for a slice.
 *
 * Usage:
 *   const gates = new GsdGateManager(db, stateMachine);
 *   gates.setGateConfig("S01", { sliceComplete: "always", taskStart: "high-risk-only" });
 *   const result = gates.advanceWithGate("slice", "S01");
 *   if (result.blocked) {
 *     // await human approval, then:
 *     gates.approve("slice", "S01");
 *   }
 */

import { GsdDb } from "../db/gsd-db.js";
import type { SliceRisk } from "../db/types.js";
import { GsdStateMachine } from "./state-machine.js";
import type { EntityType } from "./types.js";
import { GsdStateMachineError } from "./types.js";

// ─── Gate types ────────────────────────────────────────────────────────────

/**
 * Policy controlling when a gate fires.
 *
 * - 'always': Always block the transition.
 * - 'high-risk-only': Only block when the owning slice is high-risk.
 * - 'never': Never block (gate disabled).
 */
export type GatePolicy = "always" | "high-risk-only" | "never";

/**
 * Named transition types that can be gated.
 *
 * Keys match the semantic transitions in the state machine:
 * - sliceComplete: slice active → complete
 * - sliceStart: slice pending → active
 * - taskStart: task pending → active
 * - taskComplete: task active → complete
 * - milestoneComplete: milestone active → completed
 */
export type GateTransitionType =
  | "sliceComplete"
  | "sliceStart"
  | "taskStart"
  | "taskComplete"
  | "milestoneComplete";

/**
 * Gate configuration for a slice.
 *
 * Maps transition types to policies. Omitted transitions default to 'never'.
 */
export type GateConfig = Partial<Record<GateTransitionType, GatePolicy>>;

/**
 * Result of a gate check.
 */
export interface GateResult {
  /** Whether the transition was blocked by a gate. */
  blocked: boolean;
  /** Human-readable reason for blocking (present when blocked). */
  reason?: string;
  /** Which gate type triggered the block. */
  gateType?: GateTransitionType;
}

/**
 * Error thrown for gate-related operations (e.g., approving non-blocked unit).
 */
export class GateError extends Error {
  constructor(
    message: string,
    public readonly entityType: EntityType,
    public readonly entityId: string,
  ) {
    super(message);
    this.name = "GateError";
  }
}

// ─── GsdGateManager ────────────────────────────────────────────────────────

export class GsdGateManager {
  /** Registry mapping slice IDs to their gate configurations. */
  private gateConfigs = new Map<string, GateConfig>();

  /** Set of entities currently awaiting approval. */
  private awaitingApproval = new Set<string>();

  constructor(
    private readonly db: GsdDb,
    private readonly stateMachine: GsdStateMachine,
  ) {}

  /**
   * Set the gate configuration for a slice.
   * Overwrites any previous config for this slice.
   */
  setGateConfig(sliceId: string, config: GateConfig): void {
    this.gateConfigs.set(sliceId, { ...config });
  }

  /**
   * Get the gate configuration for a slice.
   * Returns undefined if no config is registered.
   */
  getGateConfig(sliceId: string): GateConfig | undefined {
    return this.gateConfigs.get(sliceId);
  }

  /**
   * Remove the gate configuration for a slice.
   */
  removeGateConfig(sliceId: string): boolean {
    return this.gateConfigs.delete(sliceId);
  }

  /**
   * Check whether a transition requires approval.
   *
   * Evaluates the gate config for the owning slice. If no config is
   * registered, or the transition type isn't gated, the check passes.
   * Malformed config entries are silently ignored (gate doesn't fire).
   *
   * For tasks and slices, looks up the owning slice's config.
   * For milestones, there is no per-slice gate — milestones are not gated
   * directly (their completion depends on slices, which are gated).
   */
  checkGate(
    entityType: EntityType,
    id: string,
    transition: GateTransitionType,
  ): GateResult {
    // Milestones are not directly gated — their transitions depend on slices
    if (entityType === "milestone") {
      return { blocked: false };
    }

    // Find the owning slice ID
    const sliceId = this.resolveSliceId(entityType, id);
    if (!sliceId) {
      return { blocked: false };
    }

    const config = this.gateConfigs.get(sliceId);
    if (!config) {
      return { blocked: false };
    }

    const policy = config[transition];
    if (!policy || policy === "never") {
      return { blocked: false };
    }

    // Validate policy — skip malformed entries
    if (policy !== "always" && policy !== "high-risk-only") {
      return { blocked: false };
    }

    // For 'high-risk-only', check the slice's risk level
    if (policy === "high-risk-only") {
      const slice = this.db.sliceGet(sliceId);
      if (!slice || slice.risk !== "high") {
        return { blocked: false };
      }
    }

    return {
      blocked: true,
      reason: `Gate "${transition}" blocked ${entityType} "${id}" (policy: ${policy})`,
      gateType: transition,
    };
  }

  /**
   * Advance a unit, respecting any configured approval gates.
   *
   * Flow:
   * 1. Check if the state machine can advance (canAdvance).
   * 2. Determine the semantic transition type.
   * 3. Check if a gate blocks this transition.
   * 4. If blocked → mark as awaiting approval and return blocked result.
   * 5. If not blocked → proceed with advance.
   */
  advanceWithGate(entityType: EntityType, id: string): GateResult {
    // Check if already awaiting approval
    if (this.isAwaitingApproval(entityType, id)) {
      return {
        blocked: true,
        reason: `${entityType} "${id}" is already awaiting approval`,
      };
    }

    // Check if the state machine can advance
    if (!this.stateMachine.canAdvance(entityType, id)) {
      return {
        blocked: false,
        reason: `${entityType} "${id}" cannot advance (terminal or unknown state)`,
      };
    }

    // Determine the semantic transition type
    const transitionType = this.inferTransitionType(entityType, id);
    if (!transitionType) {
      // Unknown transition type — allow through (no gate to check)
      this.stateMachine.advance(entityType, id);
      return { blocked: false };
    }

    // Check the gate
    const gateResult = this.checkGate(entityType, id, transitionType);
    if (gateResult.blocked) {
      this.awaitingApproval.add(this.approvalKey(entityType, id));
      return gateResult;
    }

    // No gate — advance normally
    this.stateMachine.advance(entityType, id);
    return { blocked: false };
  }

  /**
   * Approve a blocked unit, resuming the transition.
   *
   * If the unit is not awaiting approval, throws GateError.
   * Double-approval is idempotent (no-op after first approval).
   */
  approve(entityType: EntityType, id: string): void {
    const key = this.approvalKey(entityType, id);

    if (!this.awaitingApproval.has(key)) {
      // Not awaiting approval — check if already advanced
      const status = this.stateMachine.getStatus(entityType, id);
      if (status !== undefined) {
        // Idempotent: already approved or never blocked
        return;
      }
      throw new GateError(
        `${entityType} "${id}" is not awaiting approval`,
        entityType,
        id,
      );
    }

    // Remove from awaiting set and advance
    this.awaitingApproval.delete(key);
    this.stateMachine.advance(entityType, id);
  }

  /**
   * Check whether a unit is currently awaiting approval.
   */
  isAwaitingApproval(entityType: EntityType, id: string): boolean {
    return this.awaitingApproval.has(this.approvalKey(entityType, id));
  }

  /**
   * Clear all awaiting-approval state and gate configs.
   * Useful for test teardown.
   */
  reset(): void {
    this.awaitingApproval.clear();
    this.gateConfigs.clear();
  }

  // ─── Private helpers ────────────────────────────────────────────────────

  private approvalKey(entityType: EntityType, id: string): string {
    return `${entityType}:${id}`;
  }

  /**
   * Resolve the owning slice ID for an entity.
   * For slices, returns the slice ID itself.
   * For tasks, looks up the task's sliceId.
   * For milestones, returns null (not applicable).
   */
  private resolveSliceId(
    entityType: EntityType,
    id: string,
  ): string | null {
    if (entityType === "slice") {
      return id;
    }
    if (entityType === "task") {
      const task = this.db.taskGet(id);
      return task?.sliceId ?? null;
    }
    return null;
  }

  /**
   * Infer the semantic transition type from entity type and current status.
   */
  private inferTransitionType(
    entityType: EntityType,
    id: string,
  ): GateTransitionType | null {
    const status = this.stateMachine.getStatus(entityType, id);
    if (!status) return null;

    const nextStatus = this.stateMachine.getNextStatus(entityType, id);

    if (entityType === "slice") {
      if (status === "pending" && nextStatus === "active") return "sliceStart";
      if (status === "active" && nextStatus === "complete") return "sliceComplete";
    }

    if (entityType === "task") {
      if (status === "pending" && nextStatus === "active") return "taskStart";
      if (status === "active" && nextStatus === "complete") return "taskComplete";
    }

    if (entityType === "milestone") {
      if (status === "active" && nextStatus === "completed") return "milestoneComplete";
    }

    return null;
  }
}

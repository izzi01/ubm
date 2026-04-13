/**
 * GSD State Machine — lifecycle engine for milestones, slices, and tasks.
 *
 * Enforces valid state transitions, tracks execution phase,
 * and persists all changes to the database via GsdDb.
 *
 * Usage:
 *   const sm = new GsdStateMachine(db);
 *   sm.advance("task", "T01");           // pending → active
 *   sm.advance("task", "T01");           // active → complete
 *   sm.getPhase("M001");                 // → "execute"
 */

import { GsdDb } from "../db/gsd-db.js";
import type {
  MilestoneStatus,
  SliceStatus,
  TaskStatus,
} from "../db/types.js";
import type {
  EntityType,
  AnyStatus,
  StateMachinePhase,
  TransitionResult,
  StateMachineConfig,
} from "./types.js";
import {
  MILESTONE_TRANSITIONS,
  SLICE_TRANSITIONS,
  TASK_TRANSITIONS,
  GsdStateMachineError,
} from "./types.js";

// ─── Transition map lookup ─────────────────────────────────────────────────

type TransitionMap = Record<string, string[]>;

function getTransitions(
  entityType: EntityType,
  config?: StateMachineConfig,
): TransitionMap {
  if (entityType === "milestone") {
    return (
      config?.customTransitions?.milestone ??
      (MILESTONE_TRANSITIONS as unknown as TransitionMap)
    );
  }
  if (entityType === "slice") {
    return (
      config?.customTransitions?.slice ??
      (SLICE_TRANSITIONS as unknown as TransitionMap)
    );
  }
  return (
    config?.customTransitions?.task ??
    (TASK_TRANSITIONS as unknown as TransitionMap)
  );
}

// ─── GsdStateMachine class ─────────────────────────────────────────────────

export class GsdStateMachine {
  constructor(
    private readonly db: GsdDb,
    private readonly config?: StateMachineConfig,
  ) {}

  /**
   * Get the current status of any entity unit.
   * Returns undefined if the entity doesn't exist.
   */
  getStatus(
    entityType: EntityType,
    id: string,
  ): AnyStatus | undefined {
    if (entityType === "milestone") {
      return this.db.milestoneGet(id)?.status;
    }
    if (entityType === "slice") {
      return this.db.sliceGet(id)?.status;
    }
    return this.db.taskGet(id)?.status;
  }

  /**
   * Determine the current execution phase for a milestone.
   *
   * Phase logic:
   * - "plan": milestone is active AND has pending slices/tasks
   * - "execute": milestone is active AND has an active task
   * - "verify": milestone is active AND all tasks/slices are complete (pre-completion)
   * - "complete": milestone is completed or validated
   */
  getPhase(milestoneId: string): StateMachinePhase | undefined {
    const milestone = this.db.milestoneGet(milestoneId);
    if (!milestone) return undefined;

    // If milestone is in a terminal state, we're in complete phase
    if (milestone.status === "completed" || milestone.status === "validated") {
      return "complete";
    }
    if (milestone.status === "deferred") {
      return "plan";
    }

    const slices = this.db.sliceGetByMilestone(milestoneId);
    const allTasks = this.db.taskGetByMilestone(milestoneId);

    // No slices or tasks yet — still planning
    if (slices.length === 0 && allTasks.length === 0) {
      return "plan";
    }

    // Check for any active task — we're in execution
    const hasActiveTask = allTasks.some((t) => t.status === "active");
    if (hasActiveTask) {
      return "execute";
    }

    // Check for any pending slice — still planning
    const hasPendingSlice = slices.some(
      (s) => s.status === "pending" || s.status === "active",
    );
    if (hasPendingSlice) {
      return "plan";
    }

    // All slices complete but milestone not yet completed — verify phase
    const allSlicesComplete = slices.every(
      (s) => s.status === "complete" || s.status === "skipped",
    );
    if (allSlicesComplete) {
      return "verify";
    }

    // Default to plan
    return "plan";
  }

  /**
   * Check whether a unit can advance to its next state.
   * Returns false if the entity doesn't exist.
   */
  canAdvance(entityType: EntityType, id: string): boolean {
    const status = this.getStatus(entityType, id);
    if (!status) return false;

    const transitions = getTransitions(entityType, this.config);
    const allowed = transitions[status];
    return Array.isArray(allowed) && allowed.length > 0;
  }

  /**
   * Advance a unit to its next valid state.
   *
   * For tasks: pending → active → complete (linear).
   * For slices: pending → active → complete (requires all tasks complete).
   * For milestones: active → completed (requires all slices complete/skipped).
   *
   * Returns a TransitionResult describing what happened.
   * Throws GsdStateMachineError for invalid transitions or missing entities.
   */
  advance(entityType: EntityType, id: string): TransitionResult {
    const status = this.getStatus(entityType, id);
    if (status === undefined) {
      throw new GsdStateMachineError(
        `${entityType} "${id}" not found`,
        entityType,
        id,
        "unknown" as AnyStatus,
      );
    }

    const transitions = getTransitions(entityType, this.config);
    const allowed = transitions[status];

    // Terminal state — already complete/skipped/validated/deferred
    if (!Array.isArray(allowed) || allowed.length === 0) {
      throw new GsdStateMachineError(
        `${entityType} "${id}" is in terminal state "${status}" and cannot advance`,
        entityType,
        id,
        status,
      );
    }

    // Pick the first valid next state (linear transitions)
    const nextStatus = allowed[0];

    // ─── Pre-condition checks ───────────────────────────────────────────

    if (entityType === "slice" && nextStatus === "complete") {
      this.assertAllTasksComplete(id);
    }

    if (entityType === "milestone" && nextStatus === "completed") {
      this.assertAllSlicesComplete(id);
    }

    // ─── Persist the transition ─────────────────────────────────────────

    this.persistTransition(entityType, id, nextStatus);

    return {
      success: true,
      entityType,
      entityId: id,
      before: status,
      after: nextStatus as AnyStatus,
      message: `${entityType} "${id}": ${status} → ${nextStatus}`,
    };
  }

  /**
   * Get the next status that advance() would produce, without actually advancing.
   * Returns undefined if the entity can't advance.
   */
  getNextStatus(entityType: EntityType, id: string): AnyStatus | undefined {
    const status = this.getStatus(entityType, id);
    if (!status) return undefined;

    const transitions = getTransitions(entityType, this.config);
    const allowed = transitions[status];
    if (!Array.isArray(allowed) || allowed.length === 0) return undefined;

    return allowed[0] as AnyStatus;
  }

  // ─── Private helpers ────────────────────────────────────────────────────

  private assertAllTasksComplete(sliceId: string): void {
    const tasks = this.db.taskGetBySlice(sliceId);
    for (const task of tasks) {
      if (task.status !== "complete") {
        throw new GsdStateMachineError(
          `Cannot complete slice "${sliceId}": task "${task.id}" is "${task.status}" (expected "complete")`,
          "slice",
          sliceId,
          "active",
          "complete",
        );
      }
    }
  }

  private assertAllSlicesComplete(milestoneId: string): void {
    const slices = this.db.sliceGetByMilestone(milestoneId);
    for (const slice of slices) {
      if (slice.status !== "complete" && slice.status !== "skipped") {
        throw new GsdStateMachineError(
          `Cannot complete milestone "${milestoneId}": slice "${slice.id}" is "${slice.status}" (expected "complete" or "skipped")`,
          "milestone",
          milestoneId,
          "active",
          "completed",
        );
      }
    }
  }

  private persistTransition(
    entityType: EntityType,
    id: string,
    newStatus: string,
  ): void {
    if (entityType === "milestone") {
      this.db.milestoneUpdate(id, { status: newStatus as MilestoneStatus });
    } else if (entityType === "slice") {
      this.db.sliceUpdate(id, { status: newStatus as SliceStatus });
    } else {
      this.db.taskUpdate(id, { status: newStatus as TaskStatus });
    }
  }
}

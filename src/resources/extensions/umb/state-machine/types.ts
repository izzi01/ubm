/**
 * GSD State Machine type definitions.
 *
 * Defines phases, transition maps, result types, and error class
 * for the GSD lifecycle state machine.
 */

import type {
  MilestoneStatus,
  SliceStatus,
  TaskStatus,
} from "../db/types.js";

// ─── Entity types ──────────────────────────────────────────────────────────

export type EntityType = "milestone" | "slice" | "task";

/** Union of all status values across entity types. */
export type AnyStatus = MilestoneStatus | SliceStatus | TaskStatus;

// ─── Execution phases ──────────────────────────────────────────────────────

/**
 * The current phase of GSD auto-mode execution.
 *
 * - plan: Planning milestones, slices, and tasks
 * - execute: Running tasks (the active task is being worked on)
 * - verify: Running verification checks after execution
 * - complete: Recording completion summaries
 */
export type StateMachinePhase = "plan" | "execute" | "verify" | "complete";

// ─── Transition maps ───────────────────────────────────────────────────────

/**
 * Valid state transitions for milestones.
 *
 * active → completed: All slices must be complete.
 * completed → validated: After validation passes.
 * active → deferred: Explicit deferral.
 */
export const MILESTONE_TRANSITIONS: Record<MilestoneStatus, MilestoneStatus[]> = {
  active: ["completed", "deferred"],
  completed: ["validated"],
  validated: [],
  deferred: ["active"],
};

/**
 * Valid state transitions for slices.
 *
 * pending → active: Starting work on a slice.
 * active → complete: All tasks must be complete.
 * pending → skipped: Explicit skip.
 */
export const SLICE_TRANSITIONS: Record<SliceStatus, SliceStatus[]> = {
  pending: ["active", "skipped"],
  active: ["complete"],
  complete: [],
  skipped: [],
};

/**
 * Valid state transitions for tasks.
 *
 * pending → active: Starting work on a task.
 * active → complete: Task finished and verified.
 */
export const TASK_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  pending: ["active"],
  active: ["complete"],
  complete: [],
};

// ─── Transition result ─────────────────────────────────────────────────────

export interface TransitionResult {
  /** Whether the transition succeeded. */
  success: boolean;
  /** The entity type that was transitioned. */
  entityType: EntityType;
  /** The entity ID. */
  entityId: string;
  /** Status before the transition. */
  before: AnyStatus;
  /** Status after the transition (same as before if no-op). */
  after: AnyStatus;
  /** Human-readable description of what happened. */
  message: string;
}

// ─── State machine config ──────────────────────────────────────────────────

export interface StateMachineConfig {
  /** Custom transition rules that override or extend the defaults. */
  customTransitions?: Partial<{
    milestone: Record<string, string[]>;
    slice: Record<string, string[]>;
    task: Record<string, string[]>;
  }>;
}

// ─── Error class ───────────────────────────────────────────────────────────

export class GsdStateMachineError extends Error {
  constructor(
    message: string,
    public readonly entityType: EntityType,
    public readonly entityId: string,
    public readonly from: AnyStatus,
    public readonly to?: AnyStatus,
  ) {
    super(message);
    this.name = "GsdStateMachineError";
  }
}

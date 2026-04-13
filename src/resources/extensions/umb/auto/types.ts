/**
 * Auto-mode type definitions.
 *
 * Dispatch engine determines the next actionable unit in a milestone's
 * lifecycle and returns structured instructions for the LLM to follow.
 */

import type { StateMachinePhase } from "../state-machine/types.js";

// ─── Dispatch actions ──────────────────────────────────────────────────────

/**
 * Actions the dispatch engine can prescribe.
 *
 * Ordered by typical lifecycle progression:
 * - plan-slice: Milestone has no slices yet → plan the first slice
 * - plan-task: Slice is active but has no tasks → plan tasks for it
 * - execute-task: There's a pending or active task → do the work
 * - verify-slice: All tasks in active slice are done → verify and complete slice
 * - reassess-roadmap: A slice just completed → reassess remaining roadmap
 * - verify-milestone: All slices complete → validate and close milestone
 * - complete: Milestone is fully complete → nothing to do
 * - idle: No active milestone → waiting for input
 */
export type DispatchAction =
  | "plan-slice"
  | "plan-task"
  | "execute-task"
  | "verify-slice"
  | "reassess-roadmap"
  | "verify-milestone"
  | "complete"
  | "idle";

// ─── Dispatch result ───────────────────────────────────────────────────────

/**
 * Structured result from the dispatch engine.
 *
 * Tells the LLM exactly what unit to work on and what action to take.
 * The `blocked` flag indicates a gate is holding progress.
 */
export interface DispatchResult {
  /** The milestone being executed. */
  milestoneId: string;
  /** The target slice (null if planning slices or milestone-level). */
  sliceId: string | null;
  /** The target task (null if not at task level). */
  taskId: string | null;
  /** Current execution phase. */
  phase: StateMachinePhase;
  /** What the LLM should do next. */
  action: DispatchAction;
  /** Human-readable instruction. */
  message: string;
  /** Whether a gate is blocking progress. */
  blocked: boolean;
  /** Reason for gate block (present when blocked). */
  blockedReason?: string;
}

// ─── Auto-mode lifecycle ───────────────────────────────────────────────────

/**
 * Auto-mode status.
 *
 * - idle: Not running, waiting for /gsd auto command
 * - running: Actively dispatching and executing
 * - paused: Temporarily suspended (keeps focus state)
 * - stopped: Terminated by user (/gsd stop)
 */
export type AutoModeStatus = "idle" | "running" | "paused" | "stopped";

/**
 * Auto-mode state snapshot.
 */
export interface AutoModeState {
  /** Current status. */
  status: AutoModeStatus;
  /** The milestone being auto-executed. */
  milestoneId: string | null;
  /** Currently focused slice. */
  currentSliceId: string | null;
  /** Currently focused task. */
  currentTaskId: string | null;
  /** Number of dispatch iterations completed. */
  iteration: number;
  /** When auto-mode was started. */
  startedAt: string | null;
  /** Last dispatch result. */
  lastDispatch: DispatchResult | null;
}

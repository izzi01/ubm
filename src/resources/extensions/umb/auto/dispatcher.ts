/**
 * GSD Dispatch Engine.
 *
 * Reads current milestone/slice/task state from the DB and determines
 * the next actionable unit and required action. Pure function of GsdEngine.
 *
 * Usage:
 *   import { dispatch } from "./dispatcher.js";
 *   const result = dispatch(engine, "M001");
 *   // result.action === "execute-task", result.taskId === "T03"
 */

import type { GsdEngine } from "../state-machine/index.js";
import type { SliceRow } from "../db/types.js";
import type { DispatchAction, DispatchResult } from "./types.js";

// ─── Dispatch engine ───────────────────────────────────────────────────────

/**
 * Determine the next action for a milestone.
 *
 * Walks the milestone → slice → task hierarchy top-down and returns
 * a DispatchResult indicating what the LLM should do next.
 *
 * Dispatch logic (first match wins):
 * 1. No slices at all → plan-slice
 * 2. No active slice → activate first pending slice, then plan-task
 * 3. Active slice has pending task → execute-task (first pending)
 * 4. Active slice has active task → execute-task (continue)
 * 5. Active slice, all tasks complete → verify-slice
 * 6. All slices done, milestone not complete → verify-milestone
 * 7. Milestone complete → complete
 *
 * @param engine - Wired GSD engine instance
 * @param milestoneId - The milestone to dispatch for
 * @returns Structured dispatch result
 */
export function dispatch(
  engine: GsdEngine,
  milestoneId: string,
): DispatchResult {
  const milestone = engine.db.milestoneGet(milestoneId);
  if (!milestone) {
    return noMilestoneResult(milestoneId);
  }

  // Terminal states — milestone is done
  if (
    milestone.status === "completed" ||
    milestone.status === "validated"
  ) {
    return completeResult(milestoneId);
  }

  // Deferred milestone — nothing to do
  if (milestone.status === "deferred") {
    return idleResult(milestoneId, "Milestone is deferred");
  }

  const slices = engine.db.sliceGetByMilestone(milestoneId);
  const phase = engine.stateMachine.getPhase(milestoneId);

  // 1. No slices — need to plan them
  if (slices.length === 0) {
    return {
      milestoneId,
      sliceId: null,
      taskId: null,
      phase: phase ?? ("plan" as const),
      action: "plan-slice",
      message: `Milestone "${milestoneId}" has no slices. Plan slices using gsd_slice_plan.`,
      blocked: false,
    };
  }

  // Check for gate-blocked entities at any level
  const gateBlock = checkGateBlock(engine, slices);
  if (gateBlock) {
    return gateBlock;
  }

  // 2. Find active slice
  const activeSlice = slices.find((s) => s.status === "active");

  if (activeSlice) {
    return dispatchActiveSlice(engine, milestoneId, activeSlice, phase);
  }

  // 3. No active slice — check for pending slices to activate
  const pendingSlice = slices.find((s) => s.status === "pending");

  if (pendingSlice) {
    // We need to activate this slice and plan its tasks
    return {
      milestoneId,
      sliceId: pendingSlice.id,
      taskId: null,
      phase: phase ?? ("plan" as const),
      action: "plan-task",
      message: `Slice "${pendingSlice.id}" (${pendingSlice.title}) is pending. Activate it and plan tasks.`,
      blocked: false,
    };
  }

  // 4. No active or pending slices — all must be complete/skipped
  const allDone = slices.every(
    (s) => s.status === "complete" || s.status === "skipped",
  );

  if (allDone) {
    return {
      milestoneId,
      sliceId: null,
      taskId: null,
      phase: phase ?? ("verify" as const),
      action: "verify-milestone",
      message: `All slices complete for milestone "${milestoneId}". Validate and complete the milestone.`,
      blocked: false,
    };
  }

  // Unexpected state — shouldn't happen but handle gracefully
  return {
    milestoneId,
    sliceId: null,
    taskId: null,
    phase: phase ?? ("plan" as const),
    action: "idle",
    message: `Milestone "${milestoneId}" is in an unexpected state. Manual review needed.`,
    blocked: false,
  };
}

// ─── Private helpers ───────────────────────────────────────────────────────

/**
 * Dispatch for an active slice — find the next task-level action.
 */
function dispatchActiveSlice(
  engine: GsdEngine,
  milestoneId: string,
  slice: SliceRow,
  phase: import("../state-machine/types.js").StateMachinePhase | undefined,
): DispatchResult {
  const tasks = engine.db.taskGetBySlice(slice.id);

  // No tasks yet — need to plan them
  if (tasks.length === 0) {
    return {
      milestoneId,
      sliceId: slice.id,
      taskId: null,
      phase: phase ?? ("plan" as const),
      action: "plan-task",
      message: `Slice "${slice.id}" (${slice.title}) has no tasks. Plan tasks using gsd_task_plan.`,
      blocked: false,
    };
  }

  // Find active task
  const activeTask = tasks.find((t) => t.status === "active");
  if (activeTask) {
    return {
      milestoneId,
      sliceId: slice.id,
      taskId: activeTask.id,
      phase: phase ?? ("execute" as const),
      action: "execute-task",
      message: `Execute task "${activeTask.id}" (${activeTask.title}) in slice "${slice.id}".`,
      blocked: false,
    };
  }

  // Find pending task (first one — order matters)
  const pendingTask = tasks.find((t) => t.status === "pending");
  if (pendingTask) {
    return {
      milestoneId,
      sliceId: slice.id,
      taskId: pendingTask.id,
      phase: phase ?? ("execute" as const),
      action: "execute-task",
      message: `Execute task "${pendingTask.id}" (${pendingTask.title}) in slice "${slice.id}".`,
      blocked: false,
    };
  }

  // All tasks complete — verify slice
  const allTasksComplete = tasks.every((t) => t.status === "complete");
  if (allTasksComplete) {
    return {
      milestoneId,
      sliceId: slice.id,
      taskId: null,
      phase: phase ?? ("verify" as const),
      action: "verify-slice",
      message: `All tasks complete in slice "${slice.id}" (${slice.title}). Verify and complete the slice.`,
      blocked: false,
    };
  }

  // Shouldn't reach here — tasks are in some unexpected state
  return {
    milestoneId,
    sliceId: slice.id,
    taskId: null,
    phase: phase ?? ("plan" as const),
    action: "idle",
    message: `Slice "${slice.id}" is in an unexpected task state. Manual review needed.`,
    blocked: false,
  };
}

/**
 * Check for any gate-blocked entities in the milestone.
 */
function checkGateBlock(
  engine: GsdEngine,
  slices: SliceRow[],
): DispatchResult | null {
  for (const slice of slices) {
    // Check if slice is gate-blocked
    if (engine.gates.isAwaitingApproval("slice", slice.id)) {
      return {
        milestoneId: slice.milestoneId,
        sliceId: slice.id,
        taskId: null,
        phase: "execute",
        action: "idle",
        message: `Slice "${slice.id}" is blocked by an approval gate. Use gsd_approve to unblock.`,
        blocked: true,
        blockedReason: `Gate blocking slice "${slice.id}"`,
      };
    }

    // Check tasks in this slice
    const tasks = engine.db.taskGetBySlice(slice.id);
    for (const task of tasks) {
      if (engine.gates.isAwaitingApproval("task", task.id)) {
        return {
          milestoneId: slice.milestoneId,
          sliceId: slice.id,
          taskId: task.id,
          phase: "execute",
          action: "idle",
          message: `Task "${task.id}" in slice "${slice.id}" is blocked by an approval gate. Use gsd_approve to unblock.`,
          blocked: true,
          blockedReason: `Gate blocking task "${task.id}"`,
        };
      }
    }
  }

  return null;
}

function noMilestoneResult(milestoneId: string): DispatchResult {
  return {
    milestoneId,
    sliceId: null,
    taskId: null,
    phase: "plan",
    action: "idle",
    message: `Milestone "${milestoneId}" not found.`,
    blocked: false,
  };
}

function completeResult(milestoneId: string): DispatchResult {
  return {
    milestoneId,
    sliceId: null,
    taskId: null,
    phase: "complete",
    action: "complete",
    message: `Milestone "${milestoneId}" is complete.`,
    blocked: false,
  };
}

function idleResult(
  milestoneId: string,
  reason: string,
): DispatchResult {
  return {
    milestoneId,
    sliceId: null,
    taskId: null,
    phase: "plan",
    action: "idle",
    message: reason,
    blocked: false,
  };
}

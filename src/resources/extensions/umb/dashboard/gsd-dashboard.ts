/**
 * GSD Dashboard Widget — renders milestone/slice/task progress as formatted text.
 *
 * Pure function: takes a GsdEngine, returns string[] suitable for setWidget().
 * Trivially testable with in-memory DB.
 */

import type { GsdEngine } from "../state-machine/index.js";
import type { MilestoneRow, SliceRow, TaskRow, SliceStatus } from "../db/types.js";

// ─── Status icons ──────────────────────────────────────────────────────────

const SLICE_STATUS_ICONS: Record<SliceStatus, string> = {
  complete: "✅",
  active: "🔄",
  pending: "⬜",
  skipped: "⏭️",
};

const PHASE_LABELS: Record<string, string> = {
  plan: "📋 Plan",
  execute: "⚡ Execute",
  verify: "🔍 Verify",
  complete: "✅ Complete",
};

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Render the GSD dashboard as an array of text lines.
 *
 * Shows all milestones with their slices, task counts, and phases.
 * Empty state returns a helpful placeholder message.
 *
 * @param engine - Wired GSD engine instance (DB + state machine + gates)
 * @returns Array of formatted text lines for the TUI widget
 */
export function renderGsdDashboard(engine: GsdEngine): string[] {
  const milestones = engine.db.milestoneGetAll();

  if (milestones.length === 0) {
    return [
      "📋 GSD Dashboard",
      "",
      "No milestones found. Use gsd_milestone_plan to create one.",
    ];
  }

  const lines: string[] = ["📋 GSD Dashboard", ""];

  for (const milestone of milestones) {
    const phase = engine.stateMachine.getPhase(milestone.id);
    const phaseLabel = phase ? (PHASE_LABELS[phase] ?? phase) : "—";

    lines.push(`${milestone.id} — ${milestone.title} [${milestone.status}]`);
    lines.push(`  Phase: ${phaseLabel}`);

    const slices = engine.db.sliceGetByMilestone(milestone.id);

    if (slices.length === 0) {
      lines.push("  No slices yet.");
    } else {
      const completedCount = slices.filter(
        (s) => s.status === "complete" || s.status === "skipped",
      ).length;

      lines.push(`  Slices: ${completedCount}/${slices.length} complete`);

      for (const slice of slices) {
        const icon = SLICE_STATUS_ICONS[slice.status] ?? "⬜";

        // Check if slice is gate-blocked
        const isBlocked = engine.gates.isAwaitingApproval("slice", slice.id);
        const blockedIcon = isBlocked ? " 🔒" : "";

        // Get task progress
        const tasks = engine.db.taskGetBySlice(slice.id);
        const completedTasks = tasks.filter((t) => t.status === "complete").length;
        const taskInfo =
          tasks.length > 0 ? ` | Tasks: ${completedTasks}/${tasks.length}` : "";

        lines.push(`  ${icon} ${slice.id} — ${slice.title}${taskInfo}${blockedIcon}`);
      }
    }

    lines.push("");
  }

  return lines;
}

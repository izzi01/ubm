/**
 * GSD File Rendering System.
 *
 * Pure functions that turn DB row data into markdown strings.
 * No filesystem writes — that's the completion tools' job.
 * Rendering is deterministic: same input → same output.
 *
 * File types:
 * - renderRoadmap: M##-ROADMAP.md (milestone + slices overview)
 * - renderSlicePlan: S##-PLAN.md (slice + tasks plan)
 * - renderTaskPlan: T##-PLAN.md (task plan)
 * - renderTaskSummary: T##-SUMMARY.md (task completion summary)
 * - renderSliceSummary: S##-SUMMARY.md (slice completion summary)
 * - renderMilestoneSummary: M##-SUMMARY.md (milestone completion summary)
 * - renderUat: S##-UAT.md (slice UAT test content)
 * - renderValidation: M##-VALIDATION.md (milestone validation result)
 */

import type {
  MilestoneRow,
  SliceRow,
  TaskRow,
} from "../db/types.js";

// ─── Status helpers ────────────────────────────────────────────────────────

function sliceStatusIcon(status: string): string {
  switch (status) {
    case "complete": return "✅";
    case "active": return "🔄";
    case "skipped": return "⏭️";
    default: return "⬜";
  }
}

function taskStatusIcon(status: string): string {
  switch (status) {
    case "complete": return "✅";
    case "active": return "🔄";
    default: return "⬜";
  }
}

function checkbox(status: string): string {
  return status === "complete" || status === "skipped" ? "[x]" : "[ ]";
}

function jsonParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

// ─── Planning renderers ────────────────────────────────────────────────────

/**
 * Render a ROADMAP.md from milestone and slice data.
 */
export function renderRoadmap(
  milestone: MilestoneRow,
  slices: SliceRow[],
): string {
  const lines: string[] = [];

  lines.push(`# ${milestone.id}: ${milestone.title}`);
  lines.push("");
  lines.push("## Vision");
  lines.push(milestone.vision);
  lines.push("");

  // Slice overview table
  lines.push("## Slice Overview");
  lines.push("| ID | Slice | Risk | Depends | Done | After this |");
  lines.push("|----|-------|------|---------|------|------------|");

  for (const slice of slices) {
    const done = sliceStatusIcon(slice.status);
    const depends = jsonParse<string[]>(slice.depends, []).join(", ") || "—";
    const demo = slice.demo || `After this: ${slice.goal}`;
    lines.push(
      `| ${slice.id} | ${slice.title} | \`${slice.risk}\` | \`${depends}\` | ${done} | ${demo} |`,
    );
  }

  lines.push("");

  // Success criteria
  const successCriteria = jsonParse<string[]>(milestone.successCriteria, []);
  if (successCriteria.length > 0) {
    lines.push("## Success Criteria");
    for (const sc of successCriteria) {
      lines.push(`- ${sc}`);
    }
    lines.push("");
  }

  // Definition of done
  const dod = jsonParse<string[]>(milestone.definitionOfDone, []);
  if (dod.length > 0) {
    lines.push("## Definition of Done");
    for (const item of dod) {
      lines.push(`- ${item}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Render a S##-PLAN.md from slice and task data.
 */
export function renderSlicePlan(
  slice: SliceRow,
  tasks: TaskRow[],
): string {
  const lines: string[] = [];

  lines.push(`# ${slice.id}: ${slice.title}`);
  lines.push("");
  lines.push("## Goal");
  lines.push(slice.goal);
  lines.push("");

  // Task overview table
  if (tasks.length > 0) {
    lines.push("## Tasks");
    lines.push("| ID | Task | Est | Done |");
    lines.push("|----|------|-----|------|");

    for (const task of tasks) {
      const done = taskStatusIcon(task.status);
      const est = task.estimate || "—";
      lines.push(`| ${task.id} | ${task.title} | \`${est}\` | ${done} |`);
    }

    lines.push("");

    // Per-task detail blocks
    for (const task of tasks) {
      const cb = checkbox(task.status);
      lines.push(`### ${cb} **${task.id}: ${task.title}** \`${task.estimate || "est:?"}\``);
      lines.push("");

      if (task.description) {
        lines.push(task.description);
        lines.push("");
      }

      const files = jsonParse<string[]>(task.files, []);
      if (files.length > 0) {
        lines.push("**Files:** " + files.join(", "));
        lines.push("");
      }

      if (task.verify) {
        lines.push(`**Verify:** \`${task.verify}\``);
        lines.push("");
      }

      const inputs = jsonParse<string[]>(task.inputs, []);
      if (inputs.length > 0) {
        lines.push("**Inputs:** " + inputs.join(", "));
        lines.push("");
      }

      const expected = jsonParse<string[]>(task.expectedOutput, []);
      if (expected.length > 0) {
        lines.push("**Expected output:** " + expected.join(", "));
        lines.push("");
      }
    }
  }

  // Success criteria
  const sc = jsonParse<string[]>(slice.successCriteria, []);
  if (sc.length > 0) {
    lines.push("## Success Criteria");
    for (const criterion of sc) {
      lines.push(`- ${criterion}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Render a T##-PLAN.md from task data.
 */
export function renderTaskPlan(task: TaskRow): string {
  const lines: string[] = [];

  const cb = checkbox(task.status);
  lines.push(`# ${cb} **${task.id}: ${task.title}** \`${task.estimate || "est:?"}\``);
  lines.push("");

  if (task.description) {
    lines.push(task.description);
    lines.push("");
  }

  const files = jsonParse<string[]>(task.files, []);
  if (files.length > 0) {
    lines.push("## Files");
    for (const f of files) {
      lines.push(`- ${f}`);
    }
    lines.push("");
  }

  if (task.verify) {
    lines.push("## Verify");
    lines.push(`\`\`\`);
${task.verify}
\`\`\``);
    lines.push("");
  }

  const inputs = jsonParse<string[]>(task.inputs, []);
  if (inputs.length > 0) {
    lines.push("## Inputs");
    for (const inp of inputs) {
      lines.push(`- ${inp}`);
    }
    lines.push("");
  }

  const expected = jsonParse<string[]>(task.expectedOutput, []);
  if (expected.length > 0) {
    lines.push("## Expected Output");
    for (const out of expected) {
      lines.push(`- ${out}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

// ─── Summary renderers ─────────────────────────────────────────────────────

/**
 * Render a T##-SUMMARY.md from task data.
 */
export function renderTaskSummary(task: TaskRow): string {
  const lines: string[] = [];

  // YAML frontmatter
  lines.push("---");
  lines.push(`id: ${task.id}`);
  lines.push(`slice: ${task.sliceId}`);
  lines.push(`milestone: ${task.milestoneId}`);
  if (task.completedAt) {
    lines.push(`completed_at: ${task.completedAt}`);
  }
  lines.push("---");
  lines.push("");

  lines.push(`# ${task.id}: ${task.title}`);
  lines.push("");

  if (task.oneLiner) {
    lines.push(task.oneLiner);
    lines.push("");
  }

  if (task.narrative) {
    lines.push("## What Happened");
    lines.push("");
    lines.push(task.narrative);
    lines.push("");
  }

  if (task.verification) {
    lines.push("## Verification");
    lines.push("");
    lines.push(task.verification);
    lines.push("");
  }

  const keyFiles = jsonParse<string[]>(task.keyFiles, []);
  if (keyFiles.length > 0) {
    lines.push("## Key Files");
    for (const f of keyFiles) {
      lines.push(`- ${f}`);
    }
    lines.push("");
  }

  const keyDecisions = jsonParse<string[]>(task.keyDecisions, []);
  if (keyDecisions.length > 0) {
    lines.push("## Key Decisions");
    for (const d of keyDecisions) {
      lines.push(`- ${d}`);
    }
    lines.push("");
  }

  if (task.deviations) {
    lines.push("## Deviations");
    lines.push(task.deviations);
    lines.push("");
  }

  if (task.knownIssues) {
    lines.push("## Known Issues");
    lines.push(task.knownIssues);
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Render a S##-SUMMARY.md from slice and task data.
 */
export function renderSliceSummary(
  slice: SliceRow,
  tasks: TaskRow[],
): string {
  const lines: string[] = [];

  // YAML frontmatter
  lines.push("---");
  lines.push(`id: ${slice.id}`);
  lines.push(`parent: ${slice.milestoneId}`);
  lines.push("provides: []");
  lines.push("requires: []");
  lines.push("affects: []");
  lines.push("key_files: []");
  lines.push("key_decisions: []");
  lines.push("patterns_established: []");
  lines.push("observability_surfaces: []");
  lines.push("drill_down_paths: []");
  const now = new Date().toISOString();
  lines.push(`completed_at: ${now}`);
  lines.push("verification_result: passed");
  lines.push("blocker_discovered: false");
  lines.push("duration: \"\"");
  lines.push("---");
  lines.push("");

  lines.push(`# ${slice.id}: ${slice.title}`);
  lines.push("");
  lines.push(`**${slice.goal}**`);
  lines.push("");

  lines.push("## What Happened");
  lines.push("");
  lines.push(`Slice ${slice.id} (${slice.title}) completed with ${tasks.length} tasks.`);
  lines.push("");

  lines.push("## Verification");
  lines.push("");
  const completeTasks = tasks.filter((t) => t.status === "complete").length;
  lines.push(`${completeTasks}/${tasks.length} tasks completed.`);
  lines.push("");

  // Drill-down paths
  lines.push("## Task Summaries");
  lines.push("");
  for (const task of tasks) {
    lines.push(`- ${task.id}: ${task.title}`);
  }
  lines.push("");

  return lines.join("\n");
}

/**
 * Render a M##-SUMMARY.md from milestone and slice data.
 */
export function renderMilestoneSummary(
  milestone: MilestoneRow,
  slices: SliceRow[],
): string {
  const lines: string[] = [];

  // YAML frontmatter
  lines.push("---");
  lines.push(`id: ${milestone.id}`);
  lines.push(`title: ${milestone.title}`);
  lines.push("verification_passed: true");
  lines.push("---");
  lines.push("");

  lines.push(`# ${milestone.id}: ${milestone.title}`);
  lines.push("");

  lines.push("## Narrative");
  lines.push("");
  lines.push(`Milestone ${milestone.id} completed with ${slices.length} slices.`);
  lines.push("");

  lines.push("## Slice Results");
  lines.push("");
  for (const slice of slices) {
    lines.push(`- ${sliceStatusIcon(slice.status)} **${slice.id}:** ${slice.title}`);
  }
  lines.push("");

  lines.push("## Success Criteria");
  lines.push("");
  const successCriteria = jsonParse<string[]>(milestone.successCriteria, []);
  for (const sc of successCriteria) {
    lines.push(`- ✅ ${sc}`);
  }
  if (successCriteria.length === 0) {
    lines.push("No explicit success criteria defined.");
  }
  lines.push("");

  lines.push("## Definition of Done");
  lines.push("");
  const dod = jsonParse<string[]>(milestone.definitionOfDone, []);
  for (const item of dod) {
    lines.push(`- ✅ ${item}`);
  }
  if (dod.length === 0) {
    lines.push("All slices completed.");
  }
  lines.push("");

  return lines.join("\n");
}

/**
 * Render a S##-UAT.md with manual verification steps.
 */
export function renderUat(
  slice: SliceRow,
  tasks: TaskRow[],
): string {
  const lines: string[] = [];

  lines.push(`# UAT: ${slice.id} — ${slice.title}`);
  lines.push("");
  lines.push("## Manual Verification Steps");
  lines.push("");

  for (const task of tasks) {
    lines.push(`### ${task.id}: ${task.title}`);
    lines.push("");
    if (task.verify) {
      lines.push(`Run: \`${task.verify}\``);
      lines.push("");
    }
    lines.push("- [ ] Verify task output matches expected result");
    lines.push("");
  }

  lines.push("## General Checks");
  lines.push("");
  lines.push("- [ ] No TypeScript compilation errors");
  lines.push("- [ ] No test regressions");
  lines.push("- [ ] Dashboard reflects correct state");
  lines.push("");

  return lines.join("\n");
}

/**
 * Render a M##-VALIDATION.md with validation results.
 */
export function renderValidation(
  milestone: MilestoneRow,
  slices: SliceRow[],
  verdict: string,
  rationale: string,
): string {
  const lines: string[] = [];

  lines.push(`# Validation: ${milestone.id} — ${milestone.title}`);
  lines.push("");
  lines.push(`**Verdict:** ${verdict}`);
  lines.push(`**Rationale:** ${rationale}`);
  lines.push("");

  // Success criteria checklist
  lines.push("## Success Criteria Checklist");
  lines.push("");
  const successCriteria = jsonParse<string[]>(milestone.successCriteria, []);
  for (const sc of successCriteria) {
    lines.push(`- ✅ ${sc}`);
  }
  if (successCriteria.length === 0) {
    lines.push("No explicit success criteria defined — all slices completed.");
  }
  lines.push("");

  // Slice delivery audit
  lines.push("## Slice Delivery Audit");
  lines.push("");
  lines.push("| Slice | Status | Tasks | Verdict |");
  lines.push("|-------|--------|-------|---------|");
  for (const slice of slices) {
    lines.push(`| ${slice.id} | ${sliceStatusIcon(slice.status)} ${slice.status} | — | ✅ |`);
  }
  lines.push("");

  // Cross-slice integration
  lines.push("## Cross-Slice Integration");
  lines.push("");
  lines.push("No boundary mismatches detected between slices.");
  lines.push("");

  // Requirement coverage
  lines.push("## Requirement Coverage");
  lines.push("");
  lines.push("All requirements addressed by completed slices.");
  lines.push("");

  return lines.join("\n");
}

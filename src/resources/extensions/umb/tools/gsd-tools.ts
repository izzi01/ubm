/**
 * GSD LLM-callable tools.
 *
 * Registers all GSD CRUD and state machine tools with the pi extension
 * system via registerTool(). Each tool wraps a GsdEngine method with
 * a TypeBox parameter schema and returns structured JSON.
 *
 * Tools are also exportable as standalone handlers for testing without
 * the full ExtensionAPI registration flow.
 */

import { Type } from "@sinclair/typebox";
import type { Static, TSchema } from "@sinclair/typebox";
import type { ExtensionAPI, ExtensionContext } from "@gsd/pi-coding-agent";
import type { AgentToolResult, AgentToolUpdateCallback } from "@gsd/pi-coding-agent";
import type { GsdEngine } from "../state-machine/index.js";
import type { EntityType } from "../state-machine/types.js";
import { dispatch } from "../auto/dispatcher.js";
import {
  renderTaskSummary,
  renderSliceSummary,
  renderMilestoneSummary,
  renderUat,
  renderValidation,
} from "../auto/renderer.js";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

// ─── Error helper ──────────────────────────────────────────────────────────

function errorResult(message: string): AgentToolResult<undefined> {
  return {
    content: [{ type: "text", text: message }],
    details: undefined,
  };
}

function jsonResult(data: unknown): AgentToolResult<unknown> {
  return {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    details: data,
  };
}

// ─── Tool handler type ─────────────────────────────────────────────────────

export type ToolHandler = (
  toolCallId: string,
  params: Record<string, unknown>,
  signal: AbortSignal | undefined,
  onUpdate: AgentToolUpdateCallback<unknown> | undefined,
  ctx: ExtensionContext,
) => Promise<AgentToolResult<unknown>>;

export interface ToolDefinitionEntry {
  name: string;
  label: string;
  description: string;
  parameters: TSchema;
  execute: ToolHandler;
}

// ─── Parameter schemas ─────────────────────────────────────────────────────

const EntityTypeValues = Type.Union([
  Type.Literal("milestone"),
  Type.Literal("slice"),
  Type.Literal("task"),
]);

const MilestonePlanParams = Type.Object({
  id: Type.String({ description: "Milestone ID (e.g. M001)" }),
  title: Type.String({ description: "Milestone title" }),
  vision: Type.String({ description: "Milestone vision statement" }),
  status: Type.Optional(
    Type.Union([
      Type.Literal("active"),
      Type.Literal("completed"),
      Type.Literal("validated"),
      Type.Literal("deferred"),
    ], { description: "Initial status (default: active)" }),
  ),
  dependsOn: Type.Optional(Type.String({ description: "Comma-separated dependency milestone IDs" })),
  successCriteria: Type.Optional(Type.Array(Type.String(), { description: "Success criteria bullets" })),
  definitionOfDone: Type.Optional(Type.Array(Type.String(), { description: "Definition of done bullets" })),
});

const SlicePlanParams = Type.Object({
  id: Type.String({ description: "Slice ID (e.g. S01)" }),
  milestoneId: Type.String({ description: "Parent milestone ID" }),
  title: Type.String({ description: "Slice title" }),
  goal: Type.String({ description: "Slice goal" }),
  risk: Type.Optional(
    Type.Union([
      Type.Literal("low"),
      Type.Literal("medium"),
      Type.Literal("high"),
    ], { description: "Risk level (default: medium)" }),
  ),
  depends: Type.Optional(Type.Array(Type.String(), { description: "Dependency slice IDs" })),
  demo: Type.Optional(Type.String({ description: "Demo text / After this description" })),
  status: Type.Optional(
    Type.Union([
      Type.Literal("pending"),
      Type.Literal("active"),
      Type.Literal("complete"),
      Type.Literal("skipped"),
    ], { description: "Initial status (default: pending)" }),
  ),
});

const TaskPlanParams = Type.Object({
  id: Type.String({ description: "Task ID (e.g. T01)" }),
  sliceId: Type.String({ description: "Parent slice ID" }),
  milestoneId: Type.String({ description: "Parent milestone ID" }),
  title: Type.String({ description: "Task title" }),
  description: Type.Optional(Type.String({ description: "Task description / steps" })),
  estimate: Type.Optional(Type.String({ description: "Time estimate" })),
  files: Type.Optional(Type.Array(Type.String(), { description: "Files likely touched" })),
  verify: Type.Optional(Type.String({ description: "Verification command or block" })),
  inputs: Type.Optional(Type.Array(Type.String(), { description: "Input files or references" })),
  expectedOutput: Type.Optional(Type.Array(Type.String(), { description: "Expected output files or artifacts" })),
});

const AdvanceParams = Type.Object({
  entityType: EntityTypeValues,
  id: Type.String({ description: "Entity ID to advance" }),
});

const ApproveParams = Type.Object({
  entityType: EntityTypeValues,
  id: Type.String({ description: "Entity ID to approve" }),
});

const StatusParams = Type.Object({
  entityType: EntityTypeValues,
  id: Type.String({ description: "Entity ID" }),
});

const PhaseParams = Type.Object({
  milestoneId: Type.String({ description: "Milestone ID" }),
});

const ListSlicesParams = Type.Object({
  milestoneId: Type.String({ description: "Parent milestone ID" }),
});

const ListTasksParams = Type.Object({
  sliceId: Type.Optional(Type.String({ description: "Filter by slice ID" })),
  milestoneId: Type.Optional(Type.String({ description: "Filter by milestone ID" })),
});

const NoParams = Type.Object({});

// ─── Completion tool parameter schemas ─────────────────────────────────────

const TaskCompleteParams = Type.Object({
  taskId: Type.String({ description: "Task ID to complete (e.g. T01)" }),
  sliceId: Type.String({ description: "Parent slice ID" }),
  milestoneId: Type.String({ description: "Parent milestone ID" }),
  oneLiner: Type.String({ description: "One-line summary of what was accomplished" }),
  narrative: Type.String({ description: "Detailed narrative of what happened" }),
  verification: Type.String({ description: "What was verified and how" }),
  keyFiles: Type.Optional(Type.Array(Type.String(), { description: "Key files created/modified" })),
  keyDecisions: Type.Optional(Type.Array(Type.String(), { description: "Key decisions made" })),
  deviations: Type.Optional(Type.String({ description: "Deviations from plan" })),
  knownIssues: Type.Optional(Type.String({ description: "Known issues discovered" })),
});

const SliceCompleteParams = Type.Object({
  sliceId: Type.String({ description: "Slice ID to complete" }),
  milestoneId: Type.String({ description: "Parent milestone ID" }),
  sliceTitle: Type.String({ description: "Slice title" }),
  oneLiner: Type.String({ description: "One-line summary" }),
  narrative: Type.String({ description: "Detailed narrative" }),
  verification: Type.String({ description: "What was verified" }),
  uatContent: Type.String({ description: "UAT test content (markdown body)" }),
  keyFiles: Type.Optional(Type.Array(Type.String())),
  keyDecisions: Type.Optional(Type.Array(Type.String())),
});

const MilestoneValidateParams = Type.Object({
  milestoneId: Type.String({ description: "Milestone ID to validate" }),
  verdict: Type.Union([
    Type.Literal("pass"),
    Type.Literal("needs-attention"),
    Type.Literal("needs-remediation"),
  ], { description: "Validation verdict" }),
  remediationRound: Type.Number({ description: "Remediation round (0 for first)" }),
  successCriteriaChecklist: Type.String({ description: "Markdown checklist of criteria with pass/fail" }),
  sliceDeliveryAudit: Type.String({ description: "Markdown table auditing slice delivery" }),
  crossSliceIntegration: Type.String({ description: "Markdown describing cross-slice integration" }),
  requirementCoverage: Type.String({ description: "Markdown describing requirement coverage" }),
  verdictRationale: Type.String({ description: "Why this verdict was chosen" }),
  remediationPlan: Type.Optional(Type.String({ description: "Remediation plan if needs-remediation" })),
});

const MilestoneCompleteParams = Type.Object({
  milestoneId: Type.String({ description: "Milestone ID to complete" }),
  title: Type.String({ description: "Milestone title" }),
  oneLiner: Type.String({ description: "One-line summary" }),
  narrative: Type.String({ description: "Detailed narrative" }),
  verificationPassed: Type.Boolean({ description: "Whether verification passed" }),
  successCriteriaResults: Type.Optional(Type.String({ description: "Markdown success criteria results" })),
  definitionOfDoneResults: Type.Optional(Type.String({ description: "Markdown definition of done results" })),
  keyDecisions: Type.Optional(Type.Array(Type.String())),
  keyFiles: Type.Optional(Type.Array(Type.String())),
});

const DispatchParams = Type.Object({
  milestoneId: Type.String({ description: "Milestone ID to dispatch for" }),
});

// ─── File write helper ─────────────────────────────────────────────────────

function writeArtifact(filePath: string, content: string): void {
  mkdirSync(join(filePath, ".."), { recursive: true });
  writeFileSync(filePath, content, "utf-8");
}

// ─── Tool handler factory ──────────────────────────────────────────────────

/**
 * Create all GSD tool handlers bound to an engine instance.
 * Returns an array of tool definitions suitable for registration or testing.
 */
export function createGsdToolHandlers(
  engine: GsdEngine,
): ToolDefinitionEntry[] {
  return [
    // ─── gsd_milestone_plan ──────────────────────────────────────────────
    {
      name: "gsd_milestone_plan",
      label: "GSD Milestone Plan",
      description:
        "Create a milestone with title, vision, and optional success criteria. Returns the created milestone row.",
      parameters: MilestonePlanParams,
      execute: async (_tcid, params) => {
        try {
          const p = params as Static<typeof MilestonePlanParams>;
          const row = engine.db.milestoneInsert({
            id: p.id,
            title: p.title,
            vision: p.vision,
            status: p.status ?? "active",
            dependsOn: p.dependsOn ?? null,
            successCriteria: p.successCriteria
              ? JSON.stringify(p.successCriteria)
              : null,
            definitionOfDone: p.definitionOfDone
              ? JSON.stringify(p.definitionOfDone)
              : null,
            keyRisks: null,
            proofStrategy: null,
            verificationContract: null,
            verificationIntegration: null,
            verificationOperational: null,
            verificationUat: null,
            requirementCoverage: null,
            boundaryMapMarkdown: null,
          });
          return jsonResult(row);
        } catch (err) {
          return errorResult(
            `Failed to create milestone: ${(err as Error).message}`,
          );
        }
      },
    },

    // ─── gsd_slice_plan ──────────────────────────────────────────────────
    {
      name: "gsd_slice_plan",
      label: "GSD Slice Plan",
      description:
        "Create a slice under a milestone with title, goal, and optional risk/depends/demo. Returns the created slice row.",
      parameters: SlicePlanParams,
      execute: async (_tcid, params) => {
        try {
          const p = params as Static<typeof SlicePlanParams>;
          const row = engine.db.sliceInsert({
            id: p.id,
            milestoneId: p.milestoneId,
            title: p.title,
            goal: p.goal,
            risk: p.risk ?? "medium",
            depends: p.depends ? JSON.stringify(p.depends) : null,
            demo: p.demo ?? null,
            successCriteria: null,
            proofLevel: "demo",
            integrationClosure: null,
            observabilityImpact: null,
            status: p.status ?? "pending",
          });
          return jsonResult(row);
        } catch (err) {
          return errorResult(
            `Failed to create slice: ${(err as Error).message}`,
          );
        }
      },
    },

    // ─── gsd_task_plan ───────────────────────────────────────────────────
    {
      name: "gsd_task_plan",
      label: "GSD Task Plan",
      description:
        "Create a task under a slice with title, description, and optional estimate/files/verify. Returns the created task row.",
      parameters: TaskPlanParams,
      execute: async (_tcid, params) => {
        try {
          const p = params as Static<typeof TaskPlanParams>;
          const row = engine.db.taskInsert({
            id: p.id,
            sliceId: p.sliceId,
            milestoneId: p.milestoneId,
            title: p.title,
            description: p.description ?? null,
            estimate: p.estimate ?? null,
            files: p.files ? JSON.stringify(p.files) : null,
            verify: p.verify ?? null,
            inputs: p.inputs ? JSON.stringify(p.inputs) : null,
            expectedOutput: p.expectedOutput
              ? JSON.stringify(p.expectedOutput)
              : null,
            observabilityImpact: null,
            status: "pending",
            oneLiner: null,
            narrative: null,
            verification: null,
            verificationEvidence: null,
            deviations: null,
            knownIssues: null,
            keyFiles: null,
            keyDecisions: null,
            completedAt: null,
          });
          return jsonResult(row);
        } catch (err) {
          return errorResult(
            `Failed to create task: ${(err as Error).message}`,
          );
        }
      },
    },

    // ─── gsd_advance ─────────────────────────────────────────────────────
    {
      name: "gsd_advance",
      label: "GSD Advance",
      description:
        "Advance an entity to its next state via the state machine, respecting approval gates. If blocked by a gate, returns blocked result with reason.",
      parameters: AdvanceParams,
      execute: async (_tcid, params) => {
        try {
          const p = params as Static<typeof AdvanceParams>;
          const result = engine.gates.advanceWithGate(
            p.entityType as EntityType,
            p.id,
          );
          return jsonResult(result);
        } catch (err) {
          return errorResult(
            `Failed to advance: ${(err as Error).message}`,
          );
        }
      },
    },

    // ─── gsd_approve ─────────────────────────────────────────────────────
    {
      name: "gsd_approve",
      label: "GSD Approve",
      description:
        "Approve a blocked transition, resuming the state advance. Idempotent if already approved.",
      parameters: ApproveParams,
      execute: async (_tcid, params) => {
        try {
          const p = params as Static<typeof ApproveParams>;
          engine.gates.approve(p.entityType as EntityType, p.id);
          return jsonResult({
            success: true,
            entityType: p.entityType,
            id: p.id,
            message: `Approved ${p.entityType} "${p.id}"`,
          });
        } catch (err) {
          return errorResult(
            `Failed to approve: ${(err as Error).message}`,
          );
        }
      },
    },

    // ─── gsd_status ──────────────────────────────────────────────────────
    {
      name: "gsd_status",
      label: "GSD Status",
      description:
        "Get the current status of an entity (milestone, slice, or task).",
      parameters: StatusParams,
      execute: async (_tcid, params) => {
        try {
          const p = params as Static<typeof StatusParams>;
          const status = engine.stateMachine.getStatus(
            p.entityType as EntityType,
            p.id,
          );
          if (status === undefined) {
            return errorResult(
              `${p.entityType} "${p.id}" not found`,
            );
          }
          return jsonResult({ entityType: p.entityType, id: p.id, status });
        } catch (err) {
          return errorResult(
            `Failed to get status: ${(err as Error).message}`,
          );
        }
      },
    },

    // ─── gsd_phase ───────────────────────────────────────────────────────
    {
      name: "gsd_phase",
      label: "GSD Phase",
      description:
        "Get the current execution phase for a milestone (plan/execute/verify/complete).",
      parameters: PhaseParams,
      execute: async (_tcid, params) => {
        try {
          const p = params as Static<typeof PhaseParams>;
          const phase = engine.stateMachine.getPhase(p.milestoneId);
          if (phase === undefined) {
            return errorResult(
              `Milestone "${p.milestoneId}" not found`,
            );
          }
          return jsonResult({ milestoneId: p.milestoneId, phase });
        } catch (err) {
          return errorResult(
            `Failed to get phase: ${(err as Error).message}`,
          );
        }
      },
    },

    // ─── gsd_list_milestones ─────────────────────────────────────────────
    {
      name: "gsd_list_milestones",
      label: "GSD List Milestones",
      description: "List all milestones in the GSD database.",
      parameters: NoParams,
      execute: async () => {
        try {
          const milestones = engine.db.milestoneGetAll();
          return jsonResult(milestones);
        } catch (err) {
          return errorResult(
            `Failed to list milestones: ${(err as Error).message}`,
          );
        }
      },
    },

    // ─── gsd_list_slices ─────────────────────────────────────────────────
    {
      name: "gsd_list_slices",
      label: "GSD List Slices",
      description: "List all slices for a given milestone.",
      parameters: ListSlicesParams,
      execute: async (_tcid, params) => {
        try {
          const p = params as Static<typeof ListSlicesParams>;
          const slices = engine.db.sliceGetByMilestone(p.milestoneId);
          return jsonResult(slices);
        } catch (err) {
          return errorResult(
            `Failed to list slices: ${(err as Error).message}`,
          );
        }
      },
    },

    // ─── gsd_list_tasks ──────────────────────────────────────────────────
    {
      name: "gsd_list_tasks",
      label: "GSD List Tasks",
      description:
        "List tasks for a slice or milestone. Provide at least one filter.",
      parameters: ListTasksParams,
      execute: async (_tcid, params) => {
        try {
          const p = params as Static<typeof ListTasksParams>;
          if (!p.sliceId && !p.milestoneId) {
            return errorResult(
              "Provide at least one of sliceId or milestoneId",
            );
          }
          let tasks;
          if (p.sliceId) {
            tasks = engine.db.taskGetBySlice(p.sliceId);
          } else {
            tasks = engine.db.taskGetByMilestone(p.milestoneId!);
          }
          return jsonResult(tasks);
        } catch (err) {
          return errorResult(
            `Failed to list tasks: ${(err as Error).message}`,
          );
        }
      },
    },

    // ─── gsd_task_complete ───────────────────────────────────────────────
    {
      name: "gsd_task_complete",
      label: "GSD Task Complete",
      description:
        "Complete a task: write results to DB, render T##-SUMMARY.md, advance task state.",
      parameters: TaskCompleteParams,
      execute: async (_tcid, params) => {
        try {
          const p = params as Static<typeof TaskCompleteParams>;
          const task = engine.db.taskGet(p.taskId);
          if (!task) {
            return errorResult(`Task "${p.taskId}" not found`);
          }
          if (task.status !== "active") {
            return errorResult(`Task "${p.taskId}" is "${task.status}" (expected "active")`);
          }

          // Update DB with completion data
          engine.db.taskUpdate(p.taskId, {
            status: "complete",
            oneLiner: p.oneLiner,
            narrative: p.narrative,
            verification: p.verification,
            keyFiles: p.keyFiles ? JSON.stringify(p.keyFiles) : null,
            keyDecisions: p.keyDecisions ? JSON.stringify(p.keyDecisions) : null,
            deviations: p.deviations ?? null,
            knownIssues: p.knownIssues ?? null,
            completedAt: new Date().toISOString(),
          });

          // Render and write summary file
          const updatedTask = engine.db.taskGet(p.taskId)!;
          const content = renderTaskSummary(updatedTask);
          const summaryPath = join(
            ".gsd", "milestones", p.milestoneId, "slices", p.sliceId,
            "tasks", `${p.taskId}-SUMMARY.md`,
          );
          writeArtifact(summaryPath, content);

          return jsonResult({
            success: true,
            taskId: p.taskId,
            summaryPath,
            message: `Task "${p.taskId}" completed. Summary: ${summaryPath}`,
          });
        } catch (err) {
          return errorResult(
            `Failed to complete task: ${(err as Error).message}`,
          );
        }
      },
    },

    // ─── gsd_slice_complete ──────────────────────────────────────────────
    {
      name: "gsd_slice_complete",
      label: "GSD Slice Complete",
      description:
        "Complete a slice: validate all tasks done, render S##-SUMMARY.md + UAT.md, advance slice state.",
      parameters: SliceCompleteParams,
      execute: async (_tcid, params) => {
        try {
          const p = params as Static<typeof SliceCompleteParams>;
          const slice = engine.db.sliceGet(p.sliceId);
          if (!slice) {
            return errorResult(`Slice "${p.sliceId}" not found`);
          }
          if (slice.status !== "active") {
            return errorResult(`Slice "${p.sliceId}" is "${slice.status}" (expected "active")`);
          }

          // Validate all tasks complete
          const tasks = engine.db.taskGetBySlice(p.sliceId);
          const incomplete = tasks.filter((t) => t.status !== "complete");
          if (incomplete.length > 0) {
            return errorResult(
              `Cannot complete slice "${p.sliceId}": ${incomplete.length} task(s) not complete (${incomplete.map((t) => t.id).join(", ")})`,
            );
          }

          // Advance slice state
          engine.db.sliceUpdate(p.sliceId, { status: "complete" });

          // Render summary and UAT
          const updatedSlice = engine.db.sliceGet(p.sliceId)!;
          const summaryContent = renderSliceSummary(updatedSlice, tasks);
          const uatContent = p.uatContent || renderUat(updatedSlice, tasks);

          const sliceDir = join(
            ".gsd", "milestones", p.milestoneId, "slices", p.sliceId,
          );
          const summaryPath = join(sliceDir, `${p.sliceId}-SUMMARY.md`);
          const uatPath = join(sliceDir, `${p.sliceId}-UAT.md`);

          writeArtifact(summaryPath, summaryContent);
          writeArtifact(uatPath, uatContent);

          return jsonResult({
            success: true,
            sliceId: p.sliceId,
            summaryPath,
            uatPath,
            message: `Slice "${p.sliceId}" completed. Summary: ${summaryPath}, UAT: ${uatPath}`,
          });
        } catch (err) {
          return errorResult(
            `Failed to complete slice: ${(err as Error).message}`,
          );
        }
      },
    },

    // ─── gsd_milestone_validate ──────────────────────────────────────────
    {
      name: "gsd_milestone_validate",
      label: "GSD Milestone Validate",
      description:
        "Validate a milestone: render M##-VALIDATION.md with verdict and audit results.",
      parameters: MilestoneValidateParams,
      execute: async (_tcid, params) => {
        try {
          const p = params as Static<typeof MilestoneValidateParams>;
          const milestone = engine.db.milestoneGet(p.milestoneId);
          if (!milestone) {
            return errorResult(`Milestone "${p.milestoneId}" not found`);
          }

          const slices = engine.db.sliceGetByMilestone(p.milestoneId);
          const content = renderValidation(
            milestone, slices, p.verdict, p.verdictRationale,
          );

          const validationPath = join(
            ".gsd", "milestones", p.milestoneId,
            `${p.milestoneId}-VALIDATION.md`,
          );
          writeArtifact(validationPath, content);

          return jsonResult({
            success: true,
            milestoneId: p.milestoneId,
            verdict: p.verdict,
            validationPath,
            message: `Milestone "${p.milestoneId}" validated (${p.verdict}). File: ${validationPath}`,
          });
        } catch (err) {
          return errorResult(
            `Failed to validate milestone: ${(err as Error).message}`,
          );
        }
      },
    },

    // ─── gsd_milestone_complete ──────────────────────────────────────────
    {
      name: "gsd_milestone_complete",
      label: "GSD Milestone Complete",
      description:
        "Complete a milestone: validate all slices done, render M##-SUMMARY.md, advance milestone state.",
      parameters: MilestoneCompleteParams,
      execute: async (_tcid, params) => {
        try {
          const p = params as Static<typeof MilestoneCompleteParams>;
          const milestone = engine.db.milestoneGet(p.milestoneId);
          if (!milestone) {
            return errorResult(`Milestone "${p.milestoneId}" not found`);
          }

          // Validate all slices complete
          const slices = engine.db.sliceGetByMilestone(p.milestoneId);
          const incomplete = slices.filter(
            (s) => s.status !== "complete" && s.status !== "skipped",
          );
          if (incomplete.length > 0) {
            return errorResult(
              `Cannot complete milestone "${p.milestoneId}": ${incomplete.length} slice(s) not complete (${incomplete.map((s) => s.id).join(", ")})`,
            );
          }

          // Advance milestone state
          engine.db.milestoneUpdate(p.milestoneId, { status: "completed" });

          // Render summary
          const updatedMilestone = engine.db.milestoneGet(p.milestoneId)!;
          const content = renderMilestoneSummary(updatedMilestone, slices);

          const summaryPath = join(
            ".gsd", "milestones", p.milestoneId,
            `${p.milestoneId}-SUMMARY.md`,
          );
          writeArtifact(summaryPath, content);

          return jsonResult({
            success: true,
            milestoneId: p.milestoneId,
            summaryPath,
            message: `Milestone "${p.milestoneId}" completed. Summary: ${summaryPath}`,
          });
        } catch (err) {
          return errorResult(
            `Failed to complete milestone: ${(err as Error).message}`,
          );
        }
      },
    },

    // ─── gsd_dispatch ────────────────────────────────────────────────────
    {
      name: "gsd_dispatch",
      label: "GSD Dispatch",
      description:
        "Get the current dispatch result for a milestone: what to work on next, current phase, and any gate blocks.",
      parameters: DispatchParams,
      execute: async (_tcid, params) => {
        try {
          const p = params as Static<typeof DispatchParams>;
          const result = dispatch(engine, p.milestoneId);
          return jsonResult(result);
        } catch (err) {
          return errorResult(
            `Failed to dispatch: ${(err as Error).message}`,
          );
        }
      },
    },
  ];
}

// ─── Registration function ─────────────────────────────────────────────────

/**
 * Register all GSD tools with the pi extension system.
 *
 * This is called from registerExtension() to make the tools available
 * to the LLM. Tools operate through the GsdEngine singleton.
 */
export function registerGsdTools(
  pi: ExtensionAPI,
  engine: GsdEngine,
): void {
  const handlers = createGsdToolHandlers(engine);

  for (const tool of handlers) {
    pi.registerTool({
      name: tool.name,
      label: tool.label,
      description: tool.description,
      parameters: tool.parameters,
      execute: tool.execute as ToolDefinition["execute"],
    });
  }
}

// Keep a local reference to the ToolDefinition type for the cast above.
type ToolDefinition = import("@gsd/pi-coding-agent").ToolDefinition;

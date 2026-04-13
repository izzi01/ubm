/**
 * /gsd slash commands.
 *
 * User-facing commands that orchestrate GSD tools:
 * - /gsd status — Shows milestone → slice → task hierarchy
 * - /gsd auto — Starts auto-mode execution
 * - /gsd stop — Stops auto-mode
 * - /gsd plan — Guides LLM to use gsd_milestone_plan tool
 * - /gsd build-from-spec — Runs BMAD discovery → reads artifacts → starts GSD session
 *
 * Commands use ctx.ui.notify() and ctx.ui.setWidget() for output,
 * since ExtensionCommandContext doesn't expose sendUserMessage.
 *
 * Handlers are created via a factory for testability (same pattern as gsd-tools).
 */

import * as fs from "fs";
import * as path from "path";
import type { ExtensionAPI, ExtensionCommandContext } from "@gsd/pi-coding-agent";
import type { GsdEngine } from "../state-machine/index.js";
import { getGsdEngine } from "../index.js";
import { dispatch } from "../auto/dispatcher.js";
import {
  executeAutoPipeline,
  ALL_PHASES,
} from "./bmad-commands.js";
import type { PhaseResult } from "./bmad-commands.js";

// ─── Handler type ──────────────────────────────────────────────────────────

export type CommandHandler = (
  args: string,
  ctx: ExtensionCommandContext,
) => Promise<void>;

// ─── Build-from-spec helpers ──────────────────────────────────────────────

/**
 * Read BMAD planning artifacts from _bmad-output/planning-artifacts/.
 * Returns array of { name, content, size } for each file found.
 */
export function readBmadArtifacts(
  cwd: string,
): Array<{ name: string; content: string; size: number }> {
  const artifactsDir = path.join(cwd, "_bmad-output", "planning-artifacts");
  const artifacts: Array<{ name: string; content: string; size: number }> = [];

  if (!fs.existsSync(artifactsDir)) return artifacts;

  const entries = fs.readdirSync(artifactsDir);
  for (const entry of entries) {
    const fullPath = path.join(artifactsDir, entry);
    if (fs.statSync(fullPath).isFile()) {
      const content = fs.readFileSync(fullPath, "utf-8");
      artifacts.push({
        name: entry,
        content,
        size: Buffer.byteLength(content, "utf-8"),
      });
    }
  }

  return artifacts;
}

/**
 * Compose a context string from BMAD artifacts for the GSD session.
 */
export function composeGsdContext(
  artifacts: Array<{ name: string; content: string }>,
): string {
  const parts = artifacts.map(
    (a) => `## ${a.name}\n\n${a.content}`,
  );
  return `# BMAD Discovery Output\n\n${parts.join("\n\n---\n\n")}`;
}

/**
 * Default pipeline runner that executes all 4 BMAD phases sequentially.
 */
export async function runBmadPipelineForSpec(
  message: string,
  ctx: ExtensionCommandContext,
): Promise<PhaseResult[]> {
  const results: PhaseResult[] = [];

  for (let i = 0; i < ALL_PHASES.length; i++) {
    const phaseConfig = ALL_PHASES[i];

    ctx.ui.setWidget("gsd-build-from-spec", [
      `🔄 Phase ${i + 1}/${ALL_PHASES.length}: ${phaseConfig.icon} ${phaseConfig.label}`,
      "",
      `Running ${phaseConfig.pipeline.stages.length} stage(s)…`,
    ]);

    const result = await executeAutoPipeline(phaseConfig, message, ctx);
    if (result) {
      results.push(result);

      // Stop early if phase failed
      if (result.result.status === "failed") {
        ctx.ui.notify(`${phaseConfig.label} phase failed — stopping pipeline`, "error");
        ctx.ui.setWidget("gsd-build-from-spec", [
          `❌ Pipeline stopped: ${phaseConfig.label} phase failed`,
          "",
          `Completed phases: ${results.filter((r) => r.result.status === "completed").map((r) => r.phase.label).join(", ") || "none"}`,
          `Failed at: ${phaseConfig.label}`,
        ]);
        break;
      }
    }
  }

  return results;
}

// ─── Command handler factory ───────────────────────────────────────────────

/**
 * Create command handlers bound to a GsdEngine instance.
 * Each handler is a standalone function for testing.
 *
 * @param engine - Wired GSD engine instance
 * @param opts - Optional overrides for dependency injection
 */
export function createGsdCommandHandlers(
  engine: GsdEngine,
  opts?: {
    /** Override the pipeline runner for build-from-spec (for testing). */
    pipelineRunner?: typeof runBmadPipelineForSpec;
  },
) {
  const pipelineRunner = opts?.pipelineRunner ?? runBmadPipelineForSpec;

  /**
   * /gsd status — Display milestone → slice → task hierarchy from the DB.
   */
  async function handleGsdStatus(
    _args: string,
    ctx: ExtensionCommandContext,
  ): Promise<void> {
    const milestones = engine.db.milestoneGetAll();

    if (milestones.length === 0) {
      ctx.ui.notify("No milestones found. Use gsd_milestone_plan tool to create one.", "info");
      ctx.ui.setWidget("gsd-status", ["📋 No milestones found in GSD database."]);
      return;
    }

    const lines: string[] = ["📋 GSD Status\n"];

    for (const ms of milestones) {
      lines.push(`${ms.id} — ${ms.title} [${ms.status}]`);

      const slices = engine.db.sliceGetByMilestone(ms.id);
      for (const sl of slices) {
        lines.push(`  ${sl.id} — ${sl.title} [${sl.status}]`);

        const tasks = engine.db.taskGetBySlice(sl.id);
        for (const t of tasks) {
          const icon = t.status === "complete" ? "✅" : t.status === "active" ? "🔄" : "⬜";
          lines.push(`    ${icon} ${t.id} — ${t.title} [${t.status}]`);
        }
      }
      lines.push("");
    }

    ctx.ui.notify(`Found ${milestones.length} milestone(s)`, "info");
    ctx.ui.setWidget("gsd-status", lines);
  }

  /**
   * /gsd auto — Start auto-mode, dispatch, and show next action.
   */
  async function handleGsdAuto(
    _args: string,
    ctx: ExtensionCommandContext,
  ): Promise<void> {
    const milestones = engine.db.milestoneGetAll();

    if (milestones.length === 0) {
      ctx.ui.notify("No milestones found. Create one first.", "warning");
      ctx.ui.setWidget("gsd-auto", ["⚠️ No milestones found. Use gsd_milestone_plan tool first."]);
      return;
    }

    const activeMilestone = milestones.find((m) => m.status === "active");
    if (!activeMilestone) {
      ctx.ui.notify("No active milestones.", "warning");
      ctx.ui.setWidget("gsd-auto", ["⚠️ No active milestones. All are completed or deferred."]);
      return;
    }

    // Start auto-mode
    engine.autoMode.start(activeMilestone.id);

    // Dispatch to find next action
    const result = dispatch(engine, activeMilestone.id);
    engine.autoMode.updateLastDispatch(result);

    const lines = [
      "🚀 Auto-Mode",
      "",
      `Milestone: ${activeMilestone.id} — ${activeMilestone.title}`,
      `Phase: ${result.phase}`,
      `Action: ${result.action}`,
      `Slice: ${result.sliceId ?? "—"}`,
      `Task: ${result.taskId ?? "—"}`,
      `Blocked: ${result.blocked ? "🔒 " + (result.blockedReason ?? "") : "No"}`,
      "",
      result.message,
    ];

    ctx.ui.notify(`Auto-mode: ${activeMilestone.id} (${result.phase}) — ${result.action}`, "info");
    ctx.ui.setWidget("gsd-auto", lines);
  }

  /**
   * /gsd stop — Stop auto-mode.
   */
  async function handleGsdStop(
    _args: string,
    ctx: ExtensionCommandContext,
  ): Promise<void> {
    engine.autoMode.stop();
    ctx.ui.notify("Auto-mode stopped.", "info");
    ctx.ui.setWidget("gsd-auto", ["⏹️ Auto-mode stopped."]);
  }

  /**
   * /gsd plan — Guide the LLM to use the gsd_milestone_plan tool.
   */
  async function handleGsdPlan(
    _args: string,
    ctx: ExtensionCommandContext,
  ): Promise<void> {
    ctx.ui.notify("Use gsd_milestone_plan tool to plan a milestone.", "info");
    ctx.ui.setWidget("gsd-plan", [
      "📝 GSD Plan Guidance",
      "",
      "To plan a milestone, use the gsd_milestone_plan tool with:",
      "  id: Milestone ID (e.g. M001)",
      "  title: Milestone title",
      "  vision: Vision statement",
      "  successCriteria: (optional) Success criteria bullets",
      "  definitionOfDone: (optional) Definition of done bullets",
      "",
      "Then use gsd_slice_plan and gsd_task_plan to decompose work.",
    ]);
  }

  /**
   * /gsd build-from-spec — Run BMAD discovery pipeline, read planning artifacts,
   * compose context, and start a GSD session for milestone planning.
   *
   * Workflow:
   * 1. Run all 4 BMAD pipeline phases sequentially
   * 2. Read PRD + architecture documents from _bmad-output/planning-artifacts/
   * 3. Compose a context file with the BMAD artifacts
   * 4. Start a new session with the composed context
   */
  async function handleGsdBuildFromSpec(
    args: string,
    ctx: ExtensionCommandContext,
  ): Promise<void> {
    const trimmed = args.trim();

    // Validate args
    if (!trimmed || trimmed === "help") {
      ctx.ui.notify("Usage: /gsd build-from-spec <message>", "warning");
      ctx.ui.setWidget("gsd-build-from-spec", [
        "❓ Specify a project description.",
        "",
        "Usage: /gsd build-from-spec <message>",
        "Example: /gsd build-from-spec Build an OAuth provider for SaaS apps",
        "",
        "This will:",
        "  1. Run all 4 BMAD pipeline phases sequentially",
        "  2. Read planning artifacts from _bmad-output/planning-artifacts/",
        "  3. Compose context from those artifacts",
        "  4. Start a GSD session for milestone planning",
      ]);
      return;
    }

    // Step 1: Run all 4 BMAD pipeline phases
    ctx.ui.notify("Starting BMAD→GSD pipeline…", "info");
    ctx.ui.setWidget("gsd-build-from-spec", [
      "🚀 BMAD → GSD Pipeline",
      "",
      "Step 1: Running BMAD discovery phases…",
    ]);

    const phaseResults = await pipelineRunner(trimmed, ctx);

    // Check if pipeline failed early
    const failedPhase = phaseResults.find(
      (r) => r.result.status === "failed",
    );
    if (failedPhase) {
      // Error already reported by the pipeline runner
      return;
    }

    // Step 2: Read planning artifacts from _bmad-output/planning-artifacts/
    ctx.ui.setWidget("gsd-build-from-spec", [
      "📄 Reading BMAD planning artifacts…",
    ]);

    const artifacts = readBmadArtifacts(ctx.cwd);

    // Step 3: Compose context from artifacts
    if (artifacts.length === 0) {
      ctx.ui.notify(
        "No planning artifacts found in _bmad-output/planning-artifacts/",
        "warning",
      );
      ctx.ui.setWidget("gsd-build-from-spec", [
        "⚠️ BMAD pipeline completed but no planning artifacts were found.",
        "",
        "Expected artifacts in: _bmad-output/planning-artifacts/",
        "",
        "BMAD phases completed: " +
          phaseResults
            .map((r) => {
              const icon = r.result.status === "completed" ? "✅" : "⚠️";
              return `${icon} ${r.phase.label}`;
            })
            .join(", "),
      ]);
      return;
    }

    const composedContext = composeGsdContext(artifacts);

    // Step 4: Report artifacts read and start new session
    const artifactReport = artifacts
      .map((a) => `  📄 ${a.name} (${a.size} bytes)`)
      .join("\n");

    ctx.ui.notify(
      `Read ${artifacts.length} artifact(s), starting GSD session…`,
      "info",
    );
    ctx.ui.setWidget("gsd-build-from-spec", [
      "📊 BMAD → GSD Pipeline — Complete",
      "",
      "BMAD Phases:",
      ...phaseResults.map((r) => {
        const icon =
          r.result.status === "completed"
            ? "✅"
            : r.result.status === "partial"
              ? "⚠️"
              : "❌";
        return `  ${icon} ${r.phase.icon} ${r.phase.label}`;
      }),
      "",
      `Artifacts Read (${artifacts.length}):`,
      artifactReport,
      "",
      "Starting GSD session with composed context…",
    ]);

    // Start new session with composed context
    try {
      const result = await ctx.newSession({
        setup: async (sm) => {
          sm.appendSessionInfo(
            "gsd-build-from-spec: BMAD discovery → GSD planning",
          );
          sm.appendMessage({
            role: "user",
            content: `Use the following BMAD discovery artifacts to create a GSD milestone plan using gsd_milestone_plan.\n\n${composedContext}`,
            timestamp: Date.now(),
          });
        },
      });

      if (result.cancelled) {
        ctx.ui.notify("Session creation cancelled", "warning");
        ctx.ui.setWidget("gsd-build-from-spec", [
          "⚠️ GSD session creation was cancelled.",
          "",
          `Artifacts were read: ${artifacts.length} file(s).`,
          "Re-run /gsd build-from-spec to try again.",
        ]);
        return;
      }

      ctx.ui.notify("GSD session started with BMAD context", "info");
      ctx.ui.setWidget("gsd-build-from-spec", [
        "✅ BMAD → GSD Pipeline — Session Started",
        "",
        `BMAD phases: ${phaseResults.length} completed`,
        `Artifacts loaded: ${artifacts.length}`,
        "",
        "The GSD session has been started with the BMAD discovery context.",
        "Use gsd_milestone_plan to create the milestone from these artifacts.",
      ]);
    } catch (err) {
      ctx.ui.notify("Failed to start GSD session", "error");
      ctx.ui.setWidget("gsd-build-from-spec", [
        `❌ Failed to start session: ${err instanceof Error ? err.message : String(err)}`,
      ]);
    }
  }

  return {
    handleGsdStatus,
    handleGsdAuto,
    handleGsdStop,
    handleGsdPlan,
    handleGsdBuildFromSpec,
  };
}

// ─── Registration ──────────────────────────────────────────────────────────

/**
 * Register all /gsd slash commands with the pi extension system.
 * Uses the module-scoped engine via getGsdEngine().
 */
export function registerGsdCommands(pi: ExtensionAPI): void {
  const engine = getGsdEngine();
  const handlers = createGsdCommandHandlers(engine);

  pi.registerCommand("gsd status", {
    description: "Show GSD milestone → slice → task status hierarchy",
    handler: handlers.handleGsdStatus,
  });

  pi.registerCommand("gsd auto", {
    description: "Start GSD auto-mode execution",
    handler: handlers.handleGsdAuto,
  });

  pi.registerCommand("gsd stop", {
    description: "Stop GSD auto-mode",
    handler: handlers.handleGsdStop,
  });

  pi.registerCommand("gsd plan", {
    description: "Get guidance on planning a GSD milestone",
    handler: handlers.handleGsdPlan,
  });

  pi.registerCommand("gsd build-from-spec", {
    description: "Run BMAD discovery pipeline, read artifacts, and start GSD session for milestone planning",
    handler: handlers.handleGsdBuildFromSpec,
  });
}

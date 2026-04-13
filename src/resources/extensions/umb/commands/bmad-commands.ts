/**
 * /bmad slash commands.
 *
 * User-facing commands for BMAD agent delegation and skill execution:
 * - /bmad <agent> — Delegate to a BMAD agent
 * - /bmad list — List available BMAD agents
 * - /bmad run <skill> <message> — Execute a BMAD skill in a new session
 * - /bmad skills — List available BMAD skills (non-agent)
 * - /bmad auto <message> — Run all 4 BMAD pipeline phases sequentially
 * - /bmad auto <phase> <message> — Run a single BMAD pipeline phase
 * - /bmad auto --stop-after <phase> <message> — Run phases up to and including <phase>
 *
 * Commands use ctx.ui.notify() and ctx.ui.setWidget() for output.
 */

import * as fs from "fs";
import * as path from "path";
import type { ExtensionAPI, ExtensionCommandContext } from "@gsd/pi-coding-agent";
import {
  findBmadSkills,
  loadBmadSkill,
  resolveBmadConfig,
  composeExecutionPrompt,
} from "../bmad-executor/index.js";
import {
  runPipeline,
  ANALYSIS_PIPELINE,
  PLANNING_PIPELINE,
  SOLUTIONING_PIPELINE,
  IMPLEMENTATION_PIPELINE,
  listPipelines,
} from "../bmad-pipeline/index.js";
import type { PipelineDefinition } from "../bmad-pipeline/types.js";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface BmadAgentInfo {
  name: string;
  title: string;
  icon?: string;
  module?: string;
  path: string;
}

/** Configuration for a single phase, used by the shared executor. */
interface PhaseConfig {
  /** Pipeline definition for this phase. */
  pipeline: PipelineDefinition;
  /** Human-readable label (e.g. "Analysis"). */
  label: string;
  /** Emoji/icon for this phase. */
  icon: string;
  /** Phase number (e.g. "1"). */
  number: string;
}

/** Result from executing a single phase via the shared executor. */
export interface PhaseResult {
  /** Which phase was executed. */
  phase: PhaseConfig;
  /** The pipeline result. */
  result: Awaited<ReturnType<typeof runPipeline>>;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

/**
 * Scan _bmad/ for agent definitions, returning basic info.
 */
function findBmadAgents(cwd: string): BmadAgentInfo[] {
  const bmadDir = path.join(cwd, "_bmad");
  const agents: BmadAgentInfo[] = [];

  if (!fs.existsSync(bmadDir)) return agents;

  function walkDir(dir: string, baseRel: string): void {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      const rel = path.join(baseRel, entry.name);
      if (entry.isDirectory()) {
        walkDir(full, rel);
      } else if (entry.isFile() && (entry.name.endsWith(".md") || entry.name.endsWith(".yaml") || entry.name.endsWith(".yml"))) {
        // Only match SKILL.md files inside bmad-agent-* directories
        const parentDir = path.dirname(rel).split(path.sep).pop();
        if (!parentDir || !parentDir.startsWith("bmad-agent-") || entry.name !== "SKILL.md") continue;

        try {
          const content = fs.readFileSync(full, "utf-8");
          const frontmatter = extractSimpleFrontmatter(content);
          if (frontmatter.name) {
            agents.push({
              name: frontmatter.name,
              title: frontmatter.title || frontmatter.description || frontmatter.name,
              icon: frontmatter.icon || undefined,
              module: extractModuleFromPath(rel),
              path: rel,
            });
          }
        } catch {
          // Skip unreadable files
        }
      }
    }
  }

  walkDir(bmadDir, "_bmad");
  return agents;
}

/**
 * Simple YAML frontmatter extraction for agent metadata.
 */
function extractSimpleFrontmatter(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  if (!content.startsWith("---")) return result;

  const endIdx = content.indexOf("---", 3);
  if (endIdx === -1) return result;

  const yaml = content.substring(3, endIdx).trim();
  for (const line of yaml.split("\n")) {
    const quoted = line.match(/^(\w[\w-]*):\s*"([^"]*)"\s*$/);
    if (quoted) {
      result[quoted[1]] = quoted[2];
    } else {
      const unquoted = line.match(/^(\w[\w-]*):\s*(.+)$/);
      if (unquoted) result[unquoted[1]] = unquoted[2].trim();
    }
  }
  return result;
}

/**
 * Extract module name from relative path.
 */
function extractModuleFromPath(relPath: string): string | undefined {
  const parts = relPath.split(path.sep);
  for (const part of parts) {
    if (["bmm", "cis", "bmb", "core"].includes(part)) return part;
  }
  return undefined;
}

// ─── Shared Pipeline Executor ─────────────────────────────────────────────

/**
 * Ordered list of all auto pipeline phases.
 */
export const ALL_PHASES: PhaseConfig[] = [
  { pipeline: ANALYSIS_PIPELINE, label: "Analysis", icon: "🔍", number: "1" },
  { pipeline: PLANNING_PIPELINE, label: "Planning", icon: "📐", number: "2" },
  { pipeline: SOLUTIONING_PIPELINE, label: "Solutioning", icon: "🏗️", number: "3" },
  { pipeline: IMPLEMENTATION_PIPELINE, label: "Implementation", icon: "⚙️", number: "4" },
];

/**
 * Build a session factory from the extension command context.
 */
function buildSessionFactory(
  ctx: ExtensionCommandContext,
): (prompt: string, skillName: string) => Promise<{ cancelled: boolean; error?: string }> {
  return async (
    prompt: string,
    skillName: string,
  ): Promise<{ cancelled: boolean; error?: string }> => {
    try {
      const result = await ctx.newSession({
        setup: async (sm) => {
          sm.appendSessionInfo(`bmad-pipeline: ${skillName}`);
          sm.appendMessage({
            role: "user",
            content: prompt,
            timestamp: Date.now(),
          });
        },
      });
      return { cancelled: result.cancelled };
    } catch (err) {
      return {
        cancelled: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  };
}

/**
 * Shared executor for a single BMAD auto pipeline phase.
 *
 * Handles flag parsing (--list, --dry-run, help), pipeline execution,
 * progress reporting, and error display. Each per-phase handler is a
 * thin wrapper that provides the phase-specific config.
 */
export async function executeAutoPipeline(
  phase: PhaseConfig,
  args: string,
  ctx: ExtensionCommandContext,
): Promise<PhaseResult | null> {
  const trimmed = args.trim();

  // No args or help
  if (!trimmed || trimmed === "help") {
    const stages = phase.pipeline.stages
      .map((s, i) => `  ${i + 1}. ${s.skill}${s.optional ? " (optional)" : ""} — ${s.description}`)
      .join("\n");

    ctx.ui.notify(`Usage: /bmad auto ${phase.pipeline.id} <message>`, "info");
    ctx.ui.setWidget("bmad", [
      `${phase.icon} BMAD Auto-${phase.label} — Phase ${phase.number} Pipeline`,
      "",
      `Usage: /bmad auto ${phase.pipeline.id} <message>`,
      `       /bmad auto ${phase.pipeline.id} --list`,
      `       /bmad auto ${phase.pipeline.id} --dry-run`,
      "",
      `Pipeline: ${phase.pipeline.name}`,
      "",
      stages,
      "",
      `Total: ${phase.pipeline.stages.length} stage(s)`,
    ]);
    return null;
  }

  // --list: show pipeline stages without execution
  if (trimmed.startsWith("--list")) {
    const pipelines = listPipelines();
    const lines: string[] = ["📋 Available Pipelines\n"];

    for (const p of pipelines) {
      lines.push(`📌 ${p.name} (id: ${p.id})`);
      lines.push(`   ${p.description}`);
      lines.push("");
      for (const s of p.stages) {
        const status = s.optional ? "◯ optional" : "● required";
        lines.push(`   ${status}  ${s.skill} — ${s.description}`);
      }
      lines.push("");
    }

    ctx.ui.notify(`Found ${pipelines.length} pipeline(s)`, "info");
    ctx.ui.setWidget("bmad", lines);
    return null;
  }

  // --dry-run: show stages without creating sessions
  if (trimmed.startsWith("--dry-run")) {
    const result = await runPipeline(
      phase.pipeline,
      trimmed.replace(/^--dry-run\s*/, "").trim() || "<dry-run>",
      ctx.cwd,
      async () => ({ cancelled: false }),
      { dryRun: true },
    );

    const lines: string[] = [
      `🧪 Dry Run — Phase ${phase.number} ${phase.label} Pipeline`,
      "",
    ];

    for (const sr of result.completedStages) {
      lines.push(`  ✅ ${sr.stage.skill} — ${sr.stage.description}`);
    }

    lines.push("");
    lines.push(`Result: ${result.status} (${result.completedStages.length} stages)`);

    ctx.ui.notify(`Dry run completed: ${result.status}`, "info");
    ctx.ui.setWidget("bmad", lines);
    return { phase, result };
  }

  // Execute the pipeline with the full args as user message
  const userMessage = trimmed;

  ctx.ui.notify(`Starting BMAD ${phase.label.toLowerCase()} pipeline…`, "info");
  ctx.ui.setWidget("bmad", [
    `🚀 Starting BMAD ${phase.label} Pipeline`,
    "",
    `Message: ${userMessage}`,
    "",
    "Preparing stages…",
  ]);

  const sessionFactory = buildSessionFactory(ctx);

  try {
    const result = await runPipeline(
      phase.pipeline,
      userMessage,
      ctx.cwd,
      sessionFactory,
    );

    const lines: string[] = [
      `📊 Pipeline ${result.status === "completed" ? "✅ Completed" : result.status === "partial" ? "⚠️ Partial" : "❌ Failed"}`,
      "",
    ];

    for (const sr of result.completedStages) {
      if (sr.status === "completed") {
        lines.push(`  ✅ ${sr.stage.skill}`);
      } else {
        lines.push(`  ❌ ${sr.stage.skill} — ${sr.error || "unknown error"}`);
      }
    }

    for (const skipped of result.skippedStages) {
      lines.push(`  ⏭️ ${skipped} (skipped)`);
    }

    lines.push("");
    const completed = result.completedStages.filter((s) => s.status === "completed").length;
    const failed = result.completedStages.filter((s) => s.status === "failed").length;
    lines.push(`Summary: ${completed} completed, ${result.skippedStages.length} skipped, ${failed} failed`);

    ctx.ui.notify(
      result.status === "completed"
        ? `${phase.label} pipeline completed`
        : result.status === "partial"
          ? `${phase.label} pipeline completed (partial)`
          : `${phase.label} pipeline failed`,
      result.status === "failed" ? "error" : "info",
    );
    ctx.ui.setWidget("bmad", lines);
    return { phase, result };
  } catch (err) {
    ctx.ui.notify(`${phase.label} pipeline failed`, "error");
    ctx.ui.setWidget("bmad", [
      "❌ Pipeline execution failed",
      "",
      `Error: ${err instanceof Error ? err.message : String(err)}`,
    ]);
    return null;
  }
}

// ─── Command handlers ──────────────────────────────────────────────────────

/**
 * /bmad <agent> — Delegate to a BMAD agent.
 * Parses agent name from args, validates it exists, and displays delegation info.
 */
export async function handleBmadDelegate(
  args: string,
  ctx: ExtensionCommandContext,
): Promise<void> {
  const agentName = args.trim().split(/\s+/)[0];

  if (!agentName) {
    ctx.ui.notify("Usage: /bmad <agent-name> or /bmad list", "warning");
    ctx.ui.setWidget("bmad", ["❓ Specify an agent name. Use /bmad list to see available agents."]);
    return;
  }

  // Normalize: allow "pm" to match "pm", allow subcommands like "bmad dev"
  const agents = findBmadAgents(ctx.cwd);
  const match = agents.find(
    (a) => a.name === agentName || a.name.endsWith(`-${agentName}`),
  );

  if (!match) {
    ctx.ui.notify(`Agent "${agentName}" not found.`, "error");
    const available = agents.map((a) => a.name).join(", ");
    ctx.ui.setWidget("bmad", [
      `❌ Agent "${agentName}" not found.`,
      "",
      `Available: ${available || "none"}`,
    ]);
    return;
  }

  ctx.ui.notify(`Delegating to ${match.name}`, "info");
  ctx.ui.setWidget("bmad", [
    `🎭 Delegating to ${match.icon || "🤖"} ${match.title}`,
    "",
    `Agent: ${match.name}${match.module ? ` (module: ${match.module})` : ""}`,
    `Source: ${match.path}`,
    "",
    "Loading agent persona and activation sequence...",
  ]);
}

/**
 * /bmad list — List available BMAD agents.
 */
export async function handleBmadList(
  _args: string,
  ctx: ExtensionCommandContext,
): Promise<void> {
  const agents = findBmadAgents(ctx.cwd);

  if (agents.length === 0) {
    ctx.ui.notify("No BMAD agents found.", "warning");
    ctx.ui.setWidget("bmad", ["⚠️ No BMAD agents found in _bmad/ directory."]);
    return;
  }

  // Group by module
  const byModule = new Map<string, BmadAgentInfo[]>();
  for (const agent of agents) {
    const mod = agent.module || "other";
    if (!byModule.has(mod)) byModule.set(mod, []);
    byModule.get(mod)!.push(agent);
  }

  const lines: string[] = ["🎭 BMAD Agents\n"];
  const moduleLabels: Record<string, string> = {
    bmm: "📋 Business Management",
    cis: "🧠 Continuous Innovation",
    bmb: "🧙 Builder & Meta",
    core: "⚙️ Core",
    other: "📦 Other",
  };

  for (const [mod, modAgents] of byModule) {
    lines.push(`${moduleLabels[mod] || mod}`);
    for (const a of modAgents) {
      lines.push(`  ${a.icon || "🤖"} ${a.name} — ${a.title}`);
    }
    lines.push("");
  }

  lines.push(`Total: ${agents.length} agent(s)`);

  ctx.ui.notify(`Found ${agents.length} BMAD agent(s)`, "info");
  ctx.ui.setWidget("bmad", lines);
}

/**
 * /bmad run <skill> <message> — Execute a BMAD skill in a new session.
 *
 * Parses args: first token = skill name (fuzzy match supported),
 * rest = user message. Loads the skill, resolves config, composes
 * the execution prompt, and creates a new pi session.
 */
export async function handleBmadRun(
  args: string,
  ctx: ExtensionCommandContext,
): Promise<void> {
  const trimmed = args.trim();

  if (!trimmed) {
    ctx.ui.notify("Usage: /bmad run <skill-name> <message>", "warning");
    ctx.ui.setWidget("bmad", [
      "❓ Specify a skill name and message.",
      "",
      "Usage: /bmad run <skill-name> <message>",
      "Example: /bmad run product-brief Build an OAuth provider",
    ]);
    return;
  }

  // Parse: first token = skill name, rest = user message
  const parts = trimmed.split(/\s+/);
  const skillName = parts[0];
  const userMessage = parts.slice(1).join(" ").trim();

  if (!userMessage) {
    ctx.ui.notify(
      "Usage: /bmad run <skill-name> <message> — message is required",
      "warning",
    );
    ctx.ui.setWidget("bmad", [
      "❓ Message is required.",
      "",
      "Usage: /bmad run <skill-name> <message>",
    ]);
    return;
  }

  // Load skill (fuzzy match supported by loadBmadSkill)
  const skill = loadBmadSkill(skillName, ctx.cwd);

  if (!skill) {
    ctx.ui.notify(`Skill "${skillName}" not found`, "error");
    const allSkills = findBmadSkills(ctx.cwd);
    const available = allSkills.map((s) => s.name).join(", ") || "none";
    ctx.ui.setWidget("bmad", [
      `❌ Skill "${skillName}" not found.`,
      "",
      `Available skills: ${available}`,
    ]);
    return;
  }

  // Resolve config
  const config = resolveBmadConfig(ctx.cwd);

  // Compose execution prompt
  const prompt = composeExecutionPrompt(skill, config, userMessage);

  // Create new session
  try {
    const result = await ctx.newSession({
      setup: async (sm) => {
        sm.appendSessionInfo(`bmad-skill: ${skill.name}`);
        sm.appendMessage({
          role: "user",
          content: prompt,
          timestamp: Date.now(),
        });
      },
    });

    if (result.cancelled) {
      ctx.ui.notify("Session creation cancelled", "warning");
      ctx.ui.setWidget("bmad", [
        "⚠️ BMAD skill session creation was cancelled.",
      ]);
      return;
    }

    ctx.ui.notify(
      `BMAD skill "${skill.name}" session started`,
      "info",
    );
    ctx.ui.setWidget("bmad", [
      `🎭 Skill: ${skill.name}`,
      skill.description ? `📝 ${skill.description}` : "",
      "",
      `Message: ${userMessage}`,
      `Config: ${Object.keys(config.values).length} variable(s)`,
      skill.prompts.length > 0
        ? `Prompts: ${skill.prompts.length} prompt file(s)`
        : "",
      skill.agents.length > 0
        ? `Agents: ${skill.agents.length} agent definition(s)`
        : "",
      "",
      "Session started — skill context loaded.",
    ]);
  } catch (err) {
    ctx.ui.notify("Failed to start BMAD skill session", "error");
    ctx.ui.setWidget("bmad", [
      `❌ Failed to start session: ${err instanceof Error ? err.message : String(err)}`,
    ]);
  }
}

/**
 * /bmad skills — List available BMAD skills (non-agent skills).
 *
 * Shows all discoverable skills from _bmad/bmm/ and _bmad/core/,
 * excluding agent-only entries. Grouped by module.
 */
export async function handleBmadSkills(
  _args: string,
  ctx: ExtensionCommandContext,
): Promise<void> {
  const skills = findBmadSkills(ctx.cwd);

  if (skills.length === 0) {
    ctx.ui.notify("No BMAD skills found.", "warning");
    ctx.ui.setWidget("bmad", [
      "⚠️ No BMAD skills found in _bmad/ directory.",
    ]);
    return;
  }

  // Group by module
  const byModule = new Map<string, typeof skills>();
  for (const skill of skills) {
    const mod = skill.module || "other";
    if (!byModule.has(mod)) byModule.set(mod, []);
    byModule.get(mod)!.push(skill);
  }

  const lines: string[] = ["📋 BMAD Skills\n"];
  const moduleLabels: Record<string, string> = {
    bmm: "📋 Business Management",
    cis: "🧠 Continuous Innovation",
    bmb: "🧙 Builder & Meta",
    core: "⚙️ Core",
    other: "📦 Other",
  };

  for (const [mod, modSkills] of byModule) {
    lines.push(`${moduleLabels[mod] || mod}`);
    for (const s of modSkills) {
      const desc = s.description ? ` — ${s.description}` : "";
      const meta = [];
      if (s.prompts.length > 0) meta.push(`${s.prompts.length} prompt(s)`);
      if (s.agents.length > 0) meta.push(`${s.agents.length} agent(s)`);
      const metaStr = meta.length > 0 ? ` [${meta.join(", ")}]` : "";
      lines.push(`  📁 ${s.name}${desc}${metaStr}`);
    }
    lines.push("");
  }

  lines.push(`Total: ${skills.length} skill(s)`);

  ctx.ui.notify(`Found ${skills.length} BMAD skill(s)`, "info");
  ctx.ui.setWidget("bmad", lines);
}

// ─── Per-phase handlers (thin wrappers around executeAutoPipeline) ────────

/**
 * /bmad auto-analysis — Run Phase 1 analysis pipeline.
 */
export async function handleBmadAutoAnalysis(
  args: string,
  ctx: ExtensionCommandContext,
): Promise<void> {
  await executeAutoPipeline(ALL_PHASES[0], args, ctx);
}

/**
 * /bmad auto-planning — Run Phase 2 planning pipeline.
 */
export async function handleBmadAutoPlanning(
  args: string,
  ctx: ExtensionCommandContext,
): Promise<void> {
  await executeAutoPipeline(ALL_PHASES[1], args, ctx);
}

/**
 * /bmad auto-solutioning — Run Phase 3 solutioning pipeline.
 */
export async function handleBmadAutoSolutioning(
  args: string,
  ctx: ExtensionCommandContext,
): Promise<void> {
  await executeAutoPipeline(ALL_PHASES[2], args, ctx);
}

/**
 * /bmad auto-implementation — Run Phase 4 implementation pipeline.
 */
export async function handleBmadAutoImplementation(
  args: string,
  ctx: ExtensionCommandContext,
): Promise<void> {
  await executeAutoPipeline(ALL_PHASES[3], args, ctx);
}

// ─── /bmad auto (umbrella command) ────────────────────────────────────────

/** Available auto pipeline phases. */
const AUTO_PHASES = [
  { name: "analysis", description: "Phase 1: research → brief → prfaq → document-project", implemented: true },
  { name: "planning", description: "Phase 2: workflow design and task decomposition", implemented: true },
  { name: "solutioning", description: "Phase 3: solution architecture and design", implemented: true },
  { name: "implementation", description: "Phase 4: code generation and testing", implemented: true },
];

/**
 * Parse --stop-after <phase> flag from args.
 * Returns { stopAfter, message } where stopAfter is null if flag not present.
 */
function parseStopAfter(args: string): { stopAfter: string | null; message: string } {
  const match = args.match(/^--stop-after\s+(\S+)\s*(.*)/);
  if (match) {
    return { stopAfter: match[1].toLowerCase(), message: match[2].trim() };
  }
  return { stopAfter: null, message: args.trim() };
}

/**
 * /bmad auto — Run BMAD auto pipeline phases.
 *
 * Three modes:
 * 1. No args / help → show available phases
 * 2. <phase> <message> → run a single phase (delegated to per-phase handler)
 * 3. <message> (no phase) → run ALL 4 phases sequentially (umbrella mode)
 * 4. --stop-after <phase> <message> → run phases up to and including <phase>
 */
export async function handleBmadAuto(
  args: string,
  ctx: ExtensionCommandContext,
): Promise<void> {
  const trimmed = args.trim();

  // No args or help: show available phases
  if (!trimmed || trimmed === "help") {
    const lines: string[] = [
      "🔄 BMAD Auto Pipeline\n",
      "Usage: /bmad auto <message>           — run all 4 phases sequentially",
      "       /bmad auto <phase> <message>   — run a single phase",
      "       /bmad auto --stop-after <phase> <message> — run phases up to <phase>\n",
    ];
    for (const phase of AUTO_PHASES) {
      const status = phase.implemented ? "✅" : "🔜 coming soon";
      lines.push(`  ${status} ${phase.name} — ${phase.description}`);
    }
    lines.push("");
    ctx.ui.notify("Usage: /bmad auto <message> or /bmad auto <phase> <message>", "info");
    ctx.ui.setWidget("bmad", lines);
    return;
  }

  // Check for --stop-after flag first
  const { stopAfter, message } = parseStopAfter(trimmed);

  if (stopAfter !== null) {
    // --stop-after mode
    if (!message) {
      ctx.ui.notify("Usage: /bmad auto --stop-after <phase> <message>", "warning");
      ctx.ui.setWidget("bmad", [
        "❓ Message is required after --stop-after <phase>.",
        "",
        `Valid phases: ${ALL_PHASES.map((p) => p.pipeline.id).join(", ")}`,
      ]);
      return;
    }

    const stopIdx = ALL_PHASES.findIndex(
      (p) => p.pipeline.id === stopAfter,
    );
    if (stopIdx === -1) {
      ctx.ui.notify(`Invalid stop-after phase '${stopAfter}'`, "error");
      ctx.ui.setWidget("bmad", [
        `❌ Invalid phase: ${stopAfter}`,
        "",
        "Valid phases:",
        ...ALL_PHASES.map((p) => `  ✅ ${p.pipeline.id}`),
      ]);
      return;
    }

    const phasesToRun = ALL_PHASES.slice(0, stopIdx + 1);
    ctx.ui.notify(`Starting BMAD auto pipeline (stopping after ${stopAfter})…`, "info");
    ctx.ui.setWidget("bmad", [
      `🚀 Starting BMAD Auto Pipeline — stopping after ${stopAfter}`,
      "",
      `Phases: ${phasesToRun.map((p) => p.label).join(" → ")}`,
      `Message: ${message}`,
    ]);

    const results: PhaseResult[] = [];
    for (const phaseConfig of phasesToRun) {
      // Report phase transition
      ctx.ui.setWidget("bmad", [
        `🔄 Phase ${phaseConfig.number}/${stopIdx + 1}: ${phaseConfig.icon} ${phaseConfig.label}`,
        "",
        `Running ${phaseConfig.pipeline.stages.length} stage(s)…`,
      ]);

      const result = await executeAutoPipeline(phaseConfig, message, ctx);
      if (result) {
        results.push(result);

        // Stop early if phase failed
        if (result.result.status === "failed") {
          ctx.ui.notify(`${phaseConfig.label} phase failed — stopping pipeline`, "error");
          ctx.ui.setWidget("bmad", [
            `❌ Pipeline stopped: ${phaseConfig.label} phase failed`,
            "",
            `Completed phases: ${results.filter((r) => r.result.status === "completed").map((r) => r.phase.label).join(", ") || "none"}`,
            `Failed at: ${phaseConfig.label}`,
          ]);
          return;
        }
      }
    }

    // Show umbrella summary
    const completed = results.filter((r) => r.result.status === "completed").length;
    const partial = results.filter((r) => r.result.status === "partial").length;
    const totalStages = results.reduce((sum, r) => sum + r.result.completedStages.length, 0);
    const totalSkipped = results.reduce((sum, r) => sum + r.result.skippedStages.length, 0);

    ctx.ui.setWidget("bmad", [
      `📊 Auto Pipeline Complete (stopped after ${stopAfter})`,
      "",
      ...results.map((r) => {
        const icon = r.result.status === "completed" ? "✅" : r.result.status === "partial" ? "⚠️" : "❌";
        return `  ${icon} ${r.phase.icon} ${r.phase.label} — ${r.result.completedStages.filter((s) => s.status === "completed").length}/${r.phase.pipeline.stages.length} stages`;
      }),
      "",
      `Summary: ${completed} completed, ${partial} partial — ${totalStages} stages total, ${totalSkipped} skipped`,
    ]);

    ctx.ui.notify("BMAD auto pipeline completed", "info");
    return;
  }

  // Parse: first token = potential phase name, rest = user message
  const parts = trimmed.split(/\s+/);
  const firstToken = parts[0].toLowerCase();
  const restMessage = parts.slice(1).join(" ").trim();

  // Check if first token is a known phase name
  const matchingPhase = ALL_PHASES.find(
    (p) => p.pipeline.id === firstToken,
  );

  if (matchingPhase && restMessage) {
    // Single-phase mode: delegate to per-phase handler
    await executeAutoPipeline(matchingPhase, restMessage, ctx);
    return;
  }

  if (matchingPhase && !restMessage) {
    // Phase specified but no message — show that phase's help
    await executeAutoPipeline(matchingPhase, "", ctx);
    return;
  }

  // No phase recognized — umbrella mode: run all 4 phases with full args as message
  const userMessage = trimmed;

  ctx.ui.notify("Starting BMAD auto pipeline (all phases)…", "info");
  ctx.ui.setWidget("bmad", [
    "🚀 Starting BMAD Auto Pipeline — All Phases",
    "",
    `Phases: ${ALL_PHASES.map((p) => p.label).join(" → ")}`,
    `Message: ${userMessage}`,
  ]);

  const results: PhaseResult[] = [];
  for (let i = 0; i < ALL_PHASES.length; i++) {
    const phaseConfig = ALL_PHASES[i];

    // Report phase transition
    ctx.ui.setWidget("bmad", [
      `🔄 Phase ${i + 1}/${ALL_PHASES.length}: ${phaseConfig.icon} ${phaseConfig.label}`,
      "",
      `Running ${phaseConfig.pipeline.stages.length} stage(s)…`,
    ]);

    const result = await executeAutoPipeline(phaseConfig, userMessage, ctx);
    if (result) {
      results.push(result);

      // Stop early if phase failed
      if (result.result.status === "failed") {
        ctx.ui.notify(`${phaseConfig.label} phase failed — stopping pipeline`, "error");
        ctx.ui.setWidget("bmad", [
          `❌ Pipeline stopped: ${phaseConfig.label} phase failed`,
          "",
          `Completed phases: ${results.filter((r) => r.result.status === "completed").map((r) => r.phase.label).join(", ") || "none"}`,
          `Failed at: ${phaseConfig.label}`,
        ]);
        return;
      }
    }
  }

  // Show umbrella summary
  const completed = results.filter((r) => r.result.status === "completed").length;
  const partial = results.filter((r) => r.result.status === "partial").length;
  const totalStages = results.reduce((sum, r) => sum + r.result.completedStages.length, 0);
  const totalSkipped = results.reduce((sum, r) => sum + r.result.skippedStages.length, 0);

  ctx.ui.setWidget("bmad", [
    "📊 BMAD Auto Pipeline — Complete",
    "",
    ...results.map((r) => {
      const icon = r.result.status === "completed" ? "✅" : r.result.status === "partial" ? "⚠️" : "❌";
      return `  ${icon} ${r.phase.icon} ${r.phase.label} — ${r.result.completedStages.filter((s) => s.status === "completed").length}/${r.phase.pipeline.stages.length} stages`;
    }),
    "",
    `Summary: ${completed} completed, ${partial} partial — ${totalStages} stages total, ${totalSkipped} skipped`,
  ]);

  ctx.ui.notify("BMAD auto pipeline completed", "info");
}

// ─── Registration ──────────────────────────────────────────────────────────

/**
 * Register all /bmad slash commands with the pi extension system.
 */
export function registerBmadCommands(pi: ExtensionAPI): void {
  pi.registerCommand("bmad", {
    description: "Delegate to a BMAD agent (use 'list' to see available agents)",
    handler: handleBmadDelegate,
  });

  pi.registerCommand("bmad list", {
    description: "List available BMAD agents grouped by module",
    handler: handleBmadList,
  });

  pi.registerCommand("bmad run", {
    description: "Execute a BMAD skill in a new session",
    handler: handleBmadRun,
  });

  pi.registerCommand("bmad skills", {
    description: "List available BMAD skills (non-agent)",
    handler: handleBmadSkills,
  });

  pi.registerCommand("bmad auto-analysis", {
    description: "Run Phase 1 analysis pipeline (research → brief → prfaq → document-project)",
    handler: handleBmadAutoAnalysis,
  });

  pi.registerCommand("bmad auto-planning", {
    description: "Run Phase 2 planning pipeline (create-prd → create-ux-design)",
    handler: handleBmadAutoPlanning,
  });

  pi.registerCommand("bmad auto-solutioning", {
    description: "Run Phase 3 solutioning pipeline (create-architecture → create-epics-and-stories → check-implementation-readiness)",
    handler: handleBmadAutoSolutioning,
  });

  pi.registerCommand("bmad auto-implementation", {
    description: "Run Phase 4 implementation pipeline (sprint-planning → create-story → dev-story → code-review)",
    handler: handleBmadAutoImplementation,
  });

  pi.registerCommand("bmad auto", {
    description: "Run BMAD auto pipeline (all phases, single phase, or --stop-after <phase>)",
    handler: handleBmadAuto,
  });
}

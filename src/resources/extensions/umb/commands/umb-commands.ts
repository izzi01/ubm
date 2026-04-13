/**
 * /umb slash commands.
 *
 * User-facing commands for the Umbrella Blade model configuration system:
 * - /umb model — Display resolved model configuration
 * - /umb — Usage hint pointing to subcommands
 *
 * Commands use ctx.ui.notify() and ctx.ui.setWidget() for output,
 * consistent with the existing /bmad command pattern.
 */

import type { ExtensionAPI, ExtensionCommandContext } from "@gsd/pi-coding-agent";
import { loadModelConfig } from "../model-config/index.js";

// ─── Command handlers ──────────────────────────────────────────────────────

/**
 * /umb model — Display the resolved model configuration.
 *
 * Reads .umb/models.yaml, merges tier defaults, validates agent names,
 * and formats the result as a widget table.
 */
export async function handleUmbModel(
  _args: string,
  ctx: ExtensionCommandContext,
): Promise<void> {
  const result = loadModelConfig(ctx.cwd);

  // Errors from file I/O or parsing
  if (result.errors.length > 0) {
    ctx.ui.notify("Failed to load model configuration", "error");
    const lines = ["❌ Model Configuration Errors\n"];
    for (const err of result.errors) {
      lines.push(`  ${err}`);
    }
    ctx.ui.setWidget("umb-model", lines);
    return;
  }

  // No config file found
  if (!result.config) {
    ctx.ui.notify("No model configuration found", "warning");
    ctx.ui.setWidget("umb-model", [
      "🔧 Model Configuration",
      "",
      "No .umb/models.yaml found. Create one with tier: budget|standard|premium",
      "",
      "Example:",
      "  tier: standard",
    ]);
    return;
  }

  const config = result.config;
  const lines: string[] = [];

  // Header with tier badge
  const tierBadge = config.tier ? ` [${config.tier}]` : "";
  lines.push(`🔧 Model Configuration${tierBadge}`);
  lines.push("");

  // Table: agent → model (with source indicator)
  if (config.assignments.length > 0) {
    for (const assignment of config.assignments) {
      const sourceIcon = assignment.source === "user" ? "✏️" : "📦";
      lines.push(`  ${sourceIcon} ${assignment.agent} → ${assignment.model}`);
    }
    lines.push("");
    lines.push(`${config.assignments.length} agent(s) configured`);
  } else {
    lines.push("  No model assignments found");
  }

  // Warnings
  if (result.warnings.length > 0) {
    lines.push("");
    for (const warning of result.warnings) {
      lines.push(`⚠️  ${warning}`);
    }
    ctx.ui.notify(
      `${result.warnings.length} warning(s) in model config`,
      "warning",
    );
  } else {
    ctx.ui.notify(
      `Model config loaded: ${config.assignments.length} agent(s)`,
      "info",
    );
  }

  ctx.ui.setWidget("umb-model", lines);
}

/**
 * /umb — Usage hint for the /umb command namespace.
 */
export async function handleUmbHelp(
  _args: string,
  ctx: ExtensionCommandContext,
): Promise<void> {
  ctx.ui.setWidget("umb", [
    "🔧 Umbrella Blade Commands",
    "",
    "  /umb model — Show model configuration",
  ]);
}

// ─── Registration ──────────────────────────────────────────────────────────

/**
 * Register all /umb slash commands with the pi extension system.
 */
export function registerUmbCommands(pi: ExtensionAPI): void {
  pi.registerCommand("umb model", {
    description: "Display the resolved model configuration from .umb/models.yaml",
    handler: handleUmbModel,
  });

  pi.registerCommand("umb", {
    description: "Umbrella Blade commands (use 'model' to show model config)",
    handler: handleUmbHelp,
  });
}

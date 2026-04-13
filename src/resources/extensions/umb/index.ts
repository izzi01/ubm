/**
 * Extension entry point for the iz-to-mo-vu pi-mono extension.
 *
 * Instantiates the GSD engine (DB + state machine + gate manager)
 * on load so downstream slices can import and use it.
 * Tool/command registration is deferred to S03.
 */

import type { ExtensionAPI } from "@gsd/pi-coding-agent";
import { createGsdEngine } from "./state-machine/index.js";
import type { GsdEngine } from "./state-machine/index.js";
import { registerGsdCommands } from "./commands/gsd-commands.js";
import { registerBmadCommands } from "./commands/bmad-commands.js";
import { registerUmbCommands } from "./commands/umb-commands.js";
import { registerDiscoveryCommands } from "./commands/discovery-commands.js";
import { registerSkillCommands } from "./commands/skill-commands.js";
import { createImportHandler } from "./import/gsd-import.js";
import { scanPatterns } from "./patterns/context-scout.js";
import type { PatternIndex } from "./patterns/context-scout.js";
import { renderGsdDashboard } from "./dashboard/gsd-dashboard.js";

/**
 * Module-scoped engine instance.
 * Created when the extension loads; used for tool/command registration.
 */
let engine: GsdEngine | null = null;

/**
 * Module-scoped pattern index.
 * Populated on load via ContextScout.
 */
let patternIndex: PatternIndex | null = null;

/**
 * Get the GSD engine instance.
 * Throws if called before the extension has loaded.
 */
export function getGsdEngine(): GsdEngine {
  if (!engine) {
    throw new Error(
      "GSD engine not initialized. The extension must load before calling getGsdEngine().",
    );
  }
  return engine;
}

/**
 * Get the pattern index produced by ContextScout.
 * Returns null if called before the extension has loaded.
 */
export function getPatternIndex(): PatternIndex | null {
  return patternIndex;
}

export default async function registerExtension(pi: ExtensionAPI): Promise<void> {
  // Instantiate the GSD engine with the default DB path.
  engine = createGsdEngine(".gsd/gsd.db");

  // GSD CRUD/state-machine tools are registered by the gsd extension — no duplicates here.

  // Register /gsd and /bmad slash commands.
  registerGsdCommands(pi);
  registerBmadCommands(pi);
  registerUmbCommands(pi);
  registerDiscoveryCommands(pi);
  registerSkillCommands(pi);

  // Register /gsd import command.
  const importHandlers = createImportHandler(engine);
  pi.registerCommand("gsd import", {
    description: "Import BMAD PRD requirements into GSD database",
    handler: importHandlers.handleGsdImport,
  });

  // Scan patterns and agents via ContextScout.
  patternIndex = scanPatterns(process.cwd());

  // Register the GSD dashboard widget with auto-refresh.
  pi.on("session_start", (_event, ctx) => {
    if (engine) {
      ctx.ui.setWidget("gsd-dashboard", renderGsdDashboard(engine));
    }
  });

  pi.on("tool_result", (event, ctx) => {
    if (
      engine &&
      "toolName" in event &&
      typeof event.toolName === "string" &&
      event.toolName.startsWith("gsd_")
    ) {
      ctx.ui.setWidget("gsd-dashboard", renderGsdDashboard(engine));
    }
  });
}

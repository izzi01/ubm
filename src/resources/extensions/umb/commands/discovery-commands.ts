/**
 * /bmad discovery command handlers.
 *
 * User-facing commands for BMAD agent delegation with automatic model resolution:
 * - /bmad research <topic> — Delegate research to the analyst agent
 * - /bmad brief <topic> — Delegate brief creation to the PM agent
 * - /bmad prd <topic> — Delegate PRD creation to the PM agent
 * - /bmad arch <topic> — Delegate architecture design to the architect agent
 *
 * Each command:
 * 1. Resolves the agent → model mapping from .umb/models.yaml
 * 2. Validates the model exists in the pi model registry
 * 3. Creates a new session with the correct model and agent prompt
 * 4. Shows a widget with delegation details
 */

import type { ExtensionAPI, ExtensionCommandContext } from '@gsd/pi-coding-agent';
import {
  resolveDiscovery,
  VALID_DISCOVERY_COMMANDS,
} from './discovery-types.js';
import type { DiscoveryCommand, ResolvedDiscovery } from './discovery-types.js';

// ─── Topic Parsing ─────────────────────────────────────────────────────────

/**
 * Parse topic from command arguments.
 *
 * Accepts either a quoted string (first argument) or the remainder of args.
 * Strips leading/trailing quotes from the first argument if present.
 */
function parseTopic(args: string): string {
  const trimmed = args.trim();
  if (!trimmed) return '';

  // If the entire args is a quoted string, unquote it
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }

  // Otherwise, use the full args as the topic
  return trimmed;
}

// ─── Widget Rendering ──────────────────────────────────────────────────────

/**
 * Render a success widget showing delegation details.
 */
function renderSuccessWidget(resolved: ResolvedDiscovery): string[] {
  const lines: string[] = [
    `🎭 ${resolved.type.label}`,
    '',
    `Agent: ${resolved.type.agent}`,
    `Model: ${resolved.modelString ?? 'not configured'}`,
    `Topic: ${resolved.topic}`,
    `Output: ${resolved.outputPath}`,
    '',
    'Session started — agent is processing your request.',
  ];

  if (resolved.warnings.length > 0) {
    lines.push('');
    for (const w of resolved.warnings) {
      lines.push(`⚠️  ${w}`);
    }
  }

  return lines;
}

/**
 * Render an error widget for missing model configuration.
 */
function renderNoModelError(resolved: ResolvedDiscovery): string[] {
  return [
    `❌ No model configured for "${resolved.type.agent}"`,
    '',
    `The ${resolved.type.label} command requires a model assignment for the "${resolved.type.agent}" agent.`,
    '',
    'To fix this, create or update .umb/models.yaml:',
    '',
    '  agents:',
    `    ${resolved.type.agent}: openai/gpt-5.2-codex`,
    '',
    'Or use a tier preset:',
    '',
    '  tier: standard',
    '',
  ];
}

/**
 * Render an error widget for model not found in registry.
 */
function renderModelNotFoundWidget(
  resolved: ResolvedDiscovery,
): string[] {
  return [
    `❌ Model not available: ${resolved.modelString}`,
    '',
    `The configured model "${resolved.modelString}" for agent "${resolved.type.agent}" was not found in the pi model registry.`,
    '',
    'Possible causes:',
    '  • API key not set for the provider',
    '  • Model ID is incorrect or deprecated',
    '',
    'Check your model configuration with /umb model',
  ];
}

// ─── Shared Handler ────────────────────────────────────────────────────────

/**
 * Shared handler for all /bmad discovery commands.
 *
 * Resolves the command type → agent → model, validates the model
 * in the pi registry, and creates a new session with the agent prompt.
 */
export async function handleBmadDiscovery(
  commandType: DiscoveryCommand,
  args: string,
  ctx: ExtensionCommandContext,
): Promise<void> {
  const topic = parseTopic(args);

  if (!topic) {
    ctx.ui.notify(
      `Usage: /bmad ${commandType} <topic>`,
      'warning',
    );
    ctx.ui.setWidget('bmad-discovery', [
      `❓ Specify a topic for the ${commandType} command.`,
      '',
      `Usage: /bmad ${commandType} <topic>`,
      '',
      'Example:',
      `  /bmad ${commandType} OAuth providers`,
    ]);
    return;
  }

  // Resolve the discovery context (agent, model, prompt, output path)
  let resolved: ResolvedDiscovery;
  try {
    resolved = resolveDiscovery(commandType, topic, ctx.cwd);
  } catch (err) {
    ctx.ui.notify(`Failed to resolve ${commandType} command`, 'error');
    ctx.ui.setWidget('bmad-discovery', [
      `❌ Error: ${(err as Error).message}`,
    ]);
    return;
  }

  // Check if a model was resolved
  if (!resolved.modelString || !resolved.parsedModel) {
    ctx.ui.notify(
      `No model configured for agent "${resolved.type.agent}"`,
      'error',
    );
    ctx.ui.setWidget('bmad-discovery', renderNoModelError(resolved));
    return;
  }

  const { provider, modelId } = resolved.parsedModel;

  // Validate the model exists in the pi model registry
  const model = ctx.modelRegistry.find(provider, modelId);
  if (!model) {
    ctx.ui.notify(
      `Model "${resolved.modelString}" not found in registry`,
      'error',
    );
    ctx.ui.setWidget('bmad-discovery', renderModelNotFoundWidget(resolved));
    return;
  }

  // Create a new session with the correct model and agent prompt
  try {
    const result = await ctx.newSession({
      setup: async (sm) => {
        sm.appendModelChange(provider, modelId);
        sm.appendSessionInfo(`${commandType}: ${topic}`);
        sm.appendMessage({
          role: 'user',
          content: resolved.prompt,
          timestamp: Date.now(),
        });
      },
    });

    if (result.cancelled) {
      ctx.ui.notify('Session creation cancelled', 'warning');
      ctx.ui.setWidget('bmad-discovery', [
        '⚠️ Session creation was cancelled.',
      ]);
      return;
    }

    // Success — show delegation details
    ctx.ui.notify(
      `${resolved.type.label} session started with ${resolved.modelString}`,
      'info',
    );
    ctx.ui.setWidget('bmad-discovery', renderSuccessWidget(resolved));
  } catch (err) {
    ctx.ui.notify('Failed to start session', 'error');
    ctx.ui.setWidget('bmad-discovery', [
      `❌ Failed to start session: ${(err as Error).message}`,
    ]);
  }
}

// ─── Thin Wrappers ─────────────────────────────────────────────────────────

/** /bmad research <topic> — Delegate research to the analyst agent. */
export async function handleBmadResearch(
  args: string,
  ctx: ExtensionCommandContext,
): Promise<void> {
  return handleBmadDiscovery('research', args, ctx);
}

/** /bmad brief <topic> — Delegate brief creation to the PM agent. */
export async function handleBmadBrief(
  args: string,
  ctx: ExtensionCommandContext,
): Promise<void> {
  return handleBmadDiscovery('brief', args, ctx);
}

/** /bmad prd <topic> — Delegate PRD creation to the PM agent. */
export async function handleBmadPrd(
  args: string,
  ctx: ExtensionCommandContext,
): Promise<void> {
  return handleBmadDiscovery('prd', args, ctx);
}

/** /bmad arch <topic> — Delegate architecture design to the architect agent. */
export async function handleBmadArch(
  args: string,
  ctx: ExtensionCommandContext,
): Promise<void> {
  return handleBmadDiscovery('arch', args, ctx);
}

// ─── Registration ──────────────────────────────────────────────────────────

/**
 * Register all /bmad discovery slash commands with the pi extension system.
 *
 * Registers:
 * - /bmad research <topic>
 * - /bmad brief <topic>
 * - /bmad prd <topic>
 * - /bmad arch <topic>
 */
export function registerDiscoveryCommands(pi: ExtensionAPI): void {
  const commands: Array<{
    name: string;
    handler: (args: string, ctx: ExtensionCommandContext) => Promise<void>;
    description: string;
  }> = [
    {
      name: 'bmad research',
      handler: handleBmadResearch,
      description: 'Delegate research analysis to the BMAD analyst agent',
    },
    {
      name: 'bmad brief',
      handler: handleBmadBrief,
      description: 'Delegate product brief creation to the BMAD PM agent',
    },
    {
      name: 'bmad prd',
      handler: handleBmadPrd,
      description: 'Delegate PRD creation to the BMAD PM agent',
    },
    {
      name: 'bmad arch',
      handler: handleBmadArch,
      description: 'Delegate architecture design to the BMAD architect agent',
    },
  ];

  for (const cmd of commands) {
    pi.registerCommand(cmd.name, {
      description: cmd.description,
      handler: cmd.handler,
    });
  }
}

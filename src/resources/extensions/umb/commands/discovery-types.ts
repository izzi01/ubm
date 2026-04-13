/**
 * BMAD Discovery Command Types and Agent Mapping Layer
 *
 * Provides the data/configuration layer for /bmad research, /bmad brief,
 * /bmad prd, and /bmad arch commands. Each command maps to a BMAD agent,
 * a prompt template, and an output file prefix.
 *
 * Pure logic — no pi SDK dependencies beyond types.
 */

import { mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { loadModelConfig } from '../model-config/loader.js';

// ─── Types ─────────────────────────────────────────────────────────────────

/** Supported discovery command names. */
export type DiscoveryCommand = 'research' | 'brief' | 'prd' | 'arch';

/**
 * A discovery type definition mapping a command to its BMAD agent,
 * default prompt template, and output file prefix.
 */
export interface DiscoveryType {
  /** The slash command name (e.g. 'research'). */
  command: DiscoveryCommand;
  /** The BMAD agent key to delegate to (e.g. 'analyst'). */
  agent: string;
  /** Output file prefix for the saved artifact. */
  outputPrefix: string;
  /** Human-readable label for session naming and display. */
  label: string;
}

/**
 * Parsed model string components.
 *
 * 'openai/gpt-5.2-codex' → { provider: 'openai', modelId: 'gpt-5.2-codex' }
 */
export interface ParsedModel {
  /** The provider prefix (e.g. 'openai', 'anthropic', 'google'). */
  provider: string;
  /** The model identifier (e.g. 'gpt-5.2-codex', 'claude-sonnet-4-5'). */
  modelId: string;
}

/**
 * Fully resolved discovery context — everything a command handler needs
 * to delegate to the correct BMAD agent with the right model and prompt.
 */
export interface ResolvedDiscovery {
  /** The discovery type definition. */
  type: DiscoveryType;
  /** The user-provided topic string. */
  topic: string;
  /** The raw model string from .umb/models.yaml (e.g. 'openai/gpt-5.2-codex'). */
  modelString: string | null;
  /** Parsed model components (null if no model string). */
  parsedModel: ParsedModel | null;
  /** The full prompt text to send to the agent. */
  prompt: string;
  /** Absolute path for the output file. */
  outputPath: string;
  /** Warnings collected during resolution (e.g. unknown agent, no config). */
  warnings: string[];
}

// ─── Discovery Type Registry ───────────────────────────────────────────────

/**
 * Prompt templates for each discovery command.
 * {topic} is replaced with the user-provided topic string.
 */
const PROMPT_TEMPLATES: Record<DiscoveryCommand, string> = {
  research:
    'Conduct a deep research analysis on the following topic. ' +
    'Identify key findings, patterns, risks, and opportunities. ' +
    'Structure the output with clear sections and actionable insights.\n\n' +
    'Topic: {topic}',
  brief:
    'Create a product brief for the following topic or product idea. ' +
    'Include problem statement, target audience, key features, success metrics, ' +
    'and competitive landscape.\n\n' +
    'Topic: {topic}',
  prd:
    'Create a detailed Product Requirements Document (PRD) for the following. ' +
    'Include objectives, user stories with acceptance criteria, functional requirements, ' +
    'non-functional requirements, and milestones.\n\n' +
    'Topic: {topic}',
  arch:
    'Design the system architecture for the following. ' +
    'Include component diagram, data flow, technology choices with rationale, ' +
    'API design, and deployment considerations.\n\n' +
    'Topic: {topic}',
};

/**
 * Registry of all discovery types, mapping each command to its agent and metadata.
 */
export const DISCOVERY_TYPES: ReadonlyMap<DiscoveryCommand, DiscoveryType> = new Map([
  [
    'research',
    {
      command: 'research',
      agent: 'analyst',
      outputPrefix: 'research',
      label: 'Research Analysis',
    },
  ],
  [
    'brief',
    {
      command: 'brief',
      agent: 'pm',
      outputPrefix: 'brief',
      label: 'Product Brief',
    },
  ],
  [
    'prd',
    {
      command: 'prd',
      agent: 'pm',
      outputPrefix: 'prd',
      label: 'Product Requirements Document',
    },
  ],
  [
    'arch',
    {
      command: 'arch',
      agent: 'architect',
      outputPrefix: 'arch',
      label: 'System Architecture',
    },
  ],
]);

/** All valid discovery command names, for validation. */
export const VALID_DISCOVERY_COMMANDS: readonly DiscoveryCommand[] = [
  'research',
  'brief',
  'prd',
  'arch',
] as const;

// ─── Model String Parsing ──────────────────────────────────────────────────

/**
 * Parse a model string into provider and modelId components.
 *
 * The first slash is the separator:
 * - 'openai/gpt-5.2-codex' → { provider: 'openai', modelId: 'gpt-5.2-codex' }
 * - 'zhipuai-coding-plan/glm-4.7' → { provider: 'zhipuai-coding-plan', modelId: 'glm-4.7' }
 * - 'anthropic/claude-opus-4-5' → { provider: 'anthropic', modelId: 'claude-opus-4-5' }
 *
 * Edge cases:
 * - No slash: the entire string is the modelId, provider is empty string
 * - Multiple slashes: only the first slash separates provider from modelId
 * - Empty string: returns empty provider and modelId
 *
 * @param modelString - The raw model string (e.g. 'openai/gpt-5.2-codex')
 * @returns Parsed model components
 */
export function parseModelString(modelString: string): ParsedModel {
  if (!modelString) {
    return { provider: '', modelId: '' };
  }

  const slashIndex = modelString.indexOf('/');
  if (slashIndex === -1) {
    return { provider: '', modelId: modelString };
  }

  return {
    provider: modelString.slice(0, slashIndex),
    modelId: modelString.slice(slashIndex + 1),
  };
}

// ─── Output Directory Helper ───────────────────────────────────────────────

/** Default output directory relative to cwd. */
const OUTPUT_DIR = '_bmad-output/planning-artifacts';

/**
 * Ensure the output directory exists, creating it if necessary.
 *
 * @param cwd - The working directory
 * @returns The absolute path to the output directory
 */
export function ensureOutputDir(cwd: string): string {
  const dir = join(cwd, OUTPUT_DIR);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

// ─── Discovery Resolver ────────────────────────────────────────────────────

/**
 * Sanitize a topic string for use as a filename component.
 *
 * Strips or replaces characters that are unsafe in filenames,
 * preserving readability.
 */
function sanitizeTopicForFilename(topic: string): string {
  return topic
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

/**
 * Resolve a discovery command into its full execution context.
 *
 * Takes a discovery command type and topic, then:
 * 1. Looks up the DiscoveryType definition
 * 2. Loads the model config from .umb/models.yaml
 * 3. Finds the model assignment for the target agent
 * 4. Builds the prompt from the template
 * 5. Computes the output file path
 *
 * @param command - The discovery command name
 * @param topic - The user-provided topic string
 * @param cwd - The working directory (for config lookup and output)
 * @returns ResolvedDiscovery with all information needed for delegation
 */
export function resolveDiscovery(
  command: DiscoveryCommand,
  topic: string,
  cwd: string,
): ResolvedDiscovery {
  const warnings: string[] = [];

  // 1. Look up the discovery type
  const discoveryType = DISCOVERY_TYPES.get(command);
  if (!discoveryType) {
    throw new Error(`Unknown discovery command: ${command}`);
  }

  // 2. Load model config
  const loadResult = loadModelConfig(cwd);
  warnings.push(...loadResult.warnings);

  // 3. Find the model for the target agent
  let modelString: string | null = null;
  if (loadResult.config) {
    const assignment = loadResult.config.assignments.find(
      (a) => a.agent === discoveryType.agent,
    );
    if (assignment) {
      modelString = assignment.model;
    } else {
      warnings.push(
        `No model assigned to agent "${discoveryType.agent}" in .umb/models.yaml. ` +
          `Add an entry for "${discoveryType.agent}" or set a tier preset.`,
      );
    }
  } else {
    warnings.push(
      'No model configuration found. Create .umb/models.yaml with agent model assignments.',
    );
  }

  // 4. Build prompt
  const template = PROMPT_TEMPLATES[command];
  const prompt = template.replace('{topic}', topic);

  // 5. Compute output path
  const outputDir = ensureOutputDir(cwd);
  const sanitizedTopic = sanitizeTopicForFilename(topic) || 'untitled';
  const outputPath = join(outputDir, `${discoveryType.outputPrefix}-${sanitizedTopic}.md`);

  // 6. Parse model string
  const parsedModel = modelString ? parseModelString(modelString) : null;

  return {
    type: discoveryType,
    topic,
    modelString,
    parsedModel,
    prompt,
    outputPath,
    warnings,
  };
}

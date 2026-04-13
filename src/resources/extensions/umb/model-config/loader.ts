/**
 * Model Configuration Loader
 *
 * Reads .umb/models.yaml, merges tier presets, validates agent names,
 * and returns a fully resolved ValidatedModelConfig.
 *
 * Uses a simple line-based YAML parser — no external dependencies.
 * The config format is deliberately flat:
 *
 * ```yaml
 * tier: standard
 * agents:
 *   dev: google/antigravity-gemini-3-pro
 *   pm: openai/gpt-5.2-codex
 * ```
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { ModelConfig, ValidatedModelConfig, LoadResult, TierPreset } from './types.js';
import { TIER_PRESETS, VALID_TIERS } from './tier-presets.js';

/** Known BMAD agents discovered from _bmad/ agent manifests. */
const KNOWN_AGENTS = new Set([
  // BMM agents
  'analyst',
  'architect',
  'dev',
  'pm',
  'quick-flow-solo-dev',
  'sm',
  'tea',
  'tech-writer',
  'ux-designer',
  // CIS agents
  'brainstorming-coach',
  'content-pipeline-orchestrator',
  'creative-problem-solver',
  'design-thinking-coach',
  'innovation-strategist',
  'presentation-master',
  'storyteller',
  // BMB agents
  'agent-builder',
  'module-builder',
  'workflow-builder',
  // Core agents
  'bmad-master',
]);

const CONFIG_FILENAME = '.umb/models.yaml';

/**
 * Parse a simple YAML structure into a ModelConfig.
 *
 * Handles:
 * - `tier: value` (top-level scalar)
 * - `agents:` block with indented `key: value` pairs
 * - Comments (lines starting with #)
 * - Blank lines
 *
 * Does NOT handle nested structures, arrays, or multi-line strings.
 * This is intentional — the config format is deliberately simple.
 */
export function parseSimpleYaml(content: string): ModelConfig | null {
  const config: ModelConfig = {};
  const lines = content.split('\n');
  let inAgents = false;
  let inSkills = false;

  for (const rawLine of lines) {
    // Strip comments (but not # inside quoted strings — we don't have those)
    const line = rawLine.replace(/#.*$/, '').trimEnd();
    if (!line.trim()) continue;

    // Detect agents block start
    if (/^agents\s*:/.test(line)) {
      inAgents = true;
      inSkills = false;
      config.agents = config.agents ?? {};
      continue;
    }

    // Detect skills block start
    if (/^skills\s*:/.test(line)) {
      inSkills = true;
      inAgents = false;
      config.skills = config.skills ?? {};
      continue;
    }

    // If we're in a block, check if a new top-level key ends it
    if ((inAgents || inSkills) && !line.startsWith(' ') && !line.startsWith('\t')) {
      inAgents = false;
      inSkills = false;
    }

    if (inAgents) {
      // Parse indented key: value pair
      const match = line.match(/^\s+(\S+)\s*:\s*(.+)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim();
        if (value) {
          config.agents![key] = value;
        }
      }
      continue;
    }

    if (inSkills) {
      // Parse indented key: value pair (same format as agents)
      const match = line.match(/^\s+(\S+)\s*:\s*(.+)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim();
        if (value) {
          config.skills![key] = value;
        }
      }
      continue;
    }

    // Parse top-level tier
    const tierMatch = line.match(/^tier\s*:\s*(.+)$/);
    if (tierMatch) {
      const val = tierMatch[1].trim().toLowerCase();
      if (VALID_TIERS.includes(val as TierPreset)) {
        config.tier = val as TierPreset;
      }
      // If tier value is invalid, we ignore it (will be caught by validation)
    }
  }

  // If nothing was parsed, return null
  if (
    config.tier === undefined &&
    (!config.agents || Object.keys(config.agents).length === 0) &&
    (!config.skills || Object.keys(config.skills).length === 0)
  ) {
    return null;
  }

  return config;
}

/**
 * Load and validate the model configuration from .umb/models.yaml.
 *
 * @param cwd - The working directory to look for .umb/models.yaml in
 * @returns LoadResult with validated config, warnings, and errors
 */
export function loadModelConfig(cwd: string): LoadResult {
  const configPath = join(cwd, CONFIG_FILENAME);

  // If file doesn't exist, return null config
  if (!existsSync(configPath)) {
    return {
      config: null,
      warnings: [],
      errors: [],
    };
  }

  // Read file content
  let content: string;
  try {
    content = readFileSync(configPath, 'utf-8');
  } catch (err) {
    return {
      config: null,
      warnings: [],
      errors: [`Failed to read ${CONFIG_FILENAME}: ${(err as Error).message}`],
    };
  }

  // Empty file
  if (!content.trim()) {
    return {
      config: null,
      warnings: ['No model assignments found'],
      errors: [],
    };
  }

  // Parse YAML
  let raw: ModelConfig | null;
  try {
    raw = parseSimpleYaml(content);
  } catch (err) {
    return {
      config: null,
      warnings: [],
      errors: [`Failed to parse ${CONFIG_FILENAME}: ${(err as Error).message}`],
    };
  }

  // File exists but nothing parseable
  if (!raw) {
    return {
      config: null,
      warnings: ['No model assignments found'],
      errors: [],
    };
  }

  const warnings: string[] = [];
  const errors: string[] = [];
  const tier = raw.tier ?? null;

  // Start with tier defaults if a tier is specified
  let mergedAgents: Record<string, string> = {};
  if (tier && TIER_PRESETS[tier]) {
    mergedAgents = { ...TIER_PRESETS[tier] };
  }

  // Apply user overrides (user wins over tier defaults)
  if (raw.agents) {
    for (const [agent, model] of Object.entries(raw.agents)) {
      if (!model || typeof model !== 'string') {
        warnings.push(`Agent "${agent}" has empty or invalid model assignment, skipping`);
        continue;
      }
      mergedAgents[agent] = model;
    }
  }

  // Build skill assignments (skills don't have tier defaults — always user-specified)
  const mergedSkills: Record<string, string> = {};
  if (raw.skills) {
    for (const [skill, model] of Object.entries(raw.skills)) {
      if (!model || typeof model !== 'string') {
        warnings.push(`Skill "${skill}" has empty or invalid model assignment, skipping`);
        continue;
      }
      mergedSkills[skill] = model;
    }
  }

  // No assignments after merging
  if (Object.keys(mergedAgents).length === 0 && Object.keys(mergedSkills).length === 0) {
    return {
      config: null,
      warnings: ['No model assignments found'],
      errors: [],
    };
  }

  // Validate agent names and add to assignments
  const assignments = [];
  for (const [agent, model] of Object.entries(mergedAgents)) {
    // Determine source
    const source = raw.agents?.[agent] !== undefined ? 'user' as const : 'tier' as const;

    // Check if agent is known
    if (!KNOWN_AGENTS.has(agent)) {
      warnings.push(`Agent "${agent}" is not a recognized BMAD agent`);
    }

    assignments.push({ agent, model, source });
  }

  // Add skill assignments (always user-specified, no tier defaults)
  for (const [skill, model] of Object.entries(mergedSkills)) {
    assignments.push({ agent: skill, model, source: 'user' as const });
  }

  // Sort assignments: user overrides first, then tier defaults
  assignments.sort((a, b) => {
    if (a.source === 'user' && b.source === 'tier') return -1;
    if (a.source === 'tier' && b.source === 'user') return 1;
    return a.agent.localeCompare(b.agent);
  });

  const config: ValidatedModelConfig = {
    tier,
    assignments,
    warnings,
  };

  return { config, warnings, errors };
}

// Re-export KNOWN_AGENTS for use in tests and other modules
export { KNOWN_AGENTS };

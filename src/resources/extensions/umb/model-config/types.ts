/**
 * Model Configuration Types
 *
 * Defines the schema for per-agent model assignments loaded from .umb/models.yaml.
 */

/** Supported tier presets for bulk model assignment. */
export type TierPreset = 'budget' | 'standard' | 'premium';

/**
 * Raw model configuration as parsed from .umb/models.yaml.
 *
 * ```yaml
 * tier: standard
 * agents:
 *   dev: google/antigravity-gemini-3-pro
 *   pm: openai/gpt-5.2-codex
 * ```
 */
export interface ModelConfig {
  /** Optional tier preset that provides default model assignments. */
  tier?: TierPreset;
  /** Explicit per-agent model assignments (user overrides). */
  agents?: Record<string, string>;
  /** Explicit per-skill model assignments (user overrides). */
  skills?: Record<string, string>;
}

/** A fully resolved model assignment for a single agent. */
export interface AgentModelAssignment {
  /** The agent key (e.g. 'dev', 'pm'). */
  agent: string;
  /** The model identifier string (e.g. 'google/antigravity-gemini-3-pro'). */
  model: string;
  /** Whether this assignment came from a tier preset vs explicit user config. */
  source: 'tier' | 'user';
}

/** Validated and fully resolved model configuration. */
export interface ValidatedModelConfig {
  /** The tier preset that was applied, if any. */
  tier: TierPreset | null;
  /** All resolved agent model assignments. */
  assignments: AgentModelAssignment[];
  /** Warnings collected during validation (e.g. unknown agents). */
  warnings: string[];
}

/** Result of loading a model config file. */
export interface LoadResult {
  /** The validated config, or null if no config file exists. */
  config: ValidatedModelConfig | null;
  /** Warnings collected during loading/validation. */
  warnings: string[];
  /** Hard errors (e.g. malformed YAML). */
  errors: string[];
}

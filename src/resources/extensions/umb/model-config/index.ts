/**
 * Model Configuration System
 *
 * Public API for the model config module.
 */

export type {
  TierPreset,
  ModelConfig,
  AgentModelAssignment,
  ValidatedModelConfig,
  LoadResult,
} from './types.js';

export { loadModelConfig, parseSimpleYaml, KNOWN_AGENTS } from './loader.js';

export { TIER_PRESETS, VALID_TIERS } from './tier-presets.js';

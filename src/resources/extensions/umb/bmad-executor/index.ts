/**
 * BMAD Executor
 *
 * Public API for the BMAD skill execution engine.
 * Handles skill discovery, loading, config resolution, and prompt composition.
 */

export type {
  BmadSkillInfo,
  BmadPromptFile,
  BmadAgentFile,
  BmadManifest,
  BmadCapability,
  BmadConfig,
  BmadExecutionPlan,
} from './types.js';

export {
  findBmadSkills,
  loadBmadSkill,
  resolveBmadConfig,
  composeExecutionPrompt,
} from './loader.js';

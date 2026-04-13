/**
 * BMAD Executor Types
 *
 * Defines the schema for BMAD skill discovery, loading, config resolution,
 * and prompt composition for skill execution.
 */

/**
 * A BMAD skill discovered from _bmad/bmm/ or _bmad/core/.
 */
export interface BmadSkillInfo {
  /** Skill name from SKILL.md frontmatter (e.g. 'bmad-product-brief'). */
  name: string;
  /** Skill description from frontmatter. */
  description: string;
  /** Absolute path to the skill directory. */
  path: string;
  /** Absolute path to the skill's SKILL.md file. */
  skillMdPath: string;
  /** Full text content of SKILL.md (body after frontmatter). */
  content: string;
  /** Raw frontmatter key-value pairs. */
  metadata: Record<string, string>;
  /** Stage prompt files found in prompts/ subdirectory. */
  prompts: BmadPromptFile[];
  /** Agent definition files found in agents/ subdirectory. */
  agents: BmadAgentFile[];
  /** Parsed bmad-manifest.json if present. */
  manifest?: BmadManifest;
  /** Which module the skill belongs to ('bmm', 'core', or undefined). */
  module?: string;
}

/**
 * A stage prompt file (prompts/*.md) inside a skill directory.
 */
export interface BmadPromptFile {
  /** Filename (e.g. 'contextual-discovery.md'). */
  name: string;
  /** Absolute path to the prompt file. */
  path: string;
  /** Full text content of the prompt file. */
  content: string;
}

/**
 * An agent definition file (agents/*.md) inside a skill directory.
 */
export interface BmadAgentFile {
  /** Filename (e.g. 'skeptic-reviewer.md'). */
  name: string;
  /** Absolute path to the agent file. */
  path: string;
  /** Full text content of the agent file. */
  content: string;
}

/**
 * Parsed bmad-manifest.json content.
 */
export interface BmadManifest {
  /** Module code (e.g. 'bmm'). */
  'module-code'?: string;
  /** Skill this replaces (if any). */
  'replaces-skill'?: string;
  /** Capability definitions. */
  capabilities?: BmadCapability[];
}

/**
 * A capability entry from bmad-manifest.json.
 */
export interface BmadCapability {
  name: string;
  'menu-code'?: string;
  description?: string;
  'supports-headless'?: boolean;
  'phase-name'?: string;
  after?: string[];
  before?: string[];
  'is-required'?: boolean;
  'output-location'?: string;
}

/**
 * Resolved BMAD config from config.yaml.
 */
export interface BmadConfig {
  /** All key-value pairs from config.yaml with template variables resolved. */
  values: Record<string, string>;
  /** Absolute path to the config.yaml that was loaded. */
  configPath: string;
}

/**
 * A fully composed execution plan ready for session creation.
 */
export interface BmadExecutionPlan {
  /** The loaded skill info. */
  skill: BmadSkillInfo;
  /** The resolved config. */
  config: BmadConfig;
  /** The user's message / task description. */
  userMessage: string;
  /** The fully composed prompt text to send to the session. */
  prompt: string;
}

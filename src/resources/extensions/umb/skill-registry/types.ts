/**
 * Skill Registry Types
 *
 * Defines the schema for skill metadata and validation results.
 */

/**
 * Metadata extracted from a skill's SKILL.md YAML frontmatter.
 */
export interface SkillMetadata {
  /** Skill name from frontmatter (may not match directory name — validator checks this). */
  name: string;
  /** Skill description from frontmatter. */
  description: string;
  /** Optional license identifier (e.g. 'Apache-2.0'). */
  license?: string;
  /** Any extra fields found in the frontmatter beyond the known ones. */
  metadata?: Record<string, string>;
  /** Absolute or relative path to the skill directory. */
  path: string;
  /** Absolute or relative path to the skill's SKILL.md file. */
  skillMdPath: string;
}

/**
 * Result of validating a skill against the Skills Spec.
 */
export interface SkillValidationResult {
  /** Whether the skill passes all required checks. */
  valid: boolean;
  /** Hard errors (missing required fields, invalid characters, name/path mismatch). */
  errors: string[];
  /** Soft warnings (non-standard but parseable). */
  warnings: string[];
}

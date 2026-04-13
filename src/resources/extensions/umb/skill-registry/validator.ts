/**
 * Skill Validator
 *
 * Validates skill metadata against the Agent Skills Spec.
 * Pure function — no I/O, no SDK dependency.
 */

import { basename } from 'node:path';
import type { SkillMetadata, SkillValidationResult } from './types.js';

/** Skills Spec naming rule: lowercase alphanumeric + hyphen only. */
const VALID_NAME_RE = /^[a-z0-9-]+$/;

/**
 * Validate a skill's metadata against the Skills Spec.
 *
 * Checks:
 * - `name` matches /^[a-z0-9-]+$/ (lowercase alphanumeric + hyphen)
 * - `description` is non-empty
 * - Directory name (last segment of `skill.path`) matches `skill.name`
 *
 * Returns `{ valid, errors[], warnings[] }` where:
 * - `valid` is true when there are zero hard errors
 * - `errors` are hard failures (missing required fields, invalid format)
 * - `warnings` are soft notices (non-standard but parseable)
 */
export function validateSkill(skill: SkillMetadata): SkillValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // --- Required field checks ---

  // Name must be non-empty
  if (!skill.name) {
    errors.push('Missing required field: name');
  } else {
    // Name must match lowercase alphanumeric + hyphen
    if (!VALID_NAME_RE.test(skill.name)) {
      errors.push(
        `Invalid name "${skill.name}" — must match /^[a-z0-9-]+$/ (lowercase alphanumeric + hyphen only)`,
      );
    }

    // Directory name must match skill name
    const dirName = basename(skill.path);
    if (dirName === '') {
      errors.push(`Cannot determine directory name from path "${skill.path}"`);
    } else if (dirName !== skill.name) {
      errors.push(
        `Name/path mismatch: name is "${skill.name}" but directory is "${dirName}"`,
      );
    }
  }

  // Description must be non-empty
  if (!skill.description || !skill.description.trim()) {
    errors.push('Missing required field: description');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

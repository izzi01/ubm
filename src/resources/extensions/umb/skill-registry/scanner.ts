/**
 * Skill Scanner
 *
 * Discovers and parses skill directories, extracting YAML frontmatter metadata
 * from SKILL.md files.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join, basename } from 'node:path';
import type { SkillMetadata } from './types.js';

/**
 * Parse YAML frontmatter from SKILL.md content.
 *
 * Extracts the block between the first two `---` delimiters, splits into
 * key: value pairs, and returns a SkillMetadata object. Returns null if
 * no frontmatter block is found.
 *
 * This is a simple regex-based parser — no YAML library dependency.
 * Handles quoted values (single and double) and strips surrounding quotes.
 */
export function parseSkillMd(
  content: string,
  skillMdPath: string,
): SkillMetadata | null {
  if (!content || !content.trim()) return null;

  // Match frontmatter between --- delimiters
  const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!frontmatterMatch) return null;

  const frontmatter = frontmatterMatch[1].trim();
  if (!frontmatter) return null;

  // Parse key: value pairs
  const raw: Record<string, string> = {};
  for (const line of frontmatter.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) continue;

    const key = trimmed.slice(0, colonIdx).trim();
    let value = trimmed.slice(colonIdx + 1).trim();

    // Strip surrounding quotes
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (key) raw[key] = value;
  }

  const name = raw['name'];
  // description is optional for parsing (validator will catch missing ones)
  const description = raw['description'] ?? '';

  if (!name) return null;

  // Separate known fields from extra metadata
  const knownKeys = new Set(['name', 'description', 'license']);
  const metadata: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (!knownKeys.has(k)) metadata[k] = v;
  }

  const path = join(skillMdPath, '..');

  return {
    name,
    description,
    ...(raw['license'] ? { license: raw['license'] } : {}),
    ...(Object.keys(metadata).length > 0 ? { metadata } : {}),
    path,
    skillMdPath,
  };
}

/**
 * Scan a directory for skill subdirectories.
 *
 * Reads all subdirectories of `basePath`, checks each for a SKILL.md file,
 * calls parseSkillMd() on its contents, and returns an array of all valid
 * SkillMetadata entries.
 *
 * - Directories without SKILL.md are silently skipped.
 * - Directories with SKILL.md but no parseable frontmatter emit a console.warn.
 * - Non-directory entries (files like README.md) are ignored.
 */
export function scanSkillDirs(basePath: string): SkillMetadata[] {
  const skills: SkillMetadata[] = [];

  let entries: string[];
  try {
    entries = readdirSync(basePath);
  } catch {
    console.warn(`scanSkillDirs: cannot read directory: ${basePath}`);
    return skills;
  }

  for (const entry of entries) {
    const entryPath = join(basePath, entry);
    const skillMdPath = join(entryPath, 'SKILL.md');

    // Skip non-directories (e.g. agent_skills_spec.md, README.md)
    let stat;
    try {
      stat = readdirSync(entryPath, { withFileTypes: true }) ? true : false;
    } catch {
      continue;
    }
    // Use a safer check — try to read SKILL.md
    let content: string;
    try {
      content = readFileSync(skillMdPath, 'utf-8');
    } catch {
      // No SKILL.md or not a directory — silently skip
      continue;
    }

    const parsed = parseSkillMd(content, skillMdPath);
    if (parsed) {
      // Override path with the actual directory name
      parsed.path = entryPath;
      skills.push(parsed);
    } else {
      console.warn(
        `scanSkillDirs: skipping "${entry}" — SKILL.md has no parseable frontmatter`,
      );
    }
  }

  return skills;
}

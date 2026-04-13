/**
 * BMAD Skill Loader
 *
 * Discovers, loads, and composes BMAD skills for execution.
 *
 * All functions are synchronous (consistent with the existing skill-registry pattern).
 * Uses simple regex-based YAML parsing — no YAML library dependency.
 */

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, basename, dirname } from 'node:path';
import type {
  BmadSkillInfo,
  BmadPromptFile,
  BmadAgentFile,
  BmadManifest,
  BmadConfig,
  BmadExecutionPlan,
} from './types.js';

// ─── YAML / Frontmatter Parsing ──────────────────────────────────────────

/**
 * Parse simple YAML frontmatter from markdown content.
 *
 * Extracts key: value pairs between the first two `---` delimiters.
 * Handles quoted values (single and double quotes). Returns an empty
 * object if no frontmatter block is found.
 */
function extractSimpleFrontmatter(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  if (!content.startsWith('---')) return result;

  const endIdx = content.indexOf('---', 3);
  if (endIdx === -1) return result;

  const yaml = content.substring(3, endIdx).trim();
  for (const line of yaml.split('\n')) {
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

    if (key) result[key] = value;
  }
  return result;
}

/**
 * Parse simple YAML key-value pairs (no frontmatter delimiters).
 *
 * Used for config.yaml files which don't have `---` delimiters.
 * Handles quoted values and comment lines.
 */
function parseSimpleYaml(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of content.split('\n')) {
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

    if (key) result[key] = value;
  }
  return result;
}

// ─── Skill Discovery ─────────────────────────────────────────────────────

/**
 * Scan a single base directory for skill subdirectories containing SKILL.md.
 *
 * Walks one level deep (base/{phase}/{skill}/) and collects skills
 * from each subdirectory that has a valid SKILL.md.
 */
function scanDirForSkills(basePath: string, module: string): BmadSkillInfo[] {
  const skills: BmadSkillInfo[] = [];

  let entries: string[];
  try {
    entries = readdirSync(basePath);
  } catch {
    return skills;
  }

  for (const entry of entries) {
    const entryPath = join(basePath, entry);
    const skillMdPath = join(entryPath, 'SKILL.md');

    let content: string;
    try {
      content = readFileSync(skillMdPath, 'utf-8');
    } catch {
      // Not a directory or no SKILL.md — check if it's a phase directory
      // (e.g. 1-analysis/) that contains skill subdirectories
      try {
        const subEntries = readdirSync(entryPath, { withFileTypes: true });
        for (const sub of subEntries) {
          if (!sub.isDirectory()) continue;
          const subSkillMd = join(entryPath, sub.name, 'SKILL.md');
          try {
            const subContent = readFileSync(subSkillMd, 'utf-8');
            const subPath = join(entryPath, sub.name);
            const parsed = buildSkillInfo(subContent, subSkillMd, subPath, module);
            if (parsed) skills.push(parsed);
          } catch {
            // Skip
          }
        }
      } catch {
        // Skip
      }
      continue;
    }

    const parsed = buildSkillInfo(content, skillMdPath, entryPath, module);
    if (parsed) skills.push(parsed);
  }

  return skills;
}

/**
 * Build a BmadSkillInfo from SKILL.md content.
 */
function buildSkillInfo(
  content: string,
  skillMdPath: string,
  skillDir: string,
  module: string,
): BmadSkillInfo | null {
  const frontmatter = extractSimpleFrontmatter(content);
  const name = frontmatter['name'];
  if (!name) return null;

  const description = frontmatter['description'] || '';
  const prompts = loadPromptFiles(skillDir);
  const agents = loadAgentFiles(skillDir);
  const manifest = loadManifest(skillDir);

  // Extract body content (everything after the frontmatter closing ---)
  const bodyMatch = content.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n([\s\S]*)$/);
  const bodyContent = bodyMatch ? bodyMatch[1] : content;

  // Separate known fields from extra metadata
  const knownKeys = new Set(['name', 'description']);
  const metadata: Record<string, string> = {};
  for (const [k, v] of Object.entries(frontmatter)) {
    if (!knownKeys.has(k)) metadata[k] = v;
  }

  return {
    name,
    description,
    path: skillDir,
    skillMdPath,
    content: bodyContent,
    metadata,
    prompts,
    agents,
    manifest,
    module,
  };
}

/**
 * Load all prompt files from a skill's prompts/ subdirectory.
 */
function loadPromptFiles(skillDir: string): BmadPromptFile[] {
  const promptsDir = join(skillDir, 'prompts');
  const files: BmadPromptFile[] = [];

  try {
    const entries = readdirSync(promptsDir);
    for (const entry of entries) {
      if (!entry.endsWith('.md')) continue;
      const filePath = join(promptsDir, entry);
      try {
        const content = readFileSync(filePath, 'utf-8');
        files.push({ name: entry, path: filePath, content });
      } catch {
        // Skip unreadable files
      }
    }
  } catch {
    // prompts/ directory doesn't exist — that's fine
  }

  return files;
}

/**
 * Load all agent definition files from a skill's agents/ subdirectory.
 */
function loadAgentFiles(skillDir: string): BmadAgentFile[] {
  const agentsDir = join(skillDir, 'agents');
  const files: BmadAgentFile[] = [];

  try {
    const entries = readdirSync(agentsDir);
    for (const entry of entries) {
      if (!entry.endsWith('.md')) continue;
      const filePath = join(agentsDir, entry);
      try {
        const content = readFileSync(filePath, 'utf-8');
        files.push({ name: entry, path: filePath, content });
      } catch {
        // Skip unreadable files
      }
    }
  } catch {
    // agents/ directory doesn't exist — that's fine
  }

  return files;
}

/**
 * Load bmad-manifest.json if present in the skill directory.
 */
function loadManifest(skillDir: string): BmadManifest | undefined {
  const manifestPath = join(skillDir, 'bmad-manifest.json');
  try {
    const raw = readFileSync(manifestPath, 'utf-8');
    return JSON.parse(raw) as BmadManifest;
  } catch {
    return undefined;
  }
}

// ─── Public API ──────────────────────────────────────────────────────────

/**
 * Find all BMAD skills in _bmad/bmm/ and _bmad/core/.
 *
 * Walks both directories, discovering skill subdirectories that contain
 * a SKILL.md with valid frontmatter. Returns an array of BmadSkillInfo
 * sorted by name.
 *
 * @param cwd - The project root directory (containing _bmad/).
 */
export function findBmadSkills(cwd: string): BmadSkillInfo[] {
  const bmmDir = join(cwd, '_bmad', 'bmm');
  const coreDir = join(cwd, '_bmad', 'core');

  const skills: BmadSkillInfo[] = [];

  // Scan bmm — skills are nested under phase directories (1-analysis/, 2-plan-workflows/, etc.)
  if (existsSync(bmmDir)) {
    // Walk phase directories then skill subdirectories
    try {
      const phases = readdirSync(bmmDir, { withFileTypes: true });
      for (const phase of phases) {
        if (!phase.isDirectory()) continue;
        const phaseDir = join(bmmDir, phase.name);
        const phaseSkills = scanDirForSkills(phaseDir, 'bmm');
        skills.push(...phaseSkills);
      }
    } catch {
      // Skip unreadable directories
    }
  }

  // Scan core — skills are directly in _bmad/core/
  if (existsSync(coreDir)) {
    const coreSkills = scanDirForSkills(coreDir, 'core');
    skills.push(...coreSkills);
  }

  // Sort by name for consistent ordering
  skills.sort((a, b) => a.name.localeCompare(b.name));

  return skills;
}

/**
 * Load a specific BMAD skill by name.
 *
 * Searches for a skill matching the given name. Supports exact match
 * or suffix match (e.g. 'product-brief' matches 'bmad-product-brief').
 *
 * @param skillName - The skill name to look up.
 * @param cwd - The project root directory (containing _bmad/).
 */
export function loadBmadSkill(skillName: string, cwd: string): BmadSkillInfo | null {
  const skills = findBmadSkills(cwd);

  // Exact match first
  const exact = skills.find((s) => s.name === skillName);
  if (exact) return exact;

  // Suffix match (e.g. 'product-brief' matches 'bmad-product-brief')
  const suffix = skills.find(
    (s) => s.name.endsWith(`-${skillName}`) || s.name === `bmad-${skillName}`,
  );
  if (suffix) return suffix;

  // Prefix match as last resort
  const prefix = skills.find((s) => s.name.startsWith(skillName));
  if (prefix) return prefix;

  return null;
}

/**
 * Resolve BMAD config from _bmad/bmm/config.yaml.
 *
 * Reads the config file, parses key-value pairs, and resolves template
 * variables. The special variable `{project-root}` is replaced with `cwd`.
 * Other template variables reference values within the config itself and
 * are resolved transitively.
 *
 * @param cwd - The project root directory (containing _bmad/).
 */
export function resolveBmadConfig(cwd: string): BmadConfig {
  const configPath = join(cwd, '_bmad', 'bmm', 'config.yaml');

  let rawValues: Record<string, string> = {};
  try {
    const content = readFileSync(configPath, 'utf-8');
    rawValues = parseSimpleYaml(content);
  } catch {
    // Config not found — return empty config
    return { values: {}, configPath };
  }

  // First pass: resolve {project-root} to cwd
  const resolved: Record<string, string> = {};
  for (const [key, value] of Object.entries(rawValues)) {
    resolved[key] = value.replace(/\{project-root\}/g, cwd);
  }

  // Second pass: resolve inter-variable references (up to 3 iterations for transitivity)
  for (let i = 0; i < 3; i++) {
    let changed = false;
    for (const [key, value] of Object.entries(resolved)) {
      const updated = value.replace(
        /\{(\w+)\}/g,
        (match, varName) => resolved[varName] !== undefined ? resolved[varName] : match,
      );
      if (updated !== value) {
        resolved[key] = updated;
        changed = true;
      }
    }
    if (!changed) break;
  }

  return { values: resolved, configPath };
}

/**
 * Compose a full execution prompt from a loaded skill, config, and user message.
 *
 * Builds the prompt in this order:
 * 1. Skill metadata header (name, description)
 * 2. Config variables block
 * 3. Skill SKILL.md body content
 * 4. All stage prompts from prompts/ directory
 * 5. All agent definitions from agents/ directory
 * 6. User message
 *
 * @param skill - The loaded BmadSkillInfo.
 * @param config - The resolved BmadConfig.
 * @param userMessage - The user's task description / input.
 */
export function composeExecutionPrompt(
  skill: BmadSkillInfo,
  config: BmadConfig,
  userMessage: string,
): string {
  const sections: string[] = [];

  // 1. Skill metadata header
  sections.push(`# Skill: ${skill.name}`);
  if (skill.description) {
    sections.push(`> ${skill.description}`);
  }
  sections.push('');

  // 2. Config variables block
  if (Object.keys(config.values).length > 0) {
    sections.push('## Configuration');
    sections.push('```yaml');
    for (const [key, value] of Object.entries(config.values)) {
      sections.push(`${key}: ${value}`);
    }
    sections.push('```');
    sections.push('');
  }

  // 3. Skill SKILL.md body content
  if (skill.content.trim()) {
    sections.push('## Skill Instructions');
    sections.push(skill.content.trim());
    sections.push('');
  }

  // 4. Stage prompts
  if (skill.prompts.length > 0) {
    sections.push('## Stage Prompts');
    for (const prompt of skill.prompts) {
      sections.push(`### ${prompt.name.replace(/\.md$/, '')}`);
      sections.push(prompt.content.trim());
      sections.push('');
    }
  }

  // 5. Agent definitions
  if (skill.agents.length > 0) {
    sections.push('## Agent Definitions');
    for (const agent of skill.agents) {
      sections.push(`### ${agent.name.replace(/\.md$/, '')}`);
      sections.push(agent.content.trim());
      sections.push('');
    }
  }

  // 6. User message
  sections.push('## User Request');
  sections.push(userMessage.trim());
  sections.push('');

  return sections.join('\n');
}

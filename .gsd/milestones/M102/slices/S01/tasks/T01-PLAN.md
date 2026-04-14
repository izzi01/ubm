---
estimated_steps: 23
estimated_files: 4
skills_used: []
---

# T01: Define SkillMetadata types and implement scanner/parser

Create the skill-registry module with type definitions and the scanner that discovers and parses skill directories. This is the core data layer that all downstream commands depend on.

Steps:
1. Create `src/skill-registry/types.ts` with `SkillMetadata` interface (name, description, license?, metadata?, path, skillMdPath) and `SkillValidationResult` interface (valid, errors[], warnings[])
2. Create `src/skill-registry/scanner.ts` implementing:
   - `parseSkillMd(content: string, skillMdPath: string): SkillMetadata | null` — extracts YAML frontmatter (between --- delimiters), parses name + description + optional license + optional extra fields into metadata. Returns null if no frontmatter found.
   - `scanSkillDirs(basePath: string): SkillMetadata[]` — reads all subdirectories of basePath, checks each for SKILL.md, calls parseSkillMd(), skips directories without SKILL.md or without parseable frontmatter (log warning to stderr). Returns array of all valid SkillMetadata.
3. Create `src/skill-registry/index.ts` barrel re-exporting types and scanner functions.
4. Create `tests/skill-registry/scanner.test.ts` with tests for:
   - parseSkillMd with valid frontmatter (name + description)
   - parseSkillMd with optional fields (license, version)
   - parseSkillMd with no frontmatter returns null
   - parseSkillMd with malformed YAML (missing closing ---)
   - parseSkillMd with empty content returns null
   - parseSkillMd with name only (no description) — still parses, validator will catch
   - parseSkillMd with multi-word description in quotes
   - scanSkillDirs with empty directory
   - scanSkillDirs with mixed dirs (some with SKILL.md, some without)
   - scanSkillDirs with skill missing frontmatter (skipped gracefully)
   - scanSkillDirs smoke test against real .opencode/skills/ (expect >= 150 valid skills)

Constraints:
- YAML parsing is simple regex-based (between --- delimiters), split on newlines, parse key: value pairs. No YAML library dependency.
- Skill names with special characters or uppercase are still parsed — the validator handles compliance.
- Directories without SKILL.md are silently skipped. Directories with SKILL.md but no frontmatter are skipped with a console.warn.

## Inputs

- `.opencode/skills/ — real skill directories to scan and validate parser against`

## Expected Output

- `src/skill-registry/types.ts — SkillMetadata and SkillValidationResult type definitions`
- `src/skill-registry/scanner.ts — parseSkillMd() and scanSkillDirs() functions`
- `src/skill-registry/index.ts — barrel re-exports`
- `tests/skill-registry/scanner.test.ts — ~15 scanner unit tests including 172-skill smoke test`

## Verification

npx vitest run tests/skill-registry/scanner.test.ts

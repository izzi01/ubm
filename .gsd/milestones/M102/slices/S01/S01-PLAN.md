# S01: Skill Registry

**Goal:** Build the skill registry module: scanSkillDirs() indexes all 172 skills from .opencode/skills/, parseSkillMd() extracts YAML frontmatter metadata, validateSkill() checks Skills Spec compliance, and parseSimpleYaml() is extended to handle the skills: block for model routing.
**Demo:** scanSkillDirs() indexes all 172 skills, parseSkillMd() extracts metadata, validateSkill() checks Skills Spec compliance. All 172 existing skills parse without crashing.

## Must-Haves

- scanSkillDirs() returns SkillMetadata[] for all 172 skill directories, skipping only those without SKILL.md or without YAML frontmatter\n- parseSkillMd() extracts name, description, license, and optional metadata from YAML frontmatter\n- validateSkill() returns valid=true for compliant skills, valid=false with specific errors for non-compliant\n- parseSimpleYaml() handles skills: block alongside existing agents: block\n- All ~30 new tests pass with no regressions from existing 616 tests

## Proof Level

- This slice proves: contract

## Integration Closure

- Upstream surfaces consumed: .opencode/skills/ directory structure, Agent Skills Spec naming rules, existing parseSimpleYaml() parser\n- New wiring introduced: src/skill-registry/ module with scanner, parser, validator; ModelConfig.skills field; parseSimpleYaml() generalized for skills: block\n- What remains before the milestone is truly usable end-to-end: S02 commands (list, new) and S03 execution (run) depend on this module

## Verification

- Runtime signals: console.warn for skipped skills (no frontmatter, no SKILL.md) during scanSkillDirs()\n- Failure visibility: validateSkill() returns structured errors[] and warnings[] with specific field names

## Tasks

- [x] **T01: Define SkillMetadata types and implement scanner/parser** `est:1.5h`
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
  - Files: `src/skill-registry/types.ts`, `src/skill-registry/scanner.ts`, `src/skill-registry/index.ts`, `tests/skill-registry/scanner.test.ts`
  - Verify: npx vitest run tests/skill-registry/scanner.test.ts

- [x] **T02: Implement validateSkill() and extend parseSimpleYaml for skills: block** `est:1.5h`
  Create the skill validator that checks Skills Spec compliance and extend the model-config YAML parser to handle the skills: top-level block for model routing.

Steps:
1. Create `src/skill-registry/validator.ts` implementing `validateSkill(skill: SkillMetadata): SkillValidationResult`:
   - Check name matches /^[a-z0-9-]+$/ (lowercase alphanumeric + hyphen, Skills Spec requirement)
   - Check description is non-empty
   - Check directory name (last segment of skill.path) matches skill.name
   - Collect hard errors (missing required fields) and soft warnings (non-standard but parseable)
   - Return { valid: errors.length === 0, errors, warnings }
2. Update `src/model-config/types.ts`: add `skills?: Record<string, string>` to `ModelConfig` interface. Add `skill` to `AgentModelAssignment.agent` type union comment.
3. Update `src/model-config/loader.ts` `parseSimpleYaml()` to handle `skills:` block the same way as `agents:` block:
   - Add `inSkills` flag alongside `inAgents`
   - Detect `skills:` block start, parse indented key: value pairs into `config.skills`
   - Handle block transitions correctly
4. Update `src/model-config/loader.ts` `loadModelConfig()` to include skill assignments in the output (merged same way as agents).
5. Update `src/skill-registry/index.ts` to also re-export `validateSkill`.
6. Create `tests/skill-registry/validator.test.ts` with tests for:
   - validateSkill with fully compliant skill → valid: true, no errors
   - validateSkill with missing name → error
   - validateSkill with missing description → error
   - validateSkill with uppercase name → error (invalid characters)
   - validateSkill with spaces in name → error
   - validateSkill with name/path mismatch → error
   - validateSkill with empty directory name → handled gracefully
   - validateSkill with valid hyphenated name → valid
   - validateSkill with numeric name → valid
7. Create `tests/model-config/skills-yaml.test.ts` (or extend existing loader.test.ts) with tests for:
   - parseSimpleYaml with skills: block only
   - parseSimpleYaml with tier + agents + skills
   - parseSimpleYaml with empty skills block
   - loadModelConfig includes skill assignments in output
   - loadModelConfig merges skill assignments with tier defaults

Constraints:
- Validator is a pure function — no I/O, no SDK dependency.
- The parseSimpleYaml change must be backward compatible — all existing model-config tests must still pass.
- Skills: entries follow same key: value format as agents:.
- Don't add skills to KNOWN_AGENTS — skill names are dynamic, not a fixed set.
  - Files: `src/skill-registry/validator.ts`, `src/skill-registry/index.ts`, `src/model-config/types.ts`, `src/model-config/loader.ts`, `tests/skill-registry/validator.test.ts`, `tests/model-config/loader.test.ts`
  - Verify: npx vitest run tests/skill-registry/ tests/model-config/

## Files Likely Touched

- src/skill-registry/types.ts
- src/skill-registry/scanner.ts
- src/skill-registry/index.ts
- tests/skill-registry/scanner.test.ts
- src/skill-registry/validator.ts
- src/model-config/types.ts
- src/model-config/loader.ts
- tests/skill-registry/validator.test.ts
- tests/model-config/loader.test.ts

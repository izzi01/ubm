---
estimated_steps: 36
estimated_files: 6
skills_used: []
---

# T02: Implement validateSkill() and extend parseSimpleYaml for skills: block

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

## Inputs

- `src/skill-registry/types.ts — SkillMetadata and SkillValidationResult types from T01`
- `src/skill-registry/scanner.ts — parseSkillMd output format from T01`
- `src/model-config/types.ts — existing ModelConfig interface`
- `src/model-config/loader.ts — existing parseSimpleYaml implementation`
- `.opencode/skills/agent_skills_spec.md — Skills Spec naming rules`

## Expected Output

- `src/skill-registry/validator.ts — validateSkill() function`
- `src/skill-registry/index.ts — updated barrel with validateSkill export`
- `src/model-config/types.ts — ModelConfig with skills field added`
- `src/model-config/loader.ts — parseSimpleYaml handles skills: block`
- `tests/skill-registry/validator.test.ts — ~10 validator unit tests`
- `tests/model-config/loader.test.ts — extended with ~5 skills: YAML parsing tests`

## Verification

npx vitest run tests/skill-registry/ tests/model-config/

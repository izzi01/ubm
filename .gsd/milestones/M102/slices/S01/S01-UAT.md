# S01: Skill Registry — UAT

**Milestone:** M102
**Written:** 2026-04-10T23:30:08.555Z

# S01: Skill Registry — UAT

**Milestone:** M102
**Written:** 2026-04-11

## UAT Type

- UAT mode: artifact-driven
- Why this mode is sufficient: The skill registry is a pure data module (no runtime server, no UI). Correctness is fully verified by the 58 automated tests. UAT confirms the module can be imported, scan real skills, and validate them correctly.

## Preconditions

- Node.js installed
- Dependencies installed (`npm install`)
- `.opencode/skills/` directory exists with real skill directories

## Smoke Test

```bash
npx vitest run tests/skill-registry/ tests/model-config/
```
Expected: 58/58 tests pass, 3 test files, 0 failures.

## Test Cases

### 1. scanSkillDirs discovers real skills

1. Import `scanSkillDirs` from `src/skill-registry/`
2. Call `scanSkillDirs('.opencode/skills/')`
3. **Expected:** Returns array of SkillMetadata, length >= 149. Each entry has `name` (string), `description` (string), `path` (string ending in skill name).

### 2. parseSkillMd extracts frontmatter fields

1. Import `parseSkillMd` from `src/skill-registry/`
2. Call with a SKILL.md content string containing `---\nname: test-skill\ndescription: "A test"\n---`
3. **Expected:** Returns object with `{ name: 'test-skill', description: 'A test' }`, non-null path fields.

### 3. validateSkill accepts compliant skills

1. Import `validateSkill` from `src/skill-registry/`
2. Call with `{ name: 'my-skill', description: 'Does things', path: '/foo/my-skill', skillMdPath: '/foo/my-skill/SKILL.md' }`
3. **Expected:** `{ valid: true, errors: [], warnings: [] }`

### 4. validateSkill rejects non-compliant skills

1. Import `validateSkill` from `src/skill-registry/`
2. Call with `{ name: 'My Skill', description: 'Bad name', path: '/foo/my-skill', skillMdPath: '/foo/my-skill/SKILL.md' }`
3. **Expected:** `{ valid: false, errors: [string containing "uppercase" or "invalid"], warnings: [] }`

### 5. parseSimpleYaml handles skills: block

1. Import `parseSimpleYaml` from `src/model-config/loader.ts`
2. Parse YAML string with `skills:\n  seo-mastery: claude-sonnet-4-20250514`
3. **Expected:** Result has `config.skills` containing `{ 'seo-mastery': 'claude-sonnet-4-20250514' }`

### 6. loadModelConfig includes skill assignments

1. Create a temp models.yaml with `tier: standard` and `skills:\n  test-skill: test-model`
2. Call `loadModelConfig(tempPath)`
3. **Expected:** Assignments array includes an entry with agent='test-skill' and model='test-model'.

## Edge Cases

### 7. Skill with no frontmatter returns null

1. Call `parseSkillMd('Some text without frontmatter', '/path/SKILL.md')`
2. **Expected:** Returns `null`

### 8. Empty skills directory

1. Create empty temp directory, call `scanSkillDirs(tempDir)`
2. **Expected:** Returns empty array `[]`

### 9. validateSkill name/path mismatch

1. Call `validateSkill({ name: 'abc', description: 'x', path: '/foo/xyz', skillMdPath: '/foo/xyz/SKILL.md' })`
2. **Expected:** `{ valid: false, errors: [string containing "match"] }`

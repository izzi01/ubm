# S02: Skill remove and help update — UAT

**Milestone:** M106
**Written:** 2026-04-11T12:59:41.464Z

# UAT: S02 — Skill remove and help update

## Preconditions
- Node.js 24+ installed
- Project dependencies installed (`npm install`)
- Working directory: project root

## Test Cases

### TC1: /skill remove — successful removal
1. Create a test skill: `mkdir -p .opencode/skills/test-skill && echo '---\nname: test-skill\ndescription: test\n---' > .opencode/skills/test-skill/SKILL.md`
2. Verify skill exists: `/skill list` shows `test-skill`
3. Run: `/skill remove test-skill`
4. **Expected:** Success widget confirming removal of `test-skill`
5. Verify: `/skill list` no longer shows `test-skill`
6. Verify: `.opencode/skills/test-skill/` directory no longer exists

### TC2: /skill remove — nonexistent skill
1. Run: `/skill remove nonexistent-skill`
2. **Expected:** Error widget stating skill not found

### TC3: /skill remove — empty argument
1. Run: `/skill remove`
2. **Expected:** Error widget prompting for skill name

### TC4: /skill remove — quote stripping
1. Create a test skill: `mkdir -p .opencode/skills/quote-test && echo '---\nname: quote-test\ndescription: test\n---' > .opencode/skills/quote-test/SKILL.md`
2. Run: `/skill remove "quote-test"`
3. **Expected:** Success — quotes stripped, skill removed
4. Run: `/skill remove 'another-test'` (with single quotes)
5. **Expected:** Error if skill doesn't exist (quote stripping works)

### TC5: /skill help — lists all commands
1. Run: `/skill help`
2. **Expected:** Help text includes: list, new, run, install, remove

## Automated Verification
```bash
npx vitest run tests/commands/skill-commands.test.ts
# Expected: 47/47 tests pass
```

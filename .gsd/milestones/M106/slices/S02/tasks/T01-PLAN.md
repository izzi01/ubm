---
estimated_steps: 1
estimated_files: 2
skills_used: []
---

# T01: Implement /skill remove command and update help text

Add handleSkillRemove() to skill-commands.ts that: parses the skill name from args (with quote stripping), validates it exists in .opencode/skills/, deletes the directory via rmSync({ recursive: true, force: true }), and shows success/error widgets. Register as 'skill remove' command. Update handleSkillHelp() to include /skill remove in the help listing.

## Inputs

- `src/commands/skill-commands.ts`
- `src/skill-registry/index.ts`
- `tests/commands/skill-commands.test.ts`

## Expected Output

- `src/commands/skill-commands.ts`
- `tests/commands/skill-commands.test.ts`

## Verification

npx vitest run tests/commands/skill-commands.test.ts — all tests pass including new /skill remove tests. Help text includes /skill remove.

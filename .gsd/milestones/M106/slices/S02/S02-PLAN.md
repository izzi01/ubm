# S02: Skill remove and help update

**Goal:** Add /skill remove <name> command that deletes a skill directory from .opencode/skills/, and update /skill help to list all commands including remove.
**Demo:** /skill remove <name> deletes skill directory, /skill help shows all commands including install and remove

## Must-Haves

- /skill remove <name> deletes .opencode/skills/<name>/ directory when it exists\n- /skill remove shows error widget when skill doesn't exist\n- /skill remove rejects empty/missing name argument\n- /skill help lists all commands: list, new, run, install, remove\n- All existing tests continue to pass (zero regressions)\n- New tests cover: success removal, not found, empty args, quote stripping, help text

## Proof Level

- This slice proves: contract

## Integration Closure

- Upward: consumes scanSkillDirs() from skill-registry (same as all other skill commands)\n- New wiring: handleSkillRemove() registered as 'skill remove' in registerSkillCommands()\n- Help text updated to include remove\n- What remains: nothing — milestone is complete after this slice

## Verification

- `npx vitest run tests/commands/skill-commands.test.ts` — all existing + new /skill remove tests pass

## Tasks

- [x] **T01: Implement /skill remove command and update help text** `est:45m`
  Add handleSkillRemove() to skill-commands.ts that: parses the skill name from args (with quote stripping), validates it exists in .opencode/skills/, deletes the directory via rmSync({ recursive: true, force: true }), and shows success/error widgets. Register as 'skill remove' command. Update handleSkillHelp() to include /skill remove in the help listing.
  - Files: `src/commands/skill-commands.ts`, `tests/commands/skill-commands.test.ts`
  - Verify: npx vitest run tests/commands/skill-commands.test.ts — all tests pass including new /skill remove tests. Help text includes /skill remove.

## Files Likely Touched

- src/commands/skill-commands.ts
- tests/commands/skill-commands.test.ts

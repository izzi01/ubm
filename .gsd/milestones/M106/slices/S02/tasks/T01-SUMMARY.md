---
id: T01
parent: S02
milestone: M106
key_files:
  - src/commands/skill-commands.ts
  - tests/commands/skill-commands.test.ts
key_decisions:
  - (none)
duration: 
verification_result: passed
completed_at: 2026-04-11T12:59:10.094Z
blocker_discovered: false
---

# T01: Added /skill remove command that deletes skill directories from .opencode/skills/ and updated /skill help to list all commands

**Added /skill remove command that deletes skill directories from .opencode/skills/ and updated /skill help to list all commands**

## What Happened

Implemented handleSkillRemove() in src/commands/skill-commands.ts following established patterns from existing skill commands. The function parses the skill name from args with quote stripping, validates the skill directory exists, deletes it via rmSync({ recursive: true, force: true }), and displays success/error widgets. Registered as 'skill remove' command. Updated handleSkillHelp() to include /skill remove in the help listing. Added 8 new tests covering empty args, whitespace-only args, nonexistent skill, successful removal, success widget content, double-quote stripping, single-quote stripping, and verification that removed skills no longer appear in /skill list. All 47 tests pass.

## Verification

Ran npx vitest run tests/commands/skill-commands.test.ts — all 47 tests pass (39 existing + 8 new /skill remove tests). Help text includes /skill remove confirmed by test assertion.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `npx vitest run tests/commands/skill-commands.test.ts` | 0 | ✅ pass | 981ms |

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `src/commands/skill-commands.ts`
- `tests/commands/skill-commands.test.ts`

---
id: T01
parent: S03
milestone: M102
key_files:
  - src/commands/skill-commands.ts
  - tests/commands/skill-commands.test.ts
key_decisions:
  - (none)
duration: 
verification_result: passed
completed_at: 2026-04-10T23:37:14.290Z
blocker_discovered: false
---

# T01: Added handleSkillRun handler implementing /skill run <name> <message> with skill validation, model routing from .umb/models.yaml, session creation, and 14 tests covering all paths

**Added handleSkillRun handler implementing /skill run <name> <message> with skill validation, model routing from .umb/models.yaml, session creation, and 14 tests covering all paths**

## What Happened

Implemented `handleSkillRun(args, ctx, pi)` in `src/commands/skill-commands.ts` following the discovery-commands pattern exactly. The handler parses skill name + user message, scans .opencode/skills/ for the named skill (exact match), validates it, resolves model routing from .umb/models.yaml skills section, validates the model in the registry, reads full SKILL.md content, builds a prompt with skill context + user message, and creates a new session via ctx.newSession(). Handles all error paths (no args, skill not found, invalid skill, model not found, cancelled session, session exception) with appropriate widget notifications. Registered the command and updated help text. All 124 tests pass across 6 command test files.

## Verification

npx vitest run tests/commands/skill-commands.test.ts — 33/33 passed. npx vitest run tests/commands/ — 124/124 passed, zero regressions.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `npx vitest run tests/commands/skill-commands.test.ts` | 0 | ✅ pass | 231ms |
| 2 | `npx vitest run tests/commands/` | 0 | ✅ pass | 479ms |

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `src/commands/skill-commands.ts`
- `tests/commands/skill-commands.test.ts`

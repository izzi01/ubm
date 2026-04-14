---
id: T02
parent: S02
milestone: M102
key_files:
  - src/commands/skill-commands.ts
  - tests/commands/skill-commands.test.ts
key_decisions:
  - (none)
duration: 
verification_result: passed
completed_at: 2026-04-10T23:32:50.652Z
blocker_discovered: false
---

# T02: Created /skill new command that validates name format, creates .opencode/skills/{name}/ with SKILL.md template, and verifies the result.

**Created /skill new command that validates name format, creates .opencode/skills/{name}/ with SKILL.md template, and verifies the result.**

## What Happened

Implemented the `/skill new <name> "description"` slash command following the same handler+registration pattern as `/skill list`. The command parses arguments (first token = name, rest = description with quote stripping), validates the name against the Agent Skills Spec regex (`/^[a-z0-9-]+$/`), checks for duplicates, creates the skill directory with a SKILL.md template containing proper YAML frontmatter, then re-scans and validates the created skill. Added 11 tests covering: successful creation, empty args, missing description, invalid names (uppercase, special chars), duplicate detection, quote stripping (single and double), and integration with `/skill list`. All 19 tests pass (8 existing + 11 new).

## Verification

All 19 tests pass via `npx vitest run tests/commands/skill-commands.test.ts` (0 failures, 141ms). No new typecheck errors in modified files.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `npx vitest run tests/commands/skill-commands.test.ts` | 0 | ✅ pass | 141ms |
| 2 | `npx tsc --noEmit (filtered: skill-commands, skill-registry)` | 0 | ✅ pass | 3000ms |

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `src/commands/skill-commands.ts`
- `tests/commands/skill-commands.test.ts`

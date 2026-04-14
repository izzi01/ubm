---
id: S03
parent: M102
milestone: M102
provides:
  - ["handleSkillRun() command handler registered as 'skill run'", "Full session creation flow with skill context injection and model routing"]
requires:
  []
affects:
  []
key_files:
  - ["src/commands/skill-commands.ts", "tests/commands/skill-commands.test.ts"]
key_decisions:
  - []
patterns_established:
  - ["Session creation with skill context follows discovery-commands pattern exactly: ctx.newSession({ setup }) with conditional appendModelChange + appendSessionInfo + appendMessage"]
observability_surfaces:
  - ["Widget notifications for all user-facing outcomes (success, error, cancelled, exception)", "Console warnings from scanSkillDirs for skills without parseable frontmatter (inherited from S01)"]
drill_down_paths:
  - [".gsd/milestones/M102/slices/S03/tasks/T01-SUMMARY.md"]
duration: ""
verification_result: passed
completed_at: 2026-04-10T23:37:45.602Z
blocker_discovered: false
---

# S03: /skill run

**Implemented /skill run command that loads a skill's SKILL.md, resolves model routing, creates a new pi session with skill context, and sends the user message as the first turn**

## What Happened

S03 delivered the final execution slice for M102 — the `/skill run` command. The handler `handleSkillRun(args, ctx, pi)` parses skill name and user message, scans `.opencode/skills/` for an exact match, validates the skill via `validateSkill()`, resolves model routing from the `skills:` section of `.umb/models.yaml`, validates the model exists in the registry, reads the full SKILL.md content, builds a prompt combining skill context with the user message, and creates a new session via `ctx.newSession()` with the skill loaded. All error paths produce actionable widget notifications: missing args shows usage hint, skill not found lists available skills, invalid skill shows validation errors, model not found identifies the missing provider/modelId, cancelled session shows warning, and session exceptions show error details. The implementation follows the discovery-commands session creation pattern exactly. 14 new tests cover all paths, bringing the total to 33 skill-command tests and 124 across all command test files with zero regressions.

## Verification

npx vitest run tests/commands/skill-commands.test.ts — 33/33 passed. npx vitest run tests/commands/ — 124/124 passed, zero regressions across all 6 command test files.

## Requirements Advanced

- R003 — Implemented /skill run end-to-end: skill lookup, validation, model routing, session creation with SKILL.md injection, user message as first turn

## Requirements Validated

- R003 — 33/33 skill-command tests pass including 14 /skill run tests covering all paths. 124/124 total command tests with zero regressions.

## New Requirements Surfaced

None.

## Requirements Invalidated or Re-scoped

None.

## Deviations

None.

## Known Limitations

None.

## Follow-ups

None.

## Files Created/Modified

- `src/commands/skill-commands.ts` — Added handleSkillRun handler with skill validation, model routing, session creation, and error handling. Registered 'skill run' command and updated help text.
- `tests/commands/skill-commands.test.ts` — Added 14 tests for /skill run covering all paths: no args, not found, invalid, model routing, no model config, model not found, cancelled, exception, quote stripping, extra frontmatter.

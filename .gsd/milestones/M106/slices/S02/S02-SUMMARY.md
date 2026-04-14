---
id: S02
parent: M106
milestone: M106
provides:
  - ["/skill remove command registered and functional", "/skill help updated to list all commands including remove"]
requires:
  - slice: S01
    provides: scanSkillDirs() and validateSkill() infrastructure, handleSkillInstall() pattern
affects:
  []
key_files:
  - ["src/commands/skill-commands.ts", "tests/commands/skill-commands.test.ts"]
key_decisions:
  - (none)
patterns_established:
  - (none)
observability_surfaces:
  - none
drill_down_paths:
  - [".gsd/milestones/M106/slices/S02/tasks/T01-SUMMARY.md"]
duration: ""
verification_result: passed
completed_at: 2026-04-11T12:59:41.464Z
blocker_discovered: false
---

# S02: Skill remove and help update

**Added /skill remove command that deletes skill directories from .opencode/skills/ and updated /skill help to list all commands**

## What Happened

Implemented handleSkillRemove() in src/commands/skill-commands.ts following established patterns from existing skill commands. The function parses the skill name from args with quote stripping, validates the skill directory exists, deletes it via rmSync({ recursive: true, force: true }), and displays success/error widgets. Registered as 'skill remove' command. Updated handleSkillHelp() to include /skill remove in the help listing. Added 8 new tests covering empty args, whitespace-only args, nonexistent skill, successful removal, success widget content, double-quote stripping, single-quote stripping, and verification that removed skills no longer appear in /skill list. All 47 tests pass with zero regressions.

## Verification

npx vitest run tests/commands/skill-commands.test.ts — 47/47 tests pass (39 existing + 8 new /skill remove tests). Help text includes /skill remove confirmed by test assertion.

## Requirements Advanced

None.

## Requirements Validated

None.

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

None.

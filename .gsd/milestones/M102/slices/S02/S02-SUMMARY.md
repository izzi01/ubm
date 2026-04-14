---
id: S02
parent: M102
milestone: M102
provides:
  - ["/skill list command that scans, validates, and displays all indexed skills", "/skill new command that creates valid skill directories with SKILL.md templates", "/skill help subcommand", "registerSkillCommands() wired in extension entry point"]
requires:
  - slice: S01
    provides: scanSkillDirs(), parseSkillMd(), validateSkill() from src/skill-registry/
affects:
  - ["S03"]
key_files:
  - ["src/commands/skill-commands.ts", "tests/commands/skill-commands.test.ts", "src/extension/index.ts"]
key_decisions:
  - []
patterns_established:
  - ["Command factory pattern: createSkillCommandHandlers() returns handler map, registerSkillCommands() is thin registration wrapper — consistent with gsd-commands and umb-commands", "Name validation uses /^[a-z0-9-]+$/ regex matching Agent Skills Spec naming convention", "Quote stripping for description: removes leading/trailing single or double quotes from the description argument"]
observability_surfaces:
  - none
drill_down_paths:
  - [".gsd/milestones/M102/slices/S02/tasks/T01-SUMMARY.md", ".gsd/milestones/M102/slices/S02/tasks/T02-SUMMARY.md"]
duration: ""
verification_result: passed
completed_at: 2026-04-10T23:33:15.915Z
blocker_discovered: false
---

# S02: /skill list + /skill new

**Implemented /skill list and /skill new slash commands — list scans and validates all indexed skills; new creates valid skill directories with SKILL.md templates.**

## What Happened

S02 delivered two slash commands for skill management: /skill list and /skill new.

T01 implemented /skill list, which calls scanSkillDirs() from S01's skill-registry module, validates each skill with validateSkill(), and renders results in a formatted widget with ✅/❌ indicators, descriptions, and summary counts. Also added /skill help and registerSkillCommands() wired into the extension entry point. 8 tests cover normal listing, empty directory, and missing skills directory.

T02 implemented /skill new, which accepts a name and quoted description, validates the name against the Agent Skills Spec regex (/^[a-z0-9-]+$/), checks for duplicates, creates .opencode/skills/{name}/SKILL.md with proper YAML frontmatter, then re-scans and validates the created skill. 11 tests cover successful creation, missing args, invalid names, duplicates, and quote stripping.

Both commands follow the established handler+registration pattern (createSkillCommandHandlers factory + registerSkillCommands). All 19 tests pass in 174ms.

## Verification

All 19 tests pass via `npx vitest run tests/commands/skill-commands.test.ts` (0 failures, 174ms). Typecheck shows no new errors from this slice's files (pre-existing errors in unrelated workflow tests). Commands registered in extension entry point.

## Requirements Advanced

None.

## Requirements Validated

- R001 — /skill new creates valid skill skeletons with SKILL.md template. 19 tests pass.
- R002 — /skill new scaffolds valid skill directory structure in .opencode/skills/ following Agent Skills Spec naming convention. Local-only as specified.

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

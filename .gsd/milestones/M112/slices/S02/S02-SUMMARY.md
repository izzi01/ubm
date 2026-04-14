---
id: S02
parent: M112
milestone: M112
provides:
  - ["bmad-executor module with findBmadSkills(), loadBmadSkill(), resolveBmadConfig(), composeExecutionPrompt()", "/bmad run <skill> <message> command for executing BMAD skills in new pi sessions", "/bmad skills command for listing discoverable BMAD skills", "46 passing tests (29 executor + 17 commands) against real _bmad/ directory"]
requires:
  []
affects:
  []
key_files:
  - ["src/resources/extensions/umb/bmad-executor/types.ts", "src/resources/extensions/umb/bmad-executor/loader.ts", "src/resources/extensions/umb/bmad-executor/index.ts", "src/resources/extensions/umb/commands/bmad-commands.ts", "src/resources/extensions/umb/commands/index.ts", "src/resources/extensions/umb/tests/bmad-executor.test.ts", "src/resources/extensions/umb/tests/bmad-commands.test.ts"]
key_decisions:
  - ["Regex-based YAML parsing (no library) for consistency with skill-registry pattern", "All executor functions synchronous matching existing convention", "3-pass iterative template resolution for transitive variable references in config.yaml", "Prompt composition order: header → config → skill body → stage prompts → agent definitions → user message", "Fuzzy matching for skill names (suffix match, bmad- prefix match) for ergonomic CLI usage"]
patterns_established:
  - ["bmad-executor module pattern: types.ts + loader.ts + index.ts barrel", "BMAD prompt composition: structured multi-section prompt with deterministic ordering", "BMAD config resolution: iterative template variable replacement with max-pass guard"]
observability_surfaces:
  - none
drill_down_paths:
  - [".gsd/milestones/M112/slices/S02/tasks/T01-SUMMARY.md", ".gsd/milestones/M112/slices/S02/tasks/T02-SUMMARY.md"]
duration: ""
verification_result: passed
completed_at: 2026-04-13T09:02:21.513Z
blocker_discovered: false
---

# S02: Build BMAD skill execution engine (loader, executor, pipeline)

**Built the bmad-executor module with skill discovery, loading, config resolution, prompt composition, and /bmad run + /bmad skills commands — 46 tests passing**

## What Happened

This slice built the BMAD skill execution engine in two tasks:

**T01 (bmad-executor module):** Created three source files in `src/resources/extensions/umb/bmad-executor/`:
- `types.ts` — BmadSkillInfo, BmadConfig, BmadExecutionPlan, BmadManifest interfaces
- `loader.ts` — Four public functions: findBmadSkills() discovers 38 skills (27 bmm + 11 core), loadBmadSkill() loads SKILL.md + prompts/*.md + agents/*.md + bmad-manifest.json, resolveBmadConfig() parses config.yaml with iterative transitive template resolution, composeExecutionPrompt() builds structured prompts with deterministic section ordering
- `index.ts` — barrel exports

All YAML parsing uses regex-based extraction (no library dependency) consistent with the existing skill-registry pattern. Template resolution uses a 3-pass iterative approach for transitive variable references in config.yaml. 29 tests cover all functions including integration tests against the real _bmad/ directory.

**T02 (command wiring):** Added two command handlers to bmad-commands.ts:
- `handleBmadRun` — parses args (skill name + user message), fuzzy matches skill name (suffix/prefix), loads skill, resolves config, composes prompt, creates new pi session via ctx.newSession()
- `handleBmadSkills` — lists all discoverable BMAD skills grouped by module with prompt/agent counts in brackets

Both commands handle edge cases gracefully (skill not found, missing message, cancelled session, session creation errors). 17 tests cover all paths. Commands registered in registerBmadCommands() and barrel-exported from commands/index.ts.

**Final verification:** All 109 umb tests pass (46 new BMAD + 63 existing) with zero regressions.

## Verification

All 46 BMAD tests pass (29 executor + 17 commands). Full 109-test umb suite passes with zero regressions. Integration tests validate against real _bmad/ directory (38 skills discovered, bmad-product-brief loads with full structure including 4+ prompts, 3+ agents, manifest). TypeScript compiles clean. composeExecutionPrompt confirmed in loader.ts via grep.

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

["/bmad skills lists all 38 discovered skills without filtering out agent-type skills (the plan mentioned '35 non-agent skills' but agents are also SKILL.md files and are included)", "Template resolution has a max-pass guard but the real config.yaml only needs 2-3 passes"]

## Follow-ups

None.

## Files Created/Modified

None.

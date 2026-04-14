---
id: S04
parent: M112
milestone: M112
provides:
  - ["PLANNING_PIPELINE definition with 2 stages (bmad-create-prd → bmad-create-ux-design)", "handleBmadAutoPlanning handler with help/--list/--dry-run/full-execution paths", "/bmad auto-planning command registration", "AUTO_PHASES dispatch for 'planning' phase"]
requires:
  - slice: S03
    provides: bmad-pipeline module (types.ts, pipelines.ts, executor.ts, index.ts), ANALYSIS_PIPELINE pattern, runPipeline() executor, sessionFactory pattern
affects:
  - ["S05 (auto-solutioning) — will add SOLUTIONING_PIPELINE using same pattern", "S06 (auto-implementation) — will add IMPLEMENTATION_PIPELINE using same pattern", "S07 (umbrella /bmad auto) — will need to chain all 4 phases"]
key_files:
  - ["src/resources/extensions/umb/bmad-pipeline/pipelines.ts", "src/resources/extensions/umb/bmad-pipeline/index.ts", "src/resources/extensions/umb/tests/bmad-pipeline.test.ts", "src/resources/extensions/umb/commands/bmad-commands.ts", "src/resources/extensions/umb/tests/bmad-commands.test.ts"]
key_decisions:
  - (none)
patterns_established:
  - ["Adding a new BMAD pipeline phase requires exactly 3 wiring points: (1) pipeline definition in pipelines.ts, (2) handler function in bmad-commands.ts following the analysis/planning pattern, (3) dispatch branch in handleBmadAuto + AUTO_PHASES update + command registration. The executor and types require zero changes."]
observability_surfaces:
  - none
drill_down_paths:
  []
duration: ""
verification_result: passed
completed_at: 2026-04-13T16:45:17.573Z
blocker_discovered: false
---

# S04: Implement /bmad auto-planning (Phase 2 pipeline)

**Added PLANNING_PIPELINE (bmad-create-prd → bmad-create-ux-design) and /bmad auto-planning command with full test coverage (24 pipeline + 37 command tests), reusing S03's pipeline infrastructure.**

## What Happened

S04 delivered the Phase 2 planning pipeline for BMAD auto-mode. T01 defined PLANNING_PIPELINE in pipelines.ts with two stages (bmad-create-prd, bmad-create-ux-design) in the 2-plan-workflows phase, exported from index.ts, and added 9 new pipeline tests covering structure validation, lookup, sequential execution with mock sessionFactory, context accumulation, and failure handling. T02 created handleBmadAutoPlanning handler following the exact same pattern as handleBmadAutoAnalysis (help, --list, --dry-run, full execution), updated AUTO_PHASES to mark planning as implemented, added dispatch branch in handleBmadAuto, registered the bmad auto-planning command, and added 7 new command tests. All 61 tests pass across both test files with zero regressions. The pipeline infrastructure established in S03 proved cleanly extensible — adding a new phase required only a pipeline definition and a command handler with no changes to the core executor.

## Verification

Ran npx vitest run on both test suites:
- bmad-pipeline.test.ts: 24/24 tests pass (15 existing + 9 new)
- bmad-commands.test.ts: 37/37 tests pass (30 existing + 7 new)
- Full umb test suite: 61/61 actual tests pass (16 pre-existing dist-test/ artifacts fail as "no test suite" — not S04 regressions)

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

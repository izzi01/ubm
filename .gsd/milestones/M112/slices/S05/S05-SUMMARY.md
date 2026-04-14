---
id: S05
parent: M112
milestone: M112
provides:
  - ["SOLUTIONING_PIPELINE definition (3 stages: architecture, epics-and-stories, implementation-readiness)", "handleBmadAutoSolutioning handler with help/--list/--dry-run/execution paths", "AUTO_PHASES solutioning dispatch branch marked as implemented", "bmad auto-solutioning command registration", "16 new tests (9 pipeline + 7 command) following established patterns"]
requires:
  []
affects:
  []
key_files:
  - ["src/resources/extensions/umb/bmad-pipeline/pipelines.ts", "src/resources/extensions/umb/bmad-pipeline/index.ts", "src/resources/extensions/umb/commands/bmad-commands.ts", "src/resources/extensions/umb/tests/bmad-pipeline.test.ts", "src/resources/extensions/umb/tests/bmad-commands.test.ts"]
key_decisions:
  - (none)
patterns_established:
  - (none)
observability_surfaces:
  - none
drill_down_paths:
  []
duration: ""
verification_result: passed
completed_at: 2026-04-13T16:49:21.733Z
blocker_discovered: false
---

# S05: Implement /bmad auto-solutioning (Phase 3 pipeline)

**Added SOLUTIONING_PIPELINE (3 stages) and /bmad auto-solutioning command with full handler, dispatch, and 16 new tests — 76 total tests pass.**

## What Happened

## What Was Built

This slice implemented the Phase 3 (Solutioning) auto-pipeline for the BMAD method. Two tasks completed:

**T01 — SOLUTIONING_PIPELINE definition and tests:** Added a 3-stage pipeline (bmad-create-architecture, bmad-create-epics-and-stories, bmad-check-implementation-readiness) to `pipelines.ts`. All stages use the `3-solutioning` phase identifier. Exported from `index.ts` alongside ANALYSIS_PIPELINE and PLANNING_PIPELINE. Added 9 new pipeline tests (structure, lookup, sequential execution, context accumulation, failure) — 32/32 pipeline tests pass.

**T02 — Handler, dispatch, and command registration:** Created `handleBmadAutoSolutioning` following the exact `handleBmadAutoPlanning` pattern: help text, --list (shows 3 stages), --dry-run (validates stages without executing), and full pipeline execution. Updated AUTO_PHASES to mark `solutioning: implemented: true`. Added dispatch branch in `handleBmadAuto` for 'solutioning'. Registered `bmad auto-solutioning` command. Added 7 new command tests — 44/44 bmad-commands tests pass.

## Patterns Established

- Phase pipeline additions follow a consistent 3-step pattern: (1) define pipeline constant in pipelines.ts, (2) add to PIPELINES array, (3) export from index.ts
- Handler creation follows a clone-and-adapt pattern from the nearest existing phase handler
- AUTO_PHASES dispatch uses simple string matching — adding a new phase requires one new `if (phaseName === ...)` branch

## Integration Points for Downstream

- S06 (Implementation phase) will follow the exact same pattern: define pipeline in pipelines.ts, clone handler from handleBmadAutoSolutioning, add dispatch branch
- S07 (Umbrella /bmad auto) will chain all 4 phases by reading AUTO_PHASES and executing sequentially

## Verification

Ran both test suites:
- `npx vitest run src/resources/extensions/umb/tests/bmad-pipeline.test.ts` — 32/32 pass
- `npx vitest run src/resources/extensions/umb/tests/bmad-commands.test.ts` — 44/44 pass
- Total: 76/76 tests pass with zero regressions
- Verified SOLUTIONING_PIPELINE exported from index.ts and imported in bmad-commands.ts
- Verified 'solutioning' dispatch branch in handleBmadAuto
- Verified bmad auto-solutioning command registration

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

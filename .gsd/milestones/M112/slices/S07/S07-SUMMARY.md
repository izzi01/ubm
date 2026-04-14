---
id: S07
parent: M112
milestone: M112
provides:
  - ["/bmad auto umbrella mode (all 4 phases sequential)", "/bmad auto --stop-after <phase> partial pipeline mode", "executeAutoPipeline() shared phase executor", "ALL_PHASES configuration constant", "/gsd build-from-spec BMAD→GSD orchestration command", "readBmadArtifacts() and composeGsdContext() helpers"]
requires:
  []
affects:
  []
key_files:
  - ["src/resources/extensions/umb/commands/bmad-commands.ts", "src/resources/extensions/umb/commands/gsd-commands.ts", "src/resources/extensions/umb/tests/bmad-commands.test.ts", "src/resources/extensions/umb/tests/gsd-commands.test.ts"]
key_decisions:
  - ["Refactored 4 near-identical phase handlers into shared executeAutoPipeline() rather than adding umbrella logic to each handler separately", "ALL_PHASES exported from bmad-commands.ts and consumed by gsd-commands.ts for the build-from-spec pipeline", "build-from-spec uses factory pattern with injectable pipelineRunner for testability — same pattern as gsd-tools"]
patterns_established:
  - ["executeAutoPipeline() shared executor pattern — single function handles flag parsing, pipeline execution, progress reporting, and error display for any phase", "PhaseConfig + ALL_PHASES configuration pattern — phases defined as data, not code, making it trivial to add/reorder phases", "build-from-spec factory pattern with pipelineRunner injection — allows testing the full orchestration without real pipeline execution", "ALL_PHASES exported as shared config between bmad-commands and gsd-commands modules"]
observability_surfaces:
  - none
drill_down_paths:
  []
duration: ""
verification_result: passed
completed_at: 2026-04-13T17:23:55.299Z
blocker_discovered: false
---

# S07: Integrate BMAD pipeline with gsd-orchestrator + /bmad auto umbrella command

**Added /bmad auto umbrella command (all phases + --stop-after), refactored 4 phase handlers into shared executeAutoPipeline(), and created /gsd build-from-spec for BMAD→GSD orchestration. 118 tests pass.**

## What Happened

## What Was Delivered

This slice completes M112 by integrating the BMAD 4-phase pipeline with GSD orchestration. Three deliverables:

**1. /bmad auto umbrella command (T01)**
The `/bmad auto` command now supports three modes:
- **No phase argument**: runs all 4 phases sequentially (analysis → planning → solutioning → implementation)
- **Phase argument**: delegates to the existing per-phase handler (backward compatible)
- **--stop-after <phase>**: runs phases up to and including the specified phase, then stops

Phase transitions are reported via `ctx.ui.setWidget()` with emoji progress indicators. Pipeline stops early on phase failure with a summary of completed phases.

**2. Shared executeAutoPipeline() refactoring (T01)**
The 4 near-identical phase handlers (handleBmadAutoAnalysis, handleBmadAutoPlanning, handleBmadAutoSolutioning, handleBmadAutoImplementation) were refactored into thin wrappers that delegate to a single `executeAutoPipeline()` helper. This shared executor handles:
- Flag parsing (--list, --dry-run, help)
- Pipeline execution via `runPipeline()`
- Progress reporting and result display
- Error handling with phase name context

The `PhaseConfig` interface and `ALL_PHASES` constant provide the configuration for each phase, making it trivial to add new phases.

**3. /gsd build-from-spec command (T02)**
A new `/gsd build-from-spec <message>` command that orchestrates the full BMAD → GSD workflow:
1. Runs all 4 BMAD pipeline phases sequentially (reusing `executeAutoPipeline()`)
2. Reads planning artifacts from `_bmad-output/planning-artifacts/` (PRD, architecture, etc.)
3. Composes a context string from the artifacts with filename headers and separators
4. Starts a new pi session with the composed context, instructing the LLM to use `gsd_milestone_plan`

Helper functions `readBmadArtifacts()` and `composeGsdContext()` are exported for testability. The pipeline runner is injectable via the factory pattern for testing.

## Test Coverage
- 60 bmad-commands tests (umbrella mode, stop-after, per-phase delegation, shared executor)
- 18 gsd-commands tests (build-from-spec usage, artifact reading, context composition, pipeline flow, failure modes, session lifecycle, artifact reporting)
- 40 bmad-pipeline tests (all 4 pipelines)
- **Total: 118 tests, all passing**

## Verification

All 118 tests pass across 3 test suites:
- `npx vitest run bmad-commands.test.ts` — 60/60 pass
- `npx vitest run gsd-commands.test.ts` — 18/18 pass
- `npx vitest run bmad-pipeline.test.ts` — 40/40 pass

Zero regressions in existing tests. The 5-6 failures in the broader test run are all dist-test/ artifacts (known incompatible fork-compiled tests documented in KNOWLEDGE.md) — no real test failures.

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

---
id: T02
parent: S07
milestone: M112
key_files:
  - src/resources/extensions/umb/commands/gsd-commands.ts
  - src/resources/extensions/umb/commands/bmad-commands.ts
  - src/resources/extensions/umb/tests/gsd-commands.test.ts
key_decisions:
  - (none)
duration: 
verification_result: passed
completed_at: 2026-04-13T17:13:27.277Z
blocker_discovered: false
---

# T02: Added /gsd build-from-spec command that runs all 4 BMAD pipeline phases, reads planning artifacts from _bmad-output/planning-artifacts/, composes context, and starts a GSD session for milestone planning

**Added /gsd build-from-spec command that runs all 4 BMAD pipeline phases, reads planning artifacts from _bmad-output/planning-artifacts/, composes context, and starts a GSD session for milestone planning**

## What Happened

Created the /gsd build-from-spec command in gsd-commands.ts that orchestrates the full BMAD → GSD workflow. The command accepts a project description and executes four steps: (1) runs all 4 BMAD pipeline phases sequentially using the shared executeAutoPipeline() from T01, stopping early on failure; (2) reads planning artifacts from _bmad-output/planning-artifacts/; (3) composes context from those artifacts with filename headers and separators; (4) starts a new pi session with the composed context including a gsd_milestone_plan instruction.

Added handleGsdBuildFromSpec to the existing createGsdCommandHandlers factory with optional pipelineRunner injection for testing. Exported ALL_PHASES from bmad-commands.ts for shared pipeline configuration. Created 18 tests covering usage hints, artifact reading, context composition, full pipeline flow, failure modes, session lifecycle, and artifact reporting. All 118 tests pass across 3 test suites with no regressions.

## Verification

All 18 new gsd-commands tests pass. All 60 existing bmad-commands tests pass (no regression from ALL_PHASES export). All 40 existing bmad-pipeline tests pass. Pipeline execution progress reported via ctx.ui.setWidget() at each phase transition. Errors from pipeline phases surfaced with phase name and detail. Artifact names and byte sizes reported in widget output.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `npx vitest run src/resources/extensions/umb/tests/gsd-commands.test.ts` | 0 | ✅ pass | 252ms |
| 2 | `npx vitest run src/resources/extensions/umb/tests/bmad-commands.test.ts` | 0 | ✅ pass | 248ms |
| 3 | `npx vitest run src/resources/extensions/umb/tests/bmad-pipeline.test.ts` | 0 | ✅ pass | 37ms |

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `src/resources/extensions/umb/commands/gsd-commands.ts`
- `src/resources/extensions/umb/commands/bmad-commands.ts`
- `src/resources/extensions/umb/tests/gsd-commands.test.ts`

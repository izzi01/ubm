# S07: Integrate BMAD pipeline with gsd-orchestrator + /bmad auto umbrella command

**Goal:** Complete the BMAD auto pipeline by adding the /bmad auto umbrella command that runs all 4 phases sequentially, refactoring duplicated phase handler code into a shared executor, and creating the /gsd build-from-spec command that orchestrates BMAD discovery → GSD milestone creation.
**Demo:** gsd-orchestrator build-from-spec workflow runs: (1) /bmad auto for discovery, (2) reads PRD + architecture, (3) passes to `gsd headless new-milestone --context`

## Must-Haves

- /bmad auto 'Build X' runs all 4 phases sequentially (analysis → planning → solutioning → implementation) when no phase argument is given\n- /bmad auto --stop-after planning 'Build X' runs only analysis and planning phases\n- Phase handler boilerplate is extracted into shared executeAutoPipeline() helper\n- /gsd build-from-spec 'Build X' command exists and runs BMAD pipeline → reads PRD + architecture → starts new session with context\n- All existing 92 tests continue to pass\n- New tests cover umbrella mode, stop-after flag, and build-from-spec orchestration

## Proof Level

- This slice proves: integration

## Integration Closure

- Upstream surfaces consumed: runPipeline(), ANALYSIS_PIPELINE, PLANNING_PIPELINE, SOLUTIONING_PIPELINE, IMPLEMENTATION_PIPELINE from bmad-pipeline/index.ts; loadBmadSkill(), resolveBmadConfig(), composeExecutionPrompt() from bmad-executor/index.ts; ctx.newSession() from ExtensionCommandContext\n- New wiring: handleBmadAuto() umbrella path calling runPipeline() for each phase sequentially; /gsd build-from-spec command registration in gsd-commands.ts\n- What remains: nothing — this is the final slice of M112

## Verification

- Pipeline execution progress reported via ctx.ui.setWidget() at each phase transition\n- Errors from any pipeline phase are surfaced with phase name and stage detail\n- /gsd build-from-spec reports which BMAD artifacts were read and their sizes

## Tasks

- [x] **T01: Add /bmad auto umbrella command and refactor phase handlers into shared executor** `est:est:1.5h`
  The /bmad auto command currently requires a phase argument (analysis, planning, solutioning, implementation). This task adds an umbrella mode: when /bmad auto is called with a message but NO phase argument, it runs all 4 phases sequentially. It also refactors the 4 near-identical phase handlers (handleBmadAutoAnalysis, handleBmadAutoPlanning, handleBmadAutoSolutioning, handleBmadAutoImplementation) which share ~80% boilerplate code into a single shared executeAutoPipeline() helper.
  - Files: `src/resources/extensions/umb/commands/bmad-commands.ts`, `src/resources/extensions/umb/tests/bmad-commands.test.ts`
  - Verify: npx vitest run src/resources/extensions/umb/tests/bmad-commands.test.ts — all existing tests pass plus new umbrella tests

- [x] **T02: Create /gsd build-from-spec command for BMAD-to-GSD orchestration** `est:est:1.5h`
  Create a new /gsd build-from-spec command that orchestrates the full BMAD → GSD workflow: (1) runs all BMAD pipeline phases sequentially to produce planning artifacts in _bmad-output/, (2) reads the PRD and architecture documents from _bmad-output/planning-artifacts/, (3) composes a context file with the BMAD artifacts, and (4) starts a new session with the composed context (simulating what gsd headless new-milestone --context would do). This is the gsd-orchestrator integration that the roadmap describes.
  - Files: `src/resources/extensions/umb/commands/gsd-commands.ts`, `src/resources/extensions/umb/tests/gsd-commands.test.ts`
  - Verify: npx vitest run src/resources/extensions/umb/tests/gsd-commands.test.ts — all tests pass including new build-from-spec tests

## Files Likely Touched

- src/resources/extensions/umb/commands/bmad-commands.ts
- src/resources/extensions/umb/tests/bmad-commands.test.ts
- src/resources/extensions/umb/commands/gsd-commands.ts
- src/resources/extensions/umb/tests/gsd-commands.test.ts

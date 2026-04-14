# S06: Implement /bmad auto-implementation (Phase 4 pipeline)

**Goal:** Add IMPLEMENTATION_PIPELINE (4 stages) and /bmad auto-implementation command with full handler, dispatch, and tests.
**Demo:** `/bmad auto-implementation` runs sprint-planning → create-story → dev-story → code-review cycle using dev agent, reads Phase 3 artifacts

## Must-Haves

- IMPLEMENTATION_PIPELINE defined with 4 stages in correct order: bmad-sprint-planning, bmad-create-story, bmad-dev-story, bmad-code-review\n- All stages use phase '4-implementation'\n- IMPLEMENTATION_PIPELINE exported from index.ts and imported in bmad-commands.ts\n- handleBmadAutoImplementation follows the established handler pattern (help, --list, --dry-run, execution)\n- AUTO_PHASES marks implementation as implemented: true\n- 'implementation' dispatch branch in handleBmadAuto\n- 'bmad auto-implementation' command registered\n- 16 new tests pass (9 pipeline + 7 command), zero regressions\n- /bmad auto-implementation command is discoverable via /bmad auto help

## Proof Level

- This slice proves: contract

## Integration Closure

Upstream surfaces consumed: PipelineDefinition type, runPipeline executor, PIPELINES array pattern from S05. New wiring: IMPLEMENTATION_PIPELINE constant + handleBmadAutoImplementation handler + dispatch branch + command registration. What remains: S07 (umbrella /bmad auto) will chain all 4 phases.

## Verification

- none

## Tasks

- [x] **T01: Define IMPLEMENTATION_PIPELINE and add tests** `est:45m`
  Add IMPLEMENTATION_PIPELINE constant to pipelines.ts with 4 stages (bmad-sprint-planning, bmad-create-story, bmad-dev-story, bmad-code-review) all using phase '4-implementation'. Add to PIPELINES array and export from index.ts. Add 9 pipeline tests: structure (3), lookup (2), sequential execution (1), context accumulation (1), failure on missing required (1), dryRun (1).
  - Files: `src/resources/extensions/umb/bmad-pipeline/pipelines.ts`, `src/resources/extensions/umb/bmad-pipeline/index.ts`, `src/resources/extensions/umb/tests/bmad-pipeline.test.ts`
  - Verify: npx vitest run src/resources/extensions/umb/tests/bmad-pipeline.test.ts

- [x] **T02: Add handleBmadAutoImplementation handler, dispatch, and command tests** `est:45m`
  Clone handleBmadAutoSolutioning pattern to create handleBmadAutoImplementation. Update AUTO_PHASES to mark implementation as implemented: true. Add 'implementation' dispatch branch in handleBmadAuto. Register 'bmad auto-implementation' command. Add 7 command tests: help text, --list, --dry-run, full execution, cancellation, session error, and dispatch routing.
  - Files: `src/resources/extensions/umb/commands/bmad-commands.ts`, `src/resources/extensions/umb/tests/bmad-commands.test.ts`
  - Verify: npx vitest run src/resources/extensions/umb/tests/bmad-commands.test.ts

## Files Likely Touched

- src/resources/extensions/umb/bmad-pipeline/pipelines.ts
- src/resources/extensions/umb/bmad-pipeline/index.ts
- src/resources/extensions/umb/tests/bmad-pipeline.test.ts
- src/resources/extensions/umb/commands/bmad-commands.ts
- src/resources/extensions/umb/tests/bmad-commands.test.ts

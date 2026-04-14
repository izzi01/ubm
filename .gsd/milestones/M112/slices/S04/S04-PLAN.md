# S04: Implement /bmad auto-planning (Phase 2 pipeline)

**Goal:** Add PLANNING_PIPELINE definition (create-prd → create-ux-design) and /bmad auto-planning command that executes Phase 2 workflows, reusing S03's pipeline infrastructure.
**Demo:** `/bmad auto-planning 'Build a REST API'` runs create-prd → create-ux-design workflows using PM + UX agents, reads Phase 1 artifacts as context

## Must-Haves

- PLANNING_PIPELINE is defined with create-prd → create-ux-design stages in 2-plan-workflows phase\n- /bmad auto-planning 'Build a REST API' runs both stages sequentially with context accumulation\n- /bmad auto planning dispatches to the new handler\n- /bmad auto --list shows both analysis and planning pipelines\n- All existing S03 tests still pass (no regressions)

## Proof Level

- This slice proves: integration

## Integration Closure

- Upstream surfaces consumed: bmad-pipeline module (types.ts, pipelines.ts, executor.ts, index.ts) from S03\n- New wiring: PLANNING_PIPELINE definition, handleBmadAutoPlanning handler, /bmad auto routing update, command registration\n- What remains: S05 (auto-solutioning) and S06 (auto-implementation) will add the remaining two phases using the same pattern

## Verification

- Runtime signals: same pipeline result status/completion tracking as S03's ANALYSIS_PIPELINE\n- Inspection surfaces: /bmad auto-planning --dry-run, /bmad auto --list

## Tasks

- [x] **T01: Define PLANNING_PIPELINE and add pipeline tests** `est:30m`
  Add PLANNING_PIPELINE to pipelines.ts with two stages (bmad-create-prd, bmad-create-ux-design) in 2-plan-workflows phase. Export it from index.ts. Add pipeline structure tests, lookup tests, and executor tests for the new pipeline following S03's test patterns.
  - Files: `src/resources/extensions/umb/bmad-pipeline/pipelines.ts`, `src/resources/extensions/umb/bmad-pipeline/index.ts`, `src/resources/extensions/umb/tests/bmad-pipeline.test.ts`
  - Verify: npx vitest run src/resources/extensions/umb/tests/bmad-pipeline.test.ts

- [x] **T02: Wire handleBmadAutoPlanning command and add command tests** `est:45m`
  Create handleBmadAutoPlanning handler (same pattern as handleBmadAutoAnalysis: help, --list, --dry-run, full execution). Update handleBmadAuto to dispatch 'planning' phase. Update AUTO_PHASES to mark planning as implemented. Register 'bmad auto-planning' command. Add command tests covering all paths.
  - Files: `src/resources/extensions/umb/commands/bmad-commands.ts`, `src/resources/extensions/umb/tests/bmad-commands.test.ts`
  - Verify: npx vitest run src/resources/extensions/umb/tests/bmad-commands.test.ts

## Files Likely Touched

- src/resources/extensions/umb/bmad-pipeline/pipelines.ts
- src/resources/extensions/umb/bmad-pipeline/index.ts
- src/resources/extensions/umb/tests/bmad-pipeline.test.ts
- src/resources/extensions/umb/commands/bmad-commands.ts
- src/resources/extensions/umb/tests/bmad-commands.test.ts

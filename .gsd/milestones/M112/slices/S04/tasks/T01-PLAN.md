---
estimated_steps: 5
estimated_files: 3
skills_used: []
---

# T01: Define PLANNING_PIPELINE and add pipeline tests

**Slice:** S04 — Implement /bmad auto-planning (Phase 2 pipeline)
**Milestone:** M112

## Description

Add PLANNING_PIPELINE to `pipelines.ts` with two stages (bmad-create-prd, bmad-create-ux-design) in the 2-plan-workflows phase. Export it from `index.ts`. Add pipeline structure tests, lookup tests, and executor tests for the new pipeline following S03's existing test patterns.

## Steps

1. Open `src/resources/extensions/umb/bmad-pipeline/pipelines.ts`
2. Add `PLANNING_PIPELINE` const after `ANALYSIS_PIPELINE` with:
   - `id: 'planning'`
   - `name: 'Phase 2 Planning'`
   - Two stages:
     - `{ skill: 'bmad-create-prd', description: 'Create a product requirements document from Phase 1 research', phase: '2-plan-workflows', optional: false }`
     - `{ skill: 'bmad-create-ux-design', description: 'Plan UX patterns and design specifications based on the PRD', phase: '2-plan-workflows', optional: false }`
3. Add `PLANNING_PIPELINE` to the `PIPELINES` array
4. Open `src/resources/extensions/umb/bmad-pipeline/index.ts` and add `PLANNING_PIPELINE` to the export
5. Open `src/resources/extensions/umb/tests/bmad-pipeline.test.ts` and add new describe blocks:
   - `PLANNING_PIPELINE structure` — test it has 2 stages in correct order, correct phase assignments, both stages required
   - `getPipeline('planning')` — test lookup returns the pipeline, nonexistent returns null
   - `listPipelines()` — test it now returns 2 pipelines
   - `runPipeline — PLANNING_PIPELINE sequential execution` — create test skills, mock sessionFactory, verify both stages execute in order
   - `runPipeline — PLANNING_PIPELINE context accumulation` — verify second stage prompt includes "Completed: bmad-create-prd"
   - `runPipeline — PLANNING_PIPELINE failure on missing required stage` — omit bmad-create-ux-design, verify pipeline fails at that stage

## Must-Haves

- [ ] PLANNING_PIPELINE exported from `src/resources/extensions/umb/bmad-pipeline/index.ts`
- [ ] Pipeline has exactly 2 stages: bmad-create-prd → bmad-create-ux-design
- [ ] Both stages have phase '2-plan-workflows' and optional: false
- [ ] getPipeline('planning') returns the pipeline
- [ ] listPipelines() returns 2 pipelines (analysis + planning)
- [ ] All new tests pass alongside all existing S03 pipeline tests (no regressions)

## Verification

- `npx vitest run src/resources/extensions/umb/tests/bmad-pipeline.test.ts` — all tests pass (existing 15 + new ~10)

## Inputs

- `src/resources/extensions/umb/bmad-pipeline/types.ts` — PipelineStage, PipelineDefinition interfaces
- `src/resources/extensions/umb/bmad-pipeline/pipelines.ts` — existing ANALYSIS_PIPELINE, PIPELINES array
- `src/resources/extensions/umb/bmad-pipeline/executor.ts` — runPipeline function
- `src/resources/extensions/umb/bmad-pipeline/index.ts` — barrel exports
- `src/resources/extensions/umb/tests/bmad-pipeline.test.ts` — existing 15 pipeline tests (must not break)

## Expected Output

- `src/resources/extensions/umb/bmad-pipeline/pipelines.ts` — add PLANNING_PIPELINE definition + register in PIPELINES array
- `src/resources/extensions/umb/bmad-pipeline/index.ts` — add PLANNING_PIPELINE to exports
- `src/resources/extensions/umb/tests/bmad-pipeline.test.ts` — add ~10 new tests for PLANNING_PIPELINE

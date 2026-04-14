---
estimated_steps: 5
estimated_files: 3
skills_used: []
---

# T01: Define IMPLEMENTATION_PIPELINE and add tests

**Slice:** S06 — Implement /bmad auto-implementation (Phase 4 pipeline)
**Milestone:** M112

## Description

Add the Phase 4 Implementation pipeline definition following the exact same pattern as SOLUTIONING_PIPELINE (S05). The pipeline has 4 stages — sprint-planning → create-story → dev-story → code-review — all using the `4-implementation` phase identifier. Register it in the PIPELINES array and export from index.ts. Add 9 new tests.

## Steps

1. **Define IMPLEMENTATION_PIPELINE in `pipelines.ts`:** Add a new `PipelineDefinition` constant with `id: 'implementation'`, `name: 'Phase 4 Implementation'`, and 4 stages. All stages use `phase: '4-implementation'` and `optional: false`. Stage order: `bmad-sprint-planning`, `bmad-create-story`, `bmad-dev-story`, `bmad-code-review`. Place it after SOLUTIONING_PIPELINE.

2. **Register in PIPELINES array:** Add `IMPLEMENTATION_PIPELINE` to the `PIPELINES` const array in pipelines.ts (alongside ANALYSIS_PIPELINE, PLANNING_PIPELINE, SOLUTIONING_PIPELINE).

3. **Export from index.ts:** Add `IMPLEMENTATION_PIPELINE` to the export statement in `bmad-pipeline/index.ts`.

4. **Add pipeline tests in `bmad-pipeline.test.ts`:** Import `IMPLEMENTATION_PIPELINE` from index.ts (it's already imported alongside PLANNING_PIPELINE and SOLUTIONING_PIPELINE — add IMPLEMENTATION_PIPELINE there). Add these test blocks:
   - `SOLUTIONING_PIPELINE structure` is already a describe block — add a new `IMPLEMENTATION_PIPELINE structure` describe with 3 tests:
     - "has 4 stages in correct order" — assert `id === 'implementation'`, `stages.length === 4`, skill names array equals `['bmad-sprint-planning', 'bmad-create-story', 'bmad-dev-story', 'bmad-code-review']`
     - "has correct phase assignments" — assert every stage has `phase === '4-implementation'`
     - "all stages are required" — assert every stage has `optional === false`
   - `getPipeline('implementation')` describe with 2 tests:
     - "returns the implementation pipeline" — assert non-null, id matches, 4 stages
     - "getPipeline('nonexistent-implementation') returns null"
   - `runPipeline — IMPLEMENTATION_PIPELINE sequential execution` describe with 1 test:
     - Create helper `createAllImplementationSkills(dir)` that creates 4 skills in phase `4-implementation`
     - Assert completed status, 4 completedStages, 0 skipped, execution order matches
   - `runPipeline — IMPLEMENTATION_PIPELINE context accumulation` describe with 1 test:
     - Assert first prompt has user message but no "Previous Pipeline Stages Completed"
     - Assert second prompt includes "Completed: bmad-sprint-planning"
     - Assert fourth prompt includes all 3 previous completions
   - `runPipeline — IMPLEMENTATION_PIPELINE failure on missing required stage` describe with 1 test:
     - Create only sprint-planning and create-story, omit dev-story and code-review
     - Assert status === 'failed', failedStage skill === 'bmad-dev-story', error contains 'not found'

5. **Update listPipelines count assertion:** Find the existing test `listPipelines() returns 3 pipelines` and update it to expect 4 pipelines, adding a check for `'implementation'`.

## Must-Haves

- [ ] IMPLEMENTATION_PIPELINE defined with id 'implementation' and 4 stages
- [ ] All stages use phase '4-implementation' and optional: false
- [ ] IMPLEMENTATION_PIPELINE added to PIPELINES array
- [ ] IMPLEMENTATION_PIPELINE exported from index.ts
- [ ] 9 new tests pass: 3 structure + 2 lookup + 1 sequential + 1 context accumulation + 1 failure + 1 listPipelines update
- [ ] Zero test regressions (all existing tests still pass)

## Verification

- `npx vitest run src/resources/extensions/umb/tests/bmad-pipeline.test.ts` — all tests pass (41+ total, up from 32)
- `grep -q "IMPLEMENTATION_PIPELINE" src/resources/extensions/umb/bmad-pipeline/index.ts` — export confirmed

## Inputs

- `src/resources/extensions/umb/bmad-pipeline/pipelines.ts` — existing pipeline definitions (ANALYSIS, PLANNING, SOLUTIONING) to follow pattern
- `src/resources/extensions/umb/bmad-pipeline/index.ts` — current exports to extend
- `src/resources/extensions/umb/tests/bmad-pipeline.test.ts` — existing test patterns and helpers (createSkill, createConfig, createTestDir)

## Expected Output

- `src/resources/extensions/umb/bmad-pipeline/pipelines.ts` — IMPLEMENTATION_PIPELINE constant added
- `src/resources/extensions/umb/bmad-pipeline/index.ts` — IMPLEMENTATION_PIPELINE export added
- `src/resources/extensions/umb/tests/bmad-pipeline.test.ts` — 9 new implementation pipeline tests added

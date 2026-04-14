---
estimated_steps: 1
estimated_files: 3
skills_used: []
---

# T01: Define SOLUTIONING_PIPELINE and add pipeline tests

Add SOLUTIONING_PIPELINE to pipelines.ts with 3 stages from the 3-solutioning phase: bmad-create-architecture, bmad-create-epics-and-stories, bmad-check-implementation-readiness. Export from index.ts. Add pipeline structure, lookup, sequential execution, context accumulation, and failure tests following the PLANNING_PIPELINE test pattern.

## Inputs

- ``src/resources/extensions/umb/bmad-pipeline/pipelines.ts` — existing ANALYSIS_PIPELINE and PLANNING_PIPELINE definitions to follow`
- ``src/resources/extensions/umb/bmad-pipeline/index.ts` — current exports to extend`
- ``src/resources/extensions/umb/tests/bmad-pipeline.test.ts` — PLANNING_PIPELINE test pattern to replicate`
- ``_bmad/bmm/3-solutioning/bmad-create-architecture/SKILL.md` — skill exists at this path`
- ``_bmad/bmm/3-solutioning/bmad-create-epics-and-stories/SKILL.md` — skill exists at this path`
- ``_bmad/bmm/3-solutioning/bmad-check-implementation-readiness/SKILL.md` — skill exists at this path`

## Expected Output

- ``src/resources/extensions/umb/bmad-pipeline/pipelines.ts` — SOLUTIONING_PIPELINE constant added with 3 stages`
- ``src/resources/extensions/umb/bmad-pipeline/index.ts` — SOLUTIONING_PIPELINE exported`
- ``src/resources/extensions/umb/tests/bmad-pipeline.test.ts` — ~9 new tests: structure validation, getPipeline lookup, listPipelines count (now 3), sequential execution, context accumulation, failure on missing required stage`

## Verification

npx vitest run src/resources/extensions/umb/tests/bmad-pipeline.test.ts

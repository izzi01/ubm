# S05: Implement /bmad auto-solutioning (Phase 3 pipeline)

**Goal:** Add SOLUTIONING_PIPELINE (3 stages) and /bmad auto-solutioning command, reusing S03's pipeline infrastructure and S04's handler pattern.
**Demo:** `/bmad auto-solutioning 'Build a REST API'` runs create-architecture → create-epics-and-stories → implementation-readiness using architect + PM agents

## Must-Haves

- `/bmad auto-solutioning 'Build a REST API'` runs create-architecture → create-epics-and-stories → implementation-readiness stages
- `/bmad auto solutioning` dispatches to the solutioning handler
- All existing tests pass with zero regressions
- New pipeline and command tests cover structure, execution, dry-run, and failure paths

## Proof Level

- This slice proves: integration

## Integration Closure

- Upstream surfaces consumed: runPipeline executor, SessionFactory type, ExtensionCommandContext
- New wiring: SOLUTIONING_PIPELINE definition + handleBmadAutoSolutioning handler + AUTO_PHASES dispatch + command registration
- What remains: S06 (implementation pipeline) and S07 (umbrella /bmad auto chaining all 4 phases)

## Verification

- Not provided.

## Tasks

- [x] **T01: Define SOLUTIONING_PIPELINE and add pipeline tests** `est:45m`
  Add SOLUTIONING_PIPELINE to pipelines.ts with 3 stages from the 3-solutioning phase: bmad-create-architecture, bmad-create-epics-and-stories, bmad-check-implementation-readiness. Export from index.ts. Add pipeline structure, lookup, sequential execution, context accumulation, and failure tests following the PLANNING_PIPELINE test pattern.
  - Files: `src/resources/extensions/umb/bmad-pipeline/pipelines.ts`, `src/resources/extensions/umb/bmad-pipeline/index.ts`, `src/resources/extensions/umb/tests/bmad-pipeline.test.ts`
  - Verify: npx vitest run src/resources/extensions/umb/tests/bmad-pipeline.test.ts

- [x] **T02: Wire handleBmadAutoSolutioning handler and register command** `est:45m`
  Create handleBmadAutoSolutioning in bmad-commands.ts following the exact handleBmadAutoPlanning pattern (help, --list, --dry-run, full execution). Update AUTO_PHASES to mark solutioning as implemented. Add dispatch branch for 'solutioning' in handleBmadAuto. Register bmad auto-solutioning command. Add command tests following the handleBmadAutoPlanning test pattern.
  - Files: `src/resources/extensions/umb/commands/bmad-commands.ts`, `src/resources/extensions/umb/tests/bmad-commands.test.ts`
  - Verify: npx vitest run src/resources/extensions/umb/tests/bmad-commands.test.ts

## Files Likely Touched

- src/resources/extensions/umb/bmad-pipeline/pipelines.ts
- src/resources/extensions/umb/bmad-pipeline/index.ts
- src/resources/extensions/umb/tests/bmad-pipeline.test.ts
- src/resources/extensions/umb/commands/bmad-commands.ts
- src/resources/extensions/umb/tests/bmad-commands.test.ts

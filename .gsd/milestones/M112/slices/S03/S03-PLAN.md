# S03: Implement /bmad auto-analysis (Phase 1 pipeline)

**Goal:** Implement the /bmad auto-analysis command that chains Phase 1 BMAD skills (domain-research → market-research → technical-research → product-brief → prfaq → document-project) into a sequential pipeline, executing each in its own pi session with accumulated context, and producing analysis artifacts in _bmad-output/planning-artifacts/.
**Demo:** `/bmad auto-analysis 'Build a REST API'` runs research → brief → prfaq → document-project workflows using analyst agent, produces analysis artifacts in `_bmad-output/planning-artifacts/`

## Must-Haves

- `/bmad auto-analysis 'Build a REST API'` is a recognized command that executes 6 analysis pipeline stages sequentially\n- Each stage loads its BMAD skill via the S02 executor and creates a new pi session\n- Context from prior stages is accumulated and passed to subsequent stages\n- Optional stages (prfaq) are gracefully skipped if the skill is not loadable\n- `--dry-run` flag previews the pipeline without creating sessions\n- `--list` flag shows all pipeline stages with descriptions\n- Pipeline module is independently testable with mock session factory\n- All existing tests continue to pass (zero regressions)

## Proof Level

- This slice proves: integration

## Integration Closure

- Upstream surfaces consumed: bmad-executor module (loadBmadSkill, resolveBmadConfig, composeExecutionPrompt) from S02, ctx.newSession from pi extension API\n- New wiring introduced: bmad-pipeline module + /bmad auto-analysis command registration\n- What remains: S04-S06 will add auto-planning, auto-solutioning, auto-implementation pipelines using the same bmad-pipeline infrastructure; S07 will add the umbrella /bmad auto command and gsd-orchestrator integration

## Verification

- Pipeline execution shows per-stage progress via ctx.ui.setWidget\n- Each stage completion is reported with skill name and status\n- Final summary shows completed/skipped/failed counts\n- Failed stages include error messages in the widget output

## Tasks

- [x] **T01: Build bmad-pipeline module with Phase 1 analysis pipeline definition and executor** `est:45m`
  Create the bmad-pipeline module that defines the Phase 1 analysis workflow as an ordered list of stages and provides a runPipeline() function to execute them sequentially.

Steps:
1. Create `src/resources/extensions/umb/bmad-pipeline/types.ts` with:
   - `PipelineStage` interface: `{ skill: string, description: string, phase: string, optional: boolean }`
   - `PipelineDefinition` interface: `{ id: string, name: string, description: string, stages: PipelineStage[] }`
   - `PipelineResult` interface: `{ pipeline: PipelineDefinition, completedStages: PipelineStageResult[], skippedStages: string[], status: 'completed' | 'partial' | 'failed' }`
   - `PipelineStageResult` interface: `{ stage: PipelineStage, status: 'completed' | 'skipped' | 'failed', error?: string }`

2. Create `src/resources/extensions/umb/bmad-pipeline/pipelines.ts` with:
   - Export `ANALYSIS_PIPELINE: PipelineDefinition` — the Phase 1 pipeline with these stages in order:
     - bmad-domain-research (phase: 1-analysis/research)
     - bmad-market-research (phase: 1-analysis/research)
     - bmad-technical-research (phase: 1-analysis/research)
     - bmad-product-brief (phase: 1-analysis, optional: false)
     - bmad-prfaq (phase: 1-analysis, optional: true — manifest says is-required: false)
     - bmad-document-project (phase: 1-analysis)
   - Export `getPipeline(id: string): PipelineDefinition | null` — lookup by id
   - Export `listPipelines(): PipelineDefinition[]` — return all defined pipelines

3. Create `src/resources/extensions/umb/bmad-pipeline/executor.ts` with:
   - Export `runPipeline(pipeline: PipelineDefinition, userMessage: string, cwd: string, sessionFactory: SessionFactory, opts?: { dryRun?: boolean }): Promise<PipelineResult>`
   - `SessionFactory` type: `(prompt: string, skillName: string) => Promise<{ cancelled: boolean; error?: string }>`
   - Execution logic:
     a. Resolve config via `resolveBmadConfig(cwd)` once at start
     b. For each stage in pipeline.stages:
        - If dryRun, mark as 'completed' and continue (no session created)
        - Load skill via `loadBmadSkill(stage.skill, cwd)`
        - If skill not found and stage.optional, skip and record
        - If skill not found and !stage.optional, fail pipeline
        - Compose prompt via `composeExecutionPrompt(skill, config, userMessage + accumulatedContext)`
        - Call sessionFactory with the composed prompt
        - If cancelled or error, fail pipeline (or skip if optional)
        - Append stage result to accumulated context summary
     c. Return PipelineResult
   - Accumulated context format: for each completed stage, append a section `## Completed: {stage.skill}\n{stage.description}\n` to a running context string that gets appended to the user message for subsequent stages

4. Create `src/resources/extensions/umb/bmad-pipeline/index.ts` barrel exporting all public types and functions.

5. Create `src/resources/extensions/umb/tests/bmad-pipeline.test.ts` with tests:
   - ANALYSIS_PIPELINE has 6 stages in correct order
   - getPipeline('analysis') returns the analysis pipeline
   - getPipeline('nonexistent') returns null
   - listPipelines() returns at least 1 pipeline
   - runPipeline with dryRun completes all stages without sessions
   - runPipeline with mock sessionFactory executes stages sequentially
   - runPipeline skips optional stages when skill not found
   - runPipeline fails on required stage skill not found
   - runPipeline accumulates context between stages
   - Use the createTestDir/createSkill helper pattern from bmad-commands.test.ts to set up _bmad/ fixtures
   - Use node:test and node:assert (matching existing test conventions)
  - Files: `src/resources/extensions/umb/bmad-pipeline/types.ts`, `src/resources/extensions/umb/bmad-pipeline/pipelines.ts`, `src/resources/extensions/umb/bmad-pipeline/executor.ts`, `src/resources/extensions/umb/bmad-pipeline/index.ts`, `src/resources/extensions/umb/tests/bmad-pipeline.test.ts`
  - Verify: npx vitest run tests/bmad-pipeline.test.ts

- [x] **T02: Wire /bmad auto-analysis command and integrate with bmad-pipeline module** `est:45m`
  Add the /bmad auto-analysis command handler that invokes the Phase 1 pipeline, and register it alongside existing /bmad commands.

Steps:
1. In `src/resources/extensions/umb/commands/bmad-commands.ts`, add:
   - Import `runPipeline`, `ANALYSIS_PIPELINE`, `listPipelines` from `../bmad-pipeline/index.js`
   - Add `handleBmadAutoAnalysis(args, ctx)` handler:
     a. Parse args: first token is subcommand or empty, rest is user message
     b. If no args or args === 'help': show usage with pipeline stage list
     c. If args starts with '--list' or '--dry-run': show pipeline stages with status indicators (no execution)
     d. Otherwise: treat entire args as user message, run ANALYSIS_PIPELINE
     e. Build sessionFactory from ctx.newSession — wraps the prompt in a session setup call
     f. Display progress via ctx.ui.setWidget — show each stage as it starts/completes
     g. On completion, show summary of completed/skipped/failed stages
     h. On failure, show which stage failed and why
   - Add `handleBmadAuto(args, ctx)` handler:
     a. Show usage: '/bmad auto <phase> <message>' with available phases (analysis, planning, solutioning, implementation)
     b. For now, only 'analysis' is implemented — show 'coming soon' for others

2. Register new commands in `registerBmadCommands()`:
   - `bmad auto-analysis` — description: 'Run Phase 1 analysis pipeline (research → brief → prfaq → document-project)'
   - `bmad auto` — description: 'Run a BMAD auto pipeline phase'

3. Add tests to `src/resources/extensions/umb/tests/bmad-commands.test.ts`:
   - handleBmadAutoAnalysis with no args shows usage
   - handleBmadAutoAnalysis with --list shows pipeline stages
   - handleBmadAutoAnalysis with --dry-run shows stages without creating sessions
   - handleBmadAutoAnalysis with message creates sessions for each stage
   - handleBmadAutoAnalysis with message shows progress widget
   - handleBmadAuto with no args shows available phases
   - handleBmadAuto with 'analysis' delegates to auto-analysis
   - handleBmadAuto with unimplemented phase shows 'coming soon'
   - Use existing createMockCtx pattern from the test file
   - Mock sessionFactory via ctx.newSession to track calls

4. Verify full test suite passes (109 existing + new tests).
  - Files: `src/resources/extensions/umb/commands/bmad-commands.ts`, `src/resources/extensions/umb/tests/bmad-commands.test.ts`
  - Verify: npx vitest run tests/bmad-commands.test.ts && npx vitest run tests/bmad-pipeline.test.ts

## Files Likely Touched

- src/resources/extensions/umb/bmad-pipeline/types.ts
- src/resources/extensions/umb/bmad-pipeline/pipelines.ts
- src/resources/extensions/umb/bmad-pipeline/executor.ts
- src/resources/extensions/umb/bmad-pipeline/index.ts
- src/resources/extensions/umb/tests/bmad-pipeline.test.ts
- src/resources/extensions/umb/commands/bmad-commands.ts
- src/resources/extensions/umb/tests/bmad-commands.test.ts

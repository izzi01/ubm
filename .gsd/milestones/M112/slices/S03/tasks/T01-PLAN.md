---
estimated_steps: 46
estimated_files: 5
skills_used: []
---

# T01: Build bmad-pipeline module with Phase 1 analysis pipeline definition and executor

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

## Inputs

- `src/resources/extensions/umb/bmad-executor/types.ts`
- `src/resources/extensions/umb/bmad-executor/loader.ts`
- `src/resources/extensions/umb/bmad-executor/index.ts`
- `src/resources/extensions/umb/tests/bmad-commands.test.ts`

## Expected Output

- `src/resources/extensions/umb/bmad-pipeline/types.ts`
- `src/resources/extensions/umb/bmad-pipeline/pipelines.ts`
- `src/resources/extensions/umb/bmad-pipeline/executor.ts`
- `src/resources/extensions/umb/bmad-pipeline/index.ts`
- `src/resources/extensions/umb/tests/bmad-pipeline.test.ts`

## Verification

npx vitest run tests/bmad-pipeline.test.ts

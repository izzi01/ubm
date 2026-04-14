---
estimated_steps: 31
estimated_files: 2
skills_used: []
---

# T02: Wire /bmad auto-analysis command and integrate with bmad-pipeline module

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

## Inputs

- `src/resources/extensions/umb/bmad-pipeline/types.ts`
- `src/resources/extensions/umb/bmad-pipeline/pipelines.ts`
- `src/resources/extensions/umb/bmad-pipeline/executor.ts`
- `src/resources/extensions/umb/bmad-pipeline/index.ts`
- `src/resources/extensions/umb/commands/bmad-commands.ts`
- `src/resources/extensions/umb/tests/bmad-commands.test.ts`

## Expected Output

- `src/resources/extensions/umb/commands/bmad-commands.ts`
- `src/resources/extensions/umb/tests/bmad-commands.test.ts`

## Verification

npx vitest run tests/bmad-commands.test.ts && npx vitest run tests/bmad-pipeline.test.ts

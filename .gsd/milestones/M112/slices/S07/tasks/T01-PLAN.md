---
estimated_steps: 1
estimated_files: 2
skills_used: []
---

# T01: Add /bmad auto umbrella command and refactor phase handlers into shared executor

The /bmad auto command currently requires a phase argument (analysis, planning, solutioning, implementation). This task adds an umbrella mode: when /bmad auto is called with a message but NO phase argument, it runs all 4 phases sequentially. It also refactors the 4 near-identical phase handlers (handleBmadAutoAnalysis, handleBmadAutoPlanning, handleBmadAutoSolutioning, handleBmadAutoImplementation) which share ~80% boilerplate code into a single shared executeAutoPipeline() helper.

## Inputs

- `src/resources/extensions/umb/commands/bmad-commands.ts`
- `src/resources/extensions/umb/tests/bmad-commands.test.ts`
- `src/resources/extensions/umb/bmad-pipeline/index.ts`

## Expected Output

- `src/resources/extensions/umb/commands/bmad-commands.ts`
- `src/resources/extensions/umb/tests/bmad-commands.test.ts`

## Verification

npx vitest run src/resources/extensions/umb/tests/bmad-commands.test.ts — all existing tests pass plus new umbrella tests

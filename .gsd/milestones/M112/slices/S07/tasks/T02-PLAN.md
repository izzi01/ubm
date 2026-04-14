---
estimated_steps: 1
estimated_files: 2
skills_used: []
---

# T02: Create /gsd build-from-spec command for BMAD-to-GSD orchestration

Create a new /gsd build-from-spec command that orchestrates the full BMAD → GSD workflow: (1) runs all BMAD pipeline phases sequentially to produce planning artifacts in _bmad-output/, (2) reads the PRD and architecture documents from _bmad-output/planning-artifacts/, (3) composes a context file with the BMAD artifacts, and (4) starts a new session with the composed context (simulating what gsd headless new-milestone --context would do). This is the gsd-orchestrator integration that the roadmap describes.

## Inputs

- `src/resources/extensions/umb/commands/gsd-commands.ts`
- `src/resources/extensions/umb/bmad-pipeline/index.ts`
- `src/resources/extensions/umb/bmad-executor/index.ts`

## Expected Output

- `src/resources/extensions/umb/commands/gsd-commands.ts`
- `src/resources/extensions/umb/tests/gsd-commands.test.ts`

## Verification

npx vitest run src/resources/extensions/umb/tests/gsd-commands.test.ts — all tests pass including new build-from-spec tests

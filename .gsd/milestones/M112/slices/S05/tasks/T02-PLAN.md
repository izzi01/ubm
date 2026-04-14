---
estimated_steps: 1
estimated_files: 2
skills_used: []
---

# T02: Wire handleBmadAutoSolutioning handler and register command

Create handleBmadAutoSolutioning in bmad-commands.ts following the exact handleBmadAutoPlanning pattern (help, --list, --dry-run, full execution). Update AUTO_PHASES to mark solutioning as implemented. Add dispatch branch for 'solutioning' in handleBmadAuto. Register bmad auto-solutioning command. Add command tests following the handleBmadAutoPlanning test pattern.

## Inputs

- ``src/resources/extensions/umb/commands/bmad-commands.ts` — existing handleBmadAutoPlanning and handleBmadAuto to follow`
- ``src/resources/extensions/umb/tests/bmad-commands.test.ts` — handleBmadAutoPlanning test pattern to replicate`
- ``src/resources/extensions/umb/bmad-pipeline/index.ts` — SOLUTIONING_PIPELINE export from T01`

## Expected Output

- ``src/resources/extensions/umb/commands/bmad-commands.ts` — handleBmadAutoSolutioning function, AUTO_PHASES updated (solutioning: implemented: true), dispatch branch in handleBmadAuto, command registered`
- ``src/resources/extensions/umb/tests/bmad-commands.test.ts` — ~7 new tests: usage/help, --list, --dry-run, full execution with sessions, progress widget, failure summary, handleBmadAuto delegates to solutioning`

## Verification

npx vitest run src/resources/extensions/umb/tests/bmad-commands.test.ts

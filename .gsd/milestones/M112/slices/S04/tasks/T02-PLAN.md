---
estimated_steps: 6
estimated_files: 2
skills_used: []
---

# T02: Wire handleBmadAutoPlanning command and add command tests

**Slice:** S04 — Implement /bmad auto-planning (Phase 2 pipeline)
**Milestone:** M112

## Description

Create `handleBmadAutoPlanning` handler following the exact same pattern as `handleBmadAutoAnalysis`. Update `handleBmadAuto` to dispatch "planning" phase to the new handler. Update `AUTO_PHASES` to mark planning as implemented. Register the `/bmad auto-planning` command. Add command tests covering all paths.

## Steps

1. Open `src/resources/extensions/umb/commands/bmad-commands.ts`
2. Import `PLANNING_PIPELINE` from `../bmad-pipeline/index.js` (add to existing import)
3. Create `handleBmadAutoPlanning` function — copy `handleBmadAutoAnalysis` structure and adapt:
   - Help/no-args: show PLANNING_PIPELINE stages instead of ANALYSIS_PIPELINE
   - `--list`: already handled by `listPipelines()` (no change needed, but test that planning shows up)
   - `--dry-run`: call `runPipeline(PLANNING_PIPELINE, ...)` instead of ANALYSIS_PIPELINE
   - Full execution: same sessionFactory pattern, same result rendering
4. In `handleBmadAuto`, update `AUTO_PHASES` to set `implemented: true` for planning
5. In `handleBmadAuto`, add a dispatch branch: `if (phaseName === "planning") { await handleBmadAutoPlanning(message, ctx); return; }`
6. In `registerBmadCommands`, add: `pi.registerCommand("bmad auto-planning", { description: "Run Phase 2 planning pipeline (create-prd → create-ux-design)", handler: handleBmadAutoPlanning })`
7. Open `src/resources/extensions/umb/tests/bmad-commands.test.ts` and add new tests:
   - `handleBmadAutoPlanning` describe block:
     - shows usage with no args (contains "Auto-Planning", "bmad-create-prd", "bmad-create-ux-design", "2 stage")
     - shows usage with 'help'
     - shows pipeline stages with --list (includes Phase 2 Planning, both skills)
     - shows dry-run without creating sessions
     - creates sessions for each stage with user message
     - shows progress widget during execution
     - shows failed stage when pipeline fails (missing required skill)
   - `handleBmadAuto` updates:
     - update existing "shows 'coming soon' for unimplemented 'planning' phase" test — now it should dispatch to planning handler instead of showing coming soon. Change this test to verify it delegates to auto-planning.
     - add test that `/bmad auto planning` delegates properly

## Must-Haves

- [ ] `handleBmadAutoPlanning` exported from bmad-commands.ts
- [ ] `/bmad auto-planning` shows help with 2 pipeline stages
- [ ] `/bmad auto-planning --dry-run` runs without creating sessions
- [ ] `/bmad auto-planning 'Build a REST API'` creates sessions for both stages
- [ ] `/bmad auto planning` dispatches to handleBmadAutoPlanning (not "coming soon")
- [ ] `/bmad auto --list` shows both analysis and planning pipelines
- [ ] `registerBmadCommands` registers "bmad auto-planning" command
- [ ] All new tests pass alongside all existing S03 command tests (no regressions)

## Verification

- `npx vitest run src/resources/extensions/umb/tests/bmad-commands.test.ts` — all tests pass (existing 30 + new ~10)

## Inputs

- `src/resources/extensions/umb/commands/bmad-commands.ts` — existing command handlers, handleBmadAutoAnalysis pattern, AUTO_PHASES array, registerBmadCommands
- `src/resources/extensions/umb/tests/bmad-commands.test.ts` — existing 30 command tests (must not break)
- `src/resources/extensions/umb/bmad-pipeline/index.ts` — PLANNING_PIPELINE export (from T01)

## Expected Output

- `src/resources/extensions/umb/commands/bmad-commands.ts` — add handleBmadAutoPlanning, update handleBmadAuto routing, register new command
- `src/resources/extensions/umb/tests/bmad-commands.test.ts` — add ~10 new tests for planning command + update existing auto-planning test

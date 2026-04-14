---
estimated_steps: 6
estimated_files: 2
skills_used: []
---

# T02: Add handleBmadAutoImplementation handler, dispatch, and command tests

**Slice:** S06 — Implement /bmad auto-implementation (Phase 4 pipeline)
**Milestone:** M112

## Description

Clone the handleBmadAutoSolutioning handler pattern to create handleBmadAutoImplementation for the Phase 4 pipeline. Wire up dispatch, mark the phase as implemented, register the command, and add 7 command tests.

## Steps

1. **Import IMPLEMENTATION_PIPELINE in bmad-commands.ts:** Add `IMPLEMENTATION_PIPELINE` to the existing import from `../bmad-pipeline/index.js`.

2. **Create handleBmadAutoImplementation handler:** Clone `handleBmadAutoSolutioning` exactly. Replace all references:
   - Function name: `handleBmadAutoImplementation`
   - Pipeline reference: `IMPLEMENTATION_PIPELINE` instead of `SOLUTIONING_PIPELINE`
   - UI strings: "Implementation" instead of "Solutioning", "⚙️" icon instead of "🏗️", "Phase 4" instead of "Phase 3"
   - Session info tag: keep `bmad-pipeline: ${skillName}` (same pattern)
   - Notify/widget messages: "Implementation pipeline completed/failed" instead of "Solutioning..."
   - The handler follows the exact same 4-path structure: help, --list, --dry-run, full execution

3. **Update AUTO_PHASES:** Change `{ name: "implementation", ..., implemented: false }` to `implemented: true`.

4. **Add dispatch branch in handleBmadAuto:** Add `if (phaseName === "implementation") { await handleBmadAutoImplementation(message, ctx); return; }` before the "Check if it's a valid but unimplemented phase" block. Place it after the solutioning dispatch.

5. **Register the command:** Add in registerBmadCommands:
   ```ts
   pi.registerCommand("bmad auto-implementation", {
     description: "Run Phase 4 implementation pipeline (sprint-planning → create-story → dev-story → code-review)",
     handler: handleBmadAutoImplementation,
   });
   ```
   Place it after the `bmad auto-solutioning` registration.

6. **Add 7 command tests in bmad-commands.test.ts:**

   Import `handleBmadAutoImplementation` alongside the other handlers.

   Add a `handleBmadAutoImplementation` describe block with 7 tests following the exact pattern from the `handleBmadAutoSolutioning` tests (around line 897):
   - "shows help text with no args" — call with empty string, assert widget contains "Phase 4" and "Implementation"
   - "shows help text with 'help'" — call with "help", same assertions
   - "shows pipeline stages with --list" — call with "--list", assert widget contains all 4 stage names
   - "shows dry run with --dry-run" — create all 4 implementation skills (phase `4-implementation`), call with "--dry-run", assert widget contains "Dry Run" and all 4 stages marked ✅
   - "executes pipeline and shows results" — create all 4 implementation skills + config, call with "Build a REST API", assert widget contains "Completed" or "completed" and all 4 skill names
   - "reports failure when stage skill is missing" — create only sprint-planning + create-story, omit dev-story + code-review, call with "Build a REST API", assert widget contains "Failed" or "failed"
   - "reports cancellation correctly" — create all 4 skills, mock sessionFactory that cancels on 2nd call, assert widget shows failure/partial

   Also update the existing `handleBmadAuto` tests:
   - In the "shows available phases" test, the implementation phase should now show ✅ instead of 🔜
   - Add a test: "delegates to auto-implementation for 'implementation' phase" — call `handleBmadAuto("implementation Build it", ctx)`, assert the implementation phase is reached (not the "not yet implemented" message)

## Must-Haves

- [ ] handleBmadAutoImplementation handler follows handleBmadAutoSolutioning pattern exactly
- [ ] IMPLEMENTATION_PIPELINE imported and used in the handler
- [ ] AUTO_PHASES marks implementation as implemented: true
- [ ] 'implementation' dispatch branch in handleBmadAuto
- [ ] 'bmad auto-implementation' command registered
- [ ] 7 new handler tests + 2 updated dispatch tests pass
- [ ] Zero test regressions (all existing tests still pass)

## Verification

- `npx vitest run src/resources/extensions/umb/tests/bmad-commands.test.ts` — all tests pass (51+ total, up from 44)
- `grep -q "auto-implementation" src/resources/extensions/umb/commands/bmad-commands.ts` — command registered
- `grep -q "implemented: true" src/resources/extensions/umb/commands/bmad-commands.ts` — phase marked implemented

## Inputs

- `src/resources/extensions/umb/commands/bmad-commands.ts` — existing handlers (handleBmadAutoSolutioning pattern) and AUTO_PHASES/dispatch/registration
- `src/resources/extensions/umb/tests/bmad-commands.test.ts` — existing test patterns, mock helpers, createSkill function
- `src/resources/extensions/umb/bmad-pipeline/index.ts` — IMPLEMENTATION_PIPELINE export (from T01)

## Expected Output

- `src/resources/extensions/umb/commands/bmad-commands.ts` — handleBmadAutoImplementation handler, dispatch branch, command registration, AUTO_PHASES update
- `src/resources/extensions/umb/tests/bmad-commands.test.ts` — 7 new implementation handler tests + dispatch test updates

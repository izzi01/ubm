# S03: Enhanced Completion Tools + Auto-mode Wiring

**Goal:** Build enhanced GSD tools (gsd_task_complete, gsd_slice_complete, gsd_milestone_validate, gsd_milestone_complete) that write results to DB and render summary files via the file rendering system. Wire the /gsd auto command to use the dispatch engine. Full integration test proving the auto-mode cycle.
**Demo:** After this: /gsd auto on a planned milestone drives the LLM through the full cycle: dispatch → execute → complete → advance → dispatch next unit

## Must-Haves

- gsd_task_complete writes narrative/verification to DB and renders T##-SUMMARY.md. gsd_slice_complete validates all tasks done and renders S##-SUMMARY.md + UAT.md. gsd_milestone_validate renders VALIDATION.md. gsd_milestone_complete renders M##-SUMMARY.md. /gsd auto shows dispatch result. Integration test creates milestone → plans slices/tasks → runs dispatch → completes tasks/slices → validates milestone → completes milestone, all files rendered correctly.

## Proof Level

- This slice proves: test

## Integration Closure

New tools follow existing factory pattern (createGsdToolHandlers). File writes go to .gsd/milestones/ following the established directory convention. /gsd auto enhancement is backward-compatible (still works without active milestone).

## Verification

- Rendered SUMMARY/UAT/VALIDATION files are durable observability artifacts that persist across sessions

## Tasks

- [x] **T01: Build completion tools (task_complete, slice_complete, milestone_validate, milestone_complete)** `est:3h`
  Add four new tools to `src/tools/gsd-tools.ts` via the existing factory pattern.

1. `gsd_task_complete` tool:
   - Params: taskId, sliceId, milestoneId, oneLiner, narrative, verification, keyFiles?, keyDecisions?, deviations?, knownIssues?
   - Writes narrative/verification/keyFiles to task row in DB
   - Advances task: active → complete via engine.gates.advanceWithGate()
   - Renders T##-SUMMARY.md using renderTaskSummary()
   - Writes rendered file to .gsd/milestones/{MID}/slices/{SID}/tasks/T##-SUMMARY.md
   - Returns success message with file path

2. `gsd_slice_complete` tool:
   - Params: sliceId, milestoneId, sliceTitle, oneLiner, narrative, verification, uatContent, keyFiles?, keyDecisions?
   - Validates all tasks in slice are complete (throw if not)
   - Advances slice: active → complete
   - Renders S##-SUMMARY.md and S##-UAT.md
   - Writes to .gsd/milestones/{MID}/slices/S##/
   - Returns success with paths

3. `gsd_milestone_validate` tool:
   - Params: milestoneId, verdict, remediationRound, successCriteriaChecklist, sliceDeliveryAudit, crossSliceIntegration, requirementCoverage, verdictRationale, remediationPlan?
   - Renders M##-VALIDATION.md
   - Writes to .gsd/milestones/{MID}/
   - Returns validation result

4. `gsd_milestone_complete` tool:
   - Params: milestoneId, title, oneLiner, narrative, verificationPassed, successCriteriaResults?, definitionOfDoneResults?, keyDecisions?, keyFiles?
   - Validates all slices are complete
   - Advances milestone: active → completed
   - Renders M##-SUMMARY.md
   - Writes to .gsd/milestones/{MID}/
   - Returns success with path

All tools use `import { writeFileSync, mkdirSync } from 'fs'` for file writes.
All use `path.join()` for constructing paths.
All follow the existing jsonResult/errorResult pattern.
  - Files: `src/tools/gsd-tools.ts`, `src/tools/index.ts`
  - Verify: npm run test:run -- tests/tools/gsd-completion-tools.test.ts --reporter=verbose

- [x] **T02: Wire /gsd auto command to dispatch engine, add gsd_dispatch tool** `est:1.5h`
  Enhance /gsd auto command and add gsd_dispatch tool.

1. Update `handleGsdAuto` in `src/commands/gsd-commands.ts`:
   - Use engine.autoMode to start auto-mode
   - Call dispatch() to get current state
   - Show structured dispatch result: phase, next unit, action, blocked status
   - Update autoMode lastDispatch
   - If gate-blocked, show which entity is blocked and why

2. Add `gsd_dispatch` tool (for LLM to call during auto-mode):
   - Params: milestoneId
   - Returns DispatchResult (current phase, next action, next unit IDs)
   - This is what the LLM calls to figure out what to do next

3. Add `/gsd stop` command:
   - Calls engine.autoMode.stop()
   - Shows 'Auto-mode stopped' notification

4. Register new tool and command in extension index.ts if needed

The /gsd auto command now starts auto-mode AND shows dispatch result in one step.
  - Files: `src/commands/gsd-commands.ts`, `src/tools/gsd-tools.ts`
  - Verify: npm run test:run -- tests/commands/gsd-auto.test.ts --reporter=verbose

- [x] **T03: Full integration test for auto-mode lifecycle** `est:2h`
  Write full integration test proving the auto-mode lifecycle.

Create `tests/integration/auto-mode.test.ts`:

1. Setup: Create engine, plan milestone M100 with 2 slices (S01, S02), each with 2 tasks

2. Test: Full auto-mode cycle
   - Start auto-mode for M100
   - dispatch() → returns S01, T01, execute-task
   - gsd_task_complete(T01) → renders T01-SUMMARY.md, advances to T02
   - dispatch() → returns S01, T02, execute-task
   - gsd_task_complete(T02) → renders T02-SUMMARY.md, all tasks done
   - dispatch() → returns S01, null, verify-slice
   - gsd_slice_complete(S01) → renders S01-SUMMARY.md + UAT.md
   - dispatch() → returns S02, T01, execute-task
   - gsd_task_complete(T01) → renders summary
   - gsd_task_complete(T02) → renders summary
   - gsd_slice_complete(S02) → renders summary + UAT
   - dispatch() → returns M100, null, verify-milestone
   - gsd_milestone_validate(M100, pass) → renders VALIDATION.md
   - gsd_milestone_complete(M100) → renders M100-SUMMARY.md
   - dispatch() → returns M100, null, complete

3. Verify all 9 files rendered:
   - T01-SUMMARY.md, T02-SUMMARY.md (S01), T01-SUMMARY.md, T02-SUMMARY.md (S02)
   - S01-SUMMARY.md, S01-UAT.md
   - S02-SUMMARY.md, S02-UAT.md
   - M100-SUMMARY.md, M100-VALIDATION.md

4. Verify auto-mode state reflects completion

5. Also test error cases:
   - gsd_task_complete on already-complete task
   - gsd_slice_complete with incomplete tasks
   - gsd_milestone_complete with incomplete slices
   - dispatch with gate-blocked state
  - Files: `tests/integration/auto-mode.test.ts`
  - Verify: npm run test:run -- tests/integration/auto-mode.test.ts --reporter=verbose

## Files Likely Touched

- src/tools/gsd-tools.ts
- src/tools/index.ts
- src/commands/gsd-commands.ts
- tests/integration/auto-mode.test.ts

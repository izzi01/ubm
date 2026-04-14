---
estimated_steps: 30
estimated_files: 2
skills_used: []
---

# T01: Build completion tools (task_complete, slice_complete, milestone_validate, milestone_complete)

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

## Inputs

- `src/auto/renderer.ts`
- `src/auto/dispatcher.ts`
- `src/state-machine/index.ts`
- `src/db/types.ts`

## Expected Output

- `src/tools/gsd-tools.ts (updated with 4 new tools)`
- `src/tools/index.ts (updated if needed)`

## Verification

npm run test:run -- tests/tools/gsd-completion-tools.test.ts --reporter=verbose

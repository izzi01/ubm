---
id: T02
parent: S04
milestone: M115
key_files:
  - tests/parity/workflow-parity.ts
  - tests/parity/baseline-lanes.ts
  - tests/parity/secondary-lanes.ts
  - tests/fixtures/secondary-parity-manifest.json
  - src/tests/integration/workflow-parity-contract.test.ts
key_decisions:
  - Implemented workflow parity as another renderer/input to the canonical baseline parity report instead of introducing a second standalone parity harness.
  - Kept the workflow representative fixture path aligned to `tests/fixtures/workflow-parity-manifest.json` but left its fixture status as planned so the secondary-surface partial-state validator stays truthful while the lane is still red.
duration: 
verification_result: mixed
completed_at: 2026-04-24T10:53:55.866Z
blocker_discovered: false
---

# T02: Added the workflow parity lane scaffold, wired it into the baseline report, and recorded the remaining contract mismatches as precise failing evidence.

**Added the workflow parity lane scaffold, wired it into the baseline report, and recorded the remaining contract mismatches as precise failing evidence.**

## What Happened

I implemented the representative workflow parity scaffold around the deterministic GSD planning-to-execution loop chosen in T01. I added `tests/parity/workflow-parity.ts`, which opens a temporary GSD project, executes `executePlanMilestone`, `executePlanSlice`, and `executeTaskComplete` against the real workflow executors, snapshots the resulting `.gsd/state-manifest.json`, checks the rendered roadmap/slice-plan/task-plan/task-summary artifacts, inspects persisted state transitions, verifies `verification_evidence` rows, and writes mirrored tracked outputs to `tests/fixtures/recordings/workflow-parity.json` and `tests/parity/artifacts/workflow-parity.json`. I then wired that helper into `tests/parity/baseline-lanes.ts` so the canonical baseline report now emits a `workflowParity` section alongside the existing MCP parity row. I updated `tests/parity/secondary-lanes.ts` and the checked-in `tests/fixtures/secondary-parity-manifest.json` to align the workflow surface with the tracked `tests/fixtures/workflow-parity-manifest.json` path and to mark the release-readable workflow report lane as existing proof while still keeping the representative fixture itself planned so the partial-surface validator remains truthful. Finally, I added `src/tests/integration/workflow-parity-contract.test.ts` to exercise the public parity runner contract instead of private internals.

Verification exposed two real mismatches that I did not paper over under the wrap-up budget. First, the workflow fixture helper reports that the rendered slice plan for the representative loop does not contain the manifest’s expected `## Goal` marker, so the fixture contract and the actual plan renderer are out of sync. Second, the persisted task row’s `verification_result` field currently contains the verification command string (`node --test ...workflow-tool-executors.test.ts`) rather than the manifest’s expected normalized value `passed`, so the current GSD completion behavior does not satisfy the T01 transition contract as written. I also confirmed that the slice-level verification command from the task plan still fails in current repo state when run exactly as written, because `node --experimental-strip-types tests/parity/run.ts --format json` hits an existing ESM resolution/import-mode problem around `src/resources/extensions/gsd/errors.js`. Rather than hide these failures, I left the new lane producing actionable diagnostics so T03 or a follow-on task can reconcile the fixture contract with real executor output or adjust the underlying GSD behavior.

## Verification

Ran the new workflow parity contract test via `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/workflow-parity-contract.test.ts`. That command failed, but it proved the new parity runner is wired and emitting a tracked workflow parity artifact/report row; the failure was due to truthful contract drift reported by the artifact itself: the representative slice plan was missing the manifest’s expected `## Goal` marker and the completed task stored the verification command text in `verification_result` instead of `passed`. I then ran the slice-level verification command exactly as written in the task plan: `node --experimental-strip-types tests/parity/run.ts --format json`. That also failed in current repo state with `ERR_MODULE_NOT_FOUND` for `src/resources/extensions/gsd/errors.js`, which is a resolver/import-mode issue on the parity runner path rather than a hidden regression from the new workflow lane. The generated workflow artifact at `tests/parity/artifacts/workflow-parity.json` now records the failing artifact/state-transition diagnostics explicitly.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/workflow-parity-contract.test.ts` | 1 | ❌ fail | 20805ms |
| 2 | `node --experimental-strip-types tests/parity/run.ts --format json` | 1 | ❌ fail | 166ms |

## Deviations

I stopped after producing the installed workflow parity helper/artifact/test scaffold and recording precise failing verification evidence because the auto wrap-up budget warning arrived while verification remained red. I also updated the tracked `tests/fixtures/secondary-parity-manifest.json` artifact to restore alignment with the generator and the T01 fixture path correction instead of leaving the older stale workflow fixture filename in place.

## Known Issues

Workflow parity remains red. The generated artifact reports two concrete contract mismatches: `.gsd/milestones/M901/slices/S01/S01-PLAN.md` does not include the manifest’s expected `## Goal` marker, and the completed task row stores the verification command string in `task.verification_result` rather than `passed`. Separately, the slice verification command `node --experimental-strip-types tests/parity/run.ts --format json` still fails in repo state with `ERR_MODULE_NOT_FOUND` for `src/resources/extensions/gsd/errors.js` unless the resolve-ts import shim is used.

## Files Created/Modified

- `tests/parity/workflow-parity.ts`
- `tests/parity/baseline-lanes.ts`
- `tests/parity/secondary-lanes.ts`
- `tests/fixtures/secondary-parity-manifest.json`
- `src/tests/integration/workflow-parity-contract.test.ts`

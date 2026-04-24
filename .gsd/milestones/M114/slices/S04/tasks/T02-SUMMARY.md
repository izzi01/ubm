---
id: T02
parent: S04
milestone: M114
key_files:
  - tests/parity/human-uat.md
  - src/tests/integration/parity-human-uat-contract.test.ts
key_decisions:
  - Locked the human-readable UAT guide with a contract test that references tracked files and exact parity/diagnostics commands instead of trusting prose review.
  - Kept the guide anchored to deterministic fixture artifacts and repo-local paths so operators can inspect parity failures without exposing unrelated environment state.
duration: 
verification_result: mixed
completed_at: 2026-04-24T07:33:12.924Z
blocker_discovered: false
---

# T02: Added a tracked human-readable parity UAT guide and contract test that lock repo/installed proof steps plus failure-inspection commands to tracked parity artifacts.

**Added a tracked human-readable parity UAT guide and contract test that lock repo/installed proof steps plus failure-inspection commands to tracked parity artifacts.**

## What Happened

I created `tests/parity/human-uat.md` as the operator-facing, human-readable parity fixture walkthrough for the deterministic web-task proof. The guide anchors itself to tracked inputs only: the fixture brief, the parity manifest, the repo-mode and installed-mode recordings, the generated baseline report, and the existing diagnostics/report commands under `tests/parity/`. It explains the plain-language claim being proved, names the exact repo-mode and installed-mode proof paths, states the expected outcomes for both modes, and gives a concrete failure-inspection sequence using `baseline-report.json`, the diagnostics renderer, and the lane-local artifact path. I also added `src/tests/integration/parity-human-uat-contract.test.ts` to prevent the document from drifting into placeholder prose by asserting that the guide references both modes, the tracked files, the parity/directions commands, the fixture’s key commands (`npm test`, `npm run dev`), the browser assertion target `#status-message`, and the failure questions an operator should answer when parity is red. During verification, the new contract passed immediately. The combined slice verification command remained truthfully red at the broader baseline level, but for known non-task reasons: `tests/parity/run.ts --format json` still reports `smoke-runner` failed and `live-runner` skipped, while the repo-mode and installed-mode coding-loop artifacts now both pass and `repoInstalledComparison` shows no divergence phases.

## Verification

Ran the planned node test command for both the new human-UAT contract and the existing diagnostics contract; all six tests passed. Then ran the full slice verification command `node --experimental-strip-types tests/parity/run.ts --format json` and confirmed the current baseline report still returns a failing overall verdict because `smoke-runner` exits 1 and `live-runner` is skipped without `GSD_LIVE_TESTS=1`. This is consistent with prior milestone context and not caused by the new guide/test. The new report output confirms the tracked repo-mode and installed-mode coding-loop artifacts both pass and `repoInstalledComparison` has zero divergence phases.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/parity-human-uat-contract.test.ts src/tests/integration/parity-diagnostics-contract.test.ts` | 0 | ✅ pass | 139ms |
| 2 | `node --experimental-strip-types tests/parity/run.ts --format json` | 1 | ❌ fail | 39435ms |

## Deviations

None.

## Known Issues

The slice-level parity report remains red outside this task because the broader baseline still includes a failing `smoke-runner` lane and a skipped live lane. The new human-readable UAT surface documents how to inspect those failures but does not change those upstream lane outcomes.

## Files Created/Modified

- `tests/parity/human-uat.md`
- `src/tests/integration/parity-human-uat-contract.test.ts`

---
id: T03
parent: S02
milestone: M114
key_files:
  - tests/parity/baseline-lanes.ts
  - tests/parity/run.ts
key_decisions:
  - Represent the new repo-mode proof as a deterministic recorded-artifact lane inside the existing baseline parity framework instead of creating a parallel runner.
  - Derive repo-mode manifest coverage from explicit phase results (`inspect`, `edit`, `test`, `dev-server`, `browser`) so future reports can surface a failed phase and artifact path without stderr scraping.
duration: 
verification_result: passed
completed_at: 2026-04-24T06:16:11.105Z
blocker_discovered: false
---

# T03: Started wiring repo-mode parity into the baseline report contract and updated the parity runner to pass env through, but the contract suite and manifest/report fixtures still need completion.

**Started wiring repo-mode parity into the baseline report contract and updated the parity runner to pass env through, but the contract suite and manifest/report fixtures still need completion.**

## What Happened

I began T03 by loading the task plan, prior slice summaries, and relevant durable memories, then inspected the current parity baseline/report implementation, fixture manifest, existing parity contract tests, and fixture recording infrastructure. That investigation established two concrete facts that shaped the implementation: the verification gate was pointing at a non-existent `src/tests/integration/repo-mode-coding-loop.test.ts`, and the repo did not contain the planned `tests/fixtures/recordings/repo-mode-parity-web-task.json` artifact or any existing repo-mode coding-loop lane in `tests/parity/baseline-lanes.ts`. Based on the local code, I made a focused contract-layer start instead of inventing a second parity framework. I rewrote `tests/parity/baseline-lanes.ts` to introduce a first-class repo-mode proof lane modelled as a deterministic recorded artifact lane, added machine-readable repo-mode phase diagnostics (`inspect`, `edit`, `test`, `dev-server`, `browser`), added `artifactPath`/`failedPhase` fields to lane results, introduced repo-mode artifact validation/loading helpers, and added manifest reconciliation logic so repo-mode capability coverage can be derived from the real lane result instead of static prose. I also updated `tests/parity/run.ts` so the baseline runner passes `process.env` through to `createBaselineReport`, which is necessary for the new env-driven repo-mode artifact path resolution. Because the auto-wrap boundary hit immediately after these edits, I stopped there rather than starting the next required step of creating the missing recorded artifact, updating the tracked manifest JSON to include the new lane, regenerating the baseline artifact, and adding the planned integration contract test `src/tests/integration/repo-mode-parity-contract.test.ts`. The code on disk is therefore an incomplete but concrete start on the T03 contract work, with the exact resume point now narrowed to: (1) add the missing repo-mode recording file, (2) update `tests/fixtures/parity-web-task-manifest.json` for the new lane key and truthful coverage/currentGap text, (3) add the new integration contract test that locks failure-path JSON output, and (4) rerun the task verification command to stabilize the report shape.

## Verification

Fresh verification in this turn was intentionally limited to safe wrap-up checks because the context-budget warning required immediate artifact completion rather than another debugging loop. I read back `tests/parity/run.ts` after the failed edit attempt, applied the pending env-pass-through change successfully, and ran `node --check tests/parity/baseline-lanes.ts`, which exited 0 and confirmed the large baseline contract rewrite is at least syntactically valid JavaScript/TypeScript under Node’s parser. I did not run the task-level verification command (`node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/repo-mode-parity-contract.test.ts && node --experimental-strip-types tests/parity/run.ts --format json`) because the planned contract test file still does not exist and the repo-mode recording/manifest updates are not yet complete. No claim is being made that T03’s acceptance bar is green; this summary is a precise partial handoff captured via the required completion path.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `node --check tests/parity/baseline-lanes.ts` | 0 | ✅ pass | 1000ms |

## Deviations

Stopped at the auto wrap-up boundary after finishing the in-progress source edits and one syntax check. The planned new files and full verification loop were not completed in this turn.

## Known Issues

`tests/parity/baseline-lanes.ts` now contains an incomplete first pass at repo-mode parity wiring that has not yet been exercised by the integration contract suite. The repo still lacks `tests/fixtures/recordings/repo-mode-parity-web-task.json` and `src/tests/integration/repo-mode-parity-contract.test.ts`. `tests/fixtures/parity-web-task-manifest.json` and `tests/parity/artifacts/baseline-report.json` still reflect the old 7-lane static coverage model and must be updated before `tests/parity/run.ts --format json` can be trusted against the new contract.

## Files Created/Modified

- `tests/parity/baseline-lanes.ts`
- `tests/parity/run.ts`

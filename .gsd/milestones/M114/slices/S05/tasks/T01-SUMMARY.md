---
id: T01
parent: S05
milestone: M114
key_files:
  - tests/parity/release-gate.ts
  - src/tests/integration/parity-release-gate-contract.test.ts
  - tests/parity/diagnostics.ts
  - package.json
key_decisions:
  - Built the release gate on top of the canonical baseline report instead of introducing a second parity harness.
  - Defined strict release success by the recorded repo/dev and installed coding-loop lanes only, while keeping live spot-check state explicit and non-blocking.
  - Preserved operator observability by surfacing artifact paths, failed phases, repo-vs-installed comparison, and a stable diagnostics command directly in the release-gate output.
duration: 
verification_result: passed
completed_at: 2026-04-24T07:49:47.150Z
blocker_discovered: false
---

# T01: Added a strict parity release-gate command and contract tests over the canonical baseline report.

**Added a strict parity release-gate command and contract tests over the canonical baseline report.**

## What Happened

Implemented `tests/parity/release-gate.ts` as a release-facing surface over the existing canonical baseline report instead of creating a second harness. The new module builds a stable report contract that requires only the deterministic repo/dev (`repo-mode-coding-loop`) and installed packaged (`pack-install`) coding-loop lanes to pass, while explicitly reporting optional live status, failed required lanes, failed phases, artifact paths, the repo-vs-installed comparison block, and the follow-up diagnostics command. Added `src/tests/integration/parity-release-gate-contract.test.ts` to lock the report builder, text renderer, `--report` consume path, and rerun path. Updated `package.json` with a `test:parity:release-gate` operator-facing command. During verification I found a real path-handling defect in `tests/parity/diagnostics.ts`: it incorrectly forced absolute `--report` paths under `cwd`, so I fixed the loader to accept both absolute and repo-relative paths. I also corrected the new CLI contract test to match the actual slice requirement: the release gate remains green when the required coding-loop lanes pass, even if baseline summary still reports separate optional/non-required lane failures.

## Verification

Ran the task-plan verification command `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/parity-release-gate-contract.test.ts`, which passed all four release-gate contract tests after fixing absolute report-path handling and aligning the final expectation with the strict-required-lanes rule. Then ran `npm run test:parity:release-gate` to exercise the user-facing command, which printed a stable release verdict with required-lane success, optional live skip metadata, artifact paths, diagnostics command, and repo-vs-installed comparison summary.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/parity-release-gate-contract.test.ts` | 0 | ✅ pass | 25509ms |
| 2 | `npm run test:parity:release-gate` | 0 | ✅ pass | 25452ms |

## Deviations

Adjusted the final CLI expectation to reflect the slice contract more precisely: the release gate verdict is based on required repo/dev and installed coding-loop lanes only, not on every baseline lane. Also made a small supporting fix in `tests/parity/diagnostics.ts` so release-gate consumers can pass absolute artifact paths safely.

## Known Issues

The canonical baseline summary still truthfully reports `smoke-runner` as failed and `live-runner` as skipped in the current repo state. The new release gate intentionally surfaces those statuses without turning them into required-lane failures.

## Files Created/Modified

- `tests/parity/release-gate.ts`
- `src/tests/integration/parity-release-gate-contract.test.ts`
- `tests/parity/diagnostics.ts`
- `package.json`

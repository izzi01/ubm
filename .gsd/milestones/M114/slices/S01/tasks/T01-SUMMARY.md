---
id: T01
parent: S01
milestone: M114
key_files:
  - package.json
  - tests/parity/baseline-lanes.ts
  - tests/parity/run.ts
  - src/tests/integration/parity-baseline-contract.test.ts
key_decisions:
  - Reused the existing smoke/fixtures/live/live-regression/e2e/pack-install lanes through a fixed allowlisted matrix instead of introducing a new harness family.
  - Kept the runner sequential with explicit timeout/skip classification so the baseline report stays bounded and honest under load.
  - Treated current smoke and pack-install problems as baseline findings to report, not conditions to hide or coerce into a passing verdict.
duration: 
verification_result: mixed
completed_at: 2026-04-24T04:47:05.645Z
blocker_discovered: false
---

# T01: Added a baseline parity lane runner, package script, and contract test that truthfully inventory existing proof lanes and expose current smoke/pack-install gaps.

**Added a baseline parity lane runner, package script, and contract test that truthfully inventory existing proof lanes and expose current smoke/pack-install gaps.**

## What Happened

Implemented `tests/parity/baseline-lanes.ts` as a fixed allowlisted lane matrix for the existing smoke, fixtures, live, live-regression, e2e-smoke, e2e-headless, and pack-install lanes with explicit proof-class, scope, skip, timeout, and report schema metadata. Added `tests/parity/run.ts` to execute the matrix sequentially, classify pass/fail/skip/timed_out outcomes, and write a machine-readable report artifact under `tests/parity/artifacts/baseline-report.json`. Wired `npm run test:parity:baseline` in `package.json` and added `src/tests/integration/parity-baseline-contract.test.ts` to lock the lane allowlist, validate metadata/target existence, and exercise skip/failure/timeout behavior. During verification, the runner truthfully surfaced current repo reality: `tests/smoke/run.ts` fails because `test-init` hits a non-TTY path, and `src/tests/integration/pack-install.test.ts` exceeds the lane timeout budget, so the baseline report currently returns a failing verdict instead of a green baseline. I was forced to stop at the wrap-up threshold before patching the contract test expectations to match that truthful failing baseline, so the implementation is present but the task remains partially complete.

## Verification

Ran the task-level verification command `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/parity-baseline-contract.test.ts`, which currently fails because the new contract test still expected a successful baseline instead of the observed failing baseline. Ran `node --experimental-strip-types tests/parity/run.ts --format json` and `npm run test:parity:baseline`; both completed with a machine-readable report showing 4 passed lanes, 1 failed lane (`smoke-runner`), 1 skipped live lane, and 1 timed_out lane (`pack-install`). Confirmed the underlying smoke failure separately by running `node --experimental-strip-types tests/smoke/run.ts`, which fails on `test-init` in non-TTY mode. No browser verification applied because this task only adds CLI/reporting/test infrastructure.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/parity-baseline-contract.test.ts` | 1 | ❌ fail | 37500ms |
| 2 | `node --experimental-strip-types tests/parity/run.ts --format json` | 124 | ❌ fail | 237700ms |
| 3 | `npm run test:parity:baseline` | 124 | ❌ fail | 227600ms |
| 4 | `node --experimental-strip-types tests/smoke/run.ts` | 1 | ❌ fail | 8000ms |

## Deviations

Stopped at the context-budget wrap-up point before updating `src/tests/integration/parity-baseline-contract.test.ts` to assert the observed failing baseline verdict and actual lane-specific outcomes. The code artifacts were written, but the final contract test expectation update is still pending.

## Known Issues

`src/tests/integration/parity-baseline-contract.test.ts` is red because it still assumes the baseline runner exits cleanly with a partial verdict; the real baseline currently reports `failing`. The smoke lane currently fails due to `tests/smoke/test-init.ts` invoking interactive init in a non-TTY environment. The pack-install lane currently times out under the runner’s 120000ms budget, yielding `timed_out` in the report.

## Files Created/Modified

- `package.json`
- `tests/parity/baseline-lanes.ts`
- `tests/parity/run.ts`
- `src/tests/integration/parity-baseline-contract.test.ts`

---
id: T03
parent: S01
milestone: M115
key_files:
  - tests/parity/baseline-lanes.ts
  - src/tests/integration/secondary-parity-report-contract.test.ts
  - src/tests/integration/parity-baseline-contract.test.ts
  - tests/parity/artifacts/baseline-report.json
key_decisions:
  - Used `baseline-report.json` as the canonical secondary-surface report surface instead of introducing a separate parallel artifact, so downstream diagnostics and release-gate slices can reuse existing report plumbing.
  - Derived `secondaryParity` entirely from the tracked inventory and manifest modules to keep one source of truth for surfaces, gaps, fixtures, and drift findings.
duration: 
verification_result: passed
completed_at: 2026-04-24T09:57:07.027Z
blocker_discovered: false
---

# T03: Extended the baseline parity runner to publish a canonical secondary-surface report payload with contract tests for the emitted and persisted report wiring.

**Extended the baseline parity runner to publish a canonical secondary-surface report payload with contract tests for the emitted and persisted report wiring.**

## What Happened

I extended the existing parity report plumbing in `tests/parity/baseline-lanes.ts` so the canonical `baseline-report.json` now carries a `secondaryParity` section derived directly from the tracked secondary inventory and lane manifest contracts introduced in T01/T02. The new payload publishes inventory/manifest paths and versions, per-surface lane metadata, missing release-readable coverage, uncovered/gap identifiers, drift findings, and stable report-path anchors that downstream diagnostics and release-gate work can consume without rerunning discovery logic. I added `src/tests/integration/secondary-parity-report-contract.test.ts` to lock both the runner JSON output and the persisted artifact shape, and updated the existing parity baseline contract to assert the new wiring while preserving truthful local expectations. During verification I found the local baseline runner now reports `partial` rather than the older assumed `failing` state because smoke currently passes and only live remains skipped, so I updated the stale assertion to match observable repo truth instead of preserving an outdated red baseline assumption.

## Verification

Ran the task-plan verification command `node --experimental-strip-types tests/parity/run.ts --format json`, which succeeded and emitted a baseline report with `secondaryParity.summary` showing all four scoped surfaces, partial status on each, and 12 drift findings. Ran `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/secondary-parity-report-contract.test.ts`, which passed and verified that the runner output and persisted `tests/parity/artifacts/baseline-report.json` carry the canonical derived secondary report payload. Also ran `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/parity-baseline-contract.test.ts`, which passed after updating stale assertions to the repo’s current truthful baseline verdict.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `node --experimental-strip-types tests/parity/run.ts --format json` | 0 | ✅ pass | 36894ms |
| 2 | `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/secondary-parity-report-contract.test.ts` | 0 | ✅ pass | 40555ms |
| 3 | `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/parity-baseline-contract.test.ts` | 0 | ✅ pass | 18644ms |

## Deviations

Updated the pre-existing baseline contract expectation from an older hard-coded failing/smoke-red assumption to the repo’s current observed `partial` verdict and smoke-passing state. This was a factual local correction to keep the contract truthful, not a scope change.

## Known Issues

The baseline report remains `partial` because the optional live lane is skipped by default and the broader capability rows still remain uncovered by design. The new secondary report payload truthfully reflects that all four scoped secondary surfaces are still partial and missing release-readable closure lanes.

## Files Created/Modified

- `tests/parity/baseline-lanes.ts`
- `src/tests/integration/secondary-parity-report-contract.test.ts`
- `src/tests/integration/parity-baseline-contract.test.ts`
- `tests/parity/artifacts/baseline-report.json`

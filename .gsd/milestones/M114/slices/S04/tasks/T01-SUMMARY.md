---
id: T01
parent: S04
milestone: M114
key_files:
  - tests/parity/diagnostics.ts
  - src/tests/integration/parity-diagnostics-contract.test.ts
key_decisions:
  - Built the diagnostics surface as a renderer over the existing baseline report contract instead of adding a separate parity harness.
  - Kept diagnostics inputs and rendered artifact references repo-local to preserve the slice’s redaction boundary and reproducibility contract.
duration: 
verification_result: passed
completed_at: 2026-04-24T07:30:13.320Z
blocker_discovered: false
---

# T01: Added a parity diagnostics renderer and contract tests that turn baseline parity reports into actionable mode-aware failure summaries.

**Added a parity diagnostics renderer and contract tests that turn baseline parity reports into actionable mode-aware failure summaries.**

## What Happened

I added `tests/parity/diagnostics.ts` as the operator-facing renderer on top of the existing baseline parity JSON contract instead of introducing a second harness. The renderer loads the tracked baseline report, normalizes lane mode labels, selects the highest-signal phase evidence per lane, preserves artifact paths, and renders command/browser evidence plus repo-vs-installed divergence phases in human-readable text. I also added `src/tests/integration/parity-diagnostics-contract.test.ts` to lock the surface against the current tracked failing baseline, a synthetic non-browser failure, a synthetic passing report, and a missing-report CLI error case. During verification, the first passing-report CLI test failed because I had used an absolute `/tmp/...` report path even though the diagnostics contract intentionally keeps inputs repo-local for redaction and reproducibility; I corrected the test to use a repo-local temp path and the verification then passed cleanly.

## Verification

Ran the planned task verification command and confirmed all four diagnostics contract tests passed. Then exercised the new diagnostics CLI directly against the tracked baseline report to confirm the operator-facing output preserves the failing repo-mode artifact path, failed browser phase, expected/actual browser assertion values, command snippet, and repo-vs-installed divergence summary. The current baseline remains truthfully red because of pre-existing fixture-state signals captured in the tracked report; this task only renders those signals more clearly.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/parity-diagnostics-contract.test.ts` | 0 | ✅ pass | 389ms |
| 2 | `node --experimental-strip-types tests/parity/diagnostics.ts --report tests/parity/artifacts/baseline-report.json` | 0 | ✅ pass | 48ms |

## Deviations

None.

## Known Issues

The tracked baseline report still reflects a truthful failing repo-mode browser parity case and known non-task lane failures/skips; this task intentionally renders those existing signals rather than changing the baseline itself.

## Files Created/Modified

- `tests/parity/diagnostics.ts`
- `src/tests/integration/parity-diagnostics-contract.test.ts`

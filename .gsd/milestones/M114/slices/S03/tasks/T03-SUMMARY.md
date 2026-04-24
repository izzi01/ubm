---
id: T03
parent: S03
milestone: M114
key_files:
  - tests/parity/baseline-lanes.ts
  - tests/fixtures/parity-web-task-manifest.json
  - src/tests/integration/installed-mode-parity-contract.test.ts
  - src/tests/integration/parity-baseline-contract.test.ts
  - tests/parity/artifacts/baseline-report.json
key_decisions:
  - Treat installed packaged parity as a recorded-artifact coding-loop proof lane in the shared baseline report rather than reusing the stale `src/tests/integration/pack-install.test.ts` execution path for parity coverage.
  - Expose explicit repo-vs-installed comparison data (`repoInstalledComparison`) in the baseline JSON so later slices can diagnose divergence phase-by-phase without rerunning either proof lane.
duration: 
verification_result: mixed
completed_at: 2026-04-24T07:08:12.621Z
blocker_discovered: false
---

# T03: Wired installed-mode recorded parity into the baseline report and manifest, but wrap-up arrived before the remaining adjacent contract-test cleanup could turn verification green.

**Wired installed-mode recorded parity into the baseline report and manifest, but wrap-up arrived before the remaining adjacent contract-test cleanup could turn verification green.**

## What Happened

Implemented the planned report wiring so installed packaged parity is now modeled as a first-class recorded-artifact lane instead of the stale node-test lane. Updated `tests/parity/baseline-lanes.ts` to load the installed-mode recording through the shared helper, mark both repo and installed recorded lanes as coding-loop proofs, and emit a new `repoInstalledComparison` surface with per-phase comparison data, artifact paths, and divergence phases. Updated `tests/fixtures/parity-web-task-manifest.json` so the five coding-loop capabilities now truthfully mark both `repo-mode-coding-loop` and `pack-install` as covered while preserving broader uncovered gaps in the remaining lanes. Updated `src/tests/integration/installed-mode-parity-contract.test.ts` and `src/tests/integration/parity-baseline-contract.test.ts` so they assert the recorded installed lane behavior, artifact-path preservation, failedPhase propagation, and direct repo-vs-installed comparison points. Fresh verification then showed the targeted installed-mode and parity-baseline contracts passing, and `tests/parity/run.ts --format json` now reports `pack-install` as a passing recorded lane with explicit `artifactPath`, `phaseResults`, and `repoInstalledComparison`. However, the combined task verification command remained red because `src/tests/integration/repo-mode-parity-contract.test.ts` still expected the old manifest `not-covered` value for the repo lane after the manifest truthfully moved to `covered`, and the adjacent `src/tests/integration/parity-fixture-manifest.test.ts` file still contains a pre-existing trailing syntax error (`) })`) that prevents it from loading. A follow-up write to update the repo-mode contract was interrupted when the wrap-up event arrived, so I stopped here and am recording the precise failing evidence rather than claiming a green task.

## Verification

Fresh verification after the code changes showed `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/installed-mode-parity-contract.test.ts` passing all 5 installed-mode parity assertions, `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/parity-baseline-contract.test.ts` passing all 3 baseline contract assertions, and `node --experimental-strip-types tests/parity/run.ts --format json` producing a version 4 report with `pack-install` as a passing recorded-artifact lane, explicit `artifactPath`/`failedPhase` fields, and a `repoInstalledComparison` block that compares repo vs installed phases without rerunning either lane. The task-level combined verification command remained red because `src/tests/integration/repo-mode-parity-contract.test.ts` still asserts the old `not-covered` manifest value for the repo lane, and the adjacent `src/tests/integration/parity-fixture-manifest.test.ts` still fails to parse due to trailing stray tokens. The current report output is therefore functionally updated, but the slice verification bar is not yet green.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/installed-mode-parity-contract.test.ts` | 0 | ✅ pass | 120000ms |
| 2 | `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/parity-baseline-contract.test.ts` | 0 | ✅ pass | 44923ms |
| 3 | `node --experimental-strip-types tests/parity/run.ts --format json` | 0 | ✅ pass | 0ms |
| 4 | `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/installed-mode-parity-contract.test.ts src/tests/integration/repo-mode-parity-contract.test.ts` | 1 | ❌ fail | 136630ms |
| 5 | `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/parity-fixture-manifest.test.ts` | 1 | ❌ fail | 155ms |

## Deviations

Stopped at the wrap-up budget warning with truthful partial completion instead of continuing the final adjacent test cleanups. I updated the installed-mode and baseline contracts plus the shared report wiring, but did not finish the pending repo-mode contract expectation update or the neighboring manifest-test syntax cleanup before recording this summary.

## Known Issues

`node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/installed-mode-parity-contract.test.ts src/tests/integration/repo-mode-parity-contract.test.ts` still fails because `src/tests/integration/repo-mode-parity-contract.test.ts` expects `capability.laneCoverage[repo-mode-coding-loop] === "not-covered"` even though the manifest now truthfully marks the repo recorded proof as `covered`. `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/parity-fixture-manifest.test.ts` fails to load due to a pre-existing trailing syntax fragment at the end of the file (`) })`). Smoke parity also remains red in the generated report (`smoke-runner` exit code 1), matching prior known baseline state rather than this task’s new changes.

## Files Created/Modified

- `tests/parity/baseline-lanes.ts`
- `tests/fixtures/parity-web-task-manifest.json`
- `src/tests/integration/installed-mode-parity-contract.test.ts`
- `src/tests/integration/parity-baseline-contract.test.ts`
- `tests/parity/artifacts/baseline-report.json`

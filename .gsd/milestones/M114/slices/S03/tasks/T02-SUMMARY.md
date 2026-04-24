---
id: T02
parent: S03
milestone: M114
key_files:
  - src/tests/integration/helpers/installed-mode-parity.ts
  - tests/fixtures/recordings/installed-mode-parity-web-task.json
  - src/tests/integration/installed-mode-parity-contract.test.ts
  - tests/parity/baseline-lanes.ts
  - src/tests/integration/pack-install.test.ts
  - src/tests/integration/parity-baseline-contract.test.ts
  - src/tests/integration/parity-fixture-manifest.test.ts
key_decisions:
  - Model installed-mode parity artifacts with the same ordered phaseResults/failedPhase/browser diagnostic shape used by repo-mode parity so the shared report can compare them phase-by-phase.
  - Stop with a truthful partial summary once wrap-up triggered and verification was still failing, instead of claiming completion without fresh passing evidence.
duration: 
verification_result: mixed
completed_at: 2026-04-24T06:52:00.491Z
blocker_discovered: false
---

# T02: Added the installed-mode parity artifact/helper scaffold and contract-test wiring, but verification still fails on baseline/report integration and stale pack-install assertions.

**Added the installed-mode parity artifact/helper scaffold and contract-test wiring, but verification still fails on baseline/report integration and stale pack-install assertions.**

## What Happened

I implemented the main installed-mode proof scaffolding requested by the task: added `src/tests/integration/helpers/installed-mode-parity.ts` to validate/load installed-mode parity artifacts and derive installed-mode coverage, created the tracked artifact `tests/fixtures/recordings/installed-mode-parity-web-task.json`, and added `src/tests/integration/installed-mode-parity-contract.test.ts` to contract-test the installed artifact plus failing-artifact behavior. I also started wiring the shared parity report through `tests/parity/baseline-lanes.ts` so `pack-install` can behave like a recorded artifact lane instead of an opaque node-test lane. During verification, I found that the existing `src/tests/integration/pack-install.test.ts` still contains stale `gsd` package/binary assertions and that my quick edits to `src/tests/integration/parity-baseline-contract.test.ts` and `src/tests/integration/parity-fixture-manifest.test.ts` left trailing syntax-corruption at the file tails. The installed-mode tests also show the baseline report still returns `artifactPath: null` / `status: passed` for the failing override case, so the lane reconciliation is not fully hooked up yet. Because the wrap-up event fired and verification was still red, I stopped here and am recording the current truth for the next executor instead of forcing an unverified finish.

## Verification

Fresh verification was run after the last code changes. `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/installed-mode-parity-contract.test.ts` still fails: the installed-mode lane in the parity report is not yet surfacing the artifact path, the failing override remains reported as passed, and the baseline report still does not mark installed-mode coding-loop proof as complete. `test -f tests/fixtures/recordings/installed-mode-parity-web-task.json` passes. `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/pack-install.test.ts` still fails because stale `gsd` assertions remain in the file. `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/parity-baseline-contract.test.ts src/tests/integration/parity-fixture-manifest.test.ts` fails immediately with TypeScript syntax errors caused by trailing duplicate text at the ends of both files. Resume by cleaning those syntax tails first, then finish the `pack-install.test.ts` renames, then fix the baseline-lane recorded-artifact path/status plumbing for `pack-install`.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/installed-mode-parity-contract.test.ts` | 1 | ❌ fail | 89899ms |
| 2 | `test -f tests/fixtures/recordings/installed-mode-parity-web-task.json` | 0 | ✅ pass | 20ms |
| 3 | `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/pack-install.test.ts` | 1 | ❌ fail | 64507ms |
| 4 | `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/parity-baseline-contract.test.ts src/tests/integration/parity-fixture-manifest.test.ts` | 1 | ❌ fail | 110ms |

## Deviations

Did not finish the task to a passing state. I chose to stop after producing the installed-mode helper/artifact/test scaffold and recording precise failing verification evidence because the wrap-up budget warning arrived while verification remained red.

## Known Issues

`src/tests/integration/parity-baseline-contract.test.ts` ends with stray trailing text (`atch(...)`) and does not parse. `src/tests/integration/parity-fixture-manifest.test.ts` ends with extra `) })` and does not parse. `src/tests/integration/pack-install.test.ts` still contains stale `gsd`/`gsd-pi` expectations around piConfig and installed binary/package paths. `tests/parity/baseline-lanes.ts` imports the installed-mode helper, but the `pack-install` lane still reports `artifactPath: null` / wrong status behavior in the baseline report, so reconciliation is incomplete.

## Files Created/Modified

- `src/tests/integration/helpers/installed-mode-parity.ts`
- `tests/fixtures/recordings/installed-mode-parity-web-task.json`
- `src/tests/integration/installed-mode-parity-contract.test.ts`
- `tests/parity/baseline-lanes.ts`
- `src/tests/integration/pack-install.test.ts`
- `src/tests/integration/parity-baseline-contract.test.ts`
- `src/tests/integration/parity-fixture-manifest.test.ts`

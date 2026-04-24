# S01: S01 — UAT

**Milestone:** M114
**Written:** 2026-04-24T05:54:59.510Z

# S01 UAT — Baseline parity audit and residual cleanup

## Preconditions
- Worktree is `/home/cid/projects-personal/umb`.
- Dependencies are installed.
- Do not set `GSD_LIVE_TESTS`; this UAT checks the default baseline contract where live proof is optional and skipped.

## Test Case 1 — Baseline parity command produces one machine-readable inventory
1. Run `npm run test:parity:baseline`.
   - Expected: the command prints JSON and completes without shell errors.
2. Inspect the `summary` object in stdout.
   - Expected: `verdict` is `failing`, `totalLanes` is `7`, `passed` is `4`, `failed` is `2`, `skipped` is `1`, and `provesCodingLoop` is `false`.
3. Inspect `summary.uncoveredCapabilityNames`.
   - Expected: it contains exactly `inspect-repository-context`, `edit-application-code`, `run-targeted-tests`, `manage-dev-server-lifecycle`, and `verify-browser-behavior`.

## Test Case 2 — Report artifact is written and contains actionable per-lane diagnostics
1. Open `tests/parity/artifacts/baseline-report.json` after running the baseline command.
   - Expected: the file exists and is valid JSON.
2. Find the `smoke-runner` lane row.
   - Expected: `proofClass` is `smoke`, `status` is `failed`, and `skipReason` says `smoke-runner exited with code 1`.
3. Find the `pack-install` lane row.
   - Expected: `proofClass` is `installed-binary`, `status` is `failed`, and `skipReason` says `pack-install exited with code 1`.
4. Find the `live-runner` lane row.
   - Expected: `status` is `skipped` and the skip reason explains that `GSD_LIVE_TESTS` is not enabled.

## Test Case 3 — M113 cleanup is shown as reconciled foundation, not an open M114 gap
1. In `tests/parity/artifacts/baseline-report.json`, inspect `reconciledFoundations`.
   - Expected: one entry exists for milestone `M113`.
2. Check the requirement map in that entry.
   - Expected: `R023` and `R026` are both marked `validated`.
3. Check the annotation text.
   - Expected: it states that M113 cleanup is closed foundation work and not an open parity gap for M114.

## Test Case 4 — Fixture acceptance manifest is readable and specific enough for S02
1. Open `tests/fixtures/parity-web-task-manifest.json`.
   - Expected: the manifest has fixture id `parity-web-task` and a human-readable title for the purpose-built small web-task coding loop fixture.
2. Review the capability list.
   - Expected: there are five capabilities covering inspect, edit, test, dev-server lifecycle, and browser verification.
3. Review one capability's `observableCompletionCriteria` and `laneCoverage`.
   - Expected: criteria are concrete and lane coverage shows `covered`/`partial`/`not-covered` mappings against the tracked baseline lanes.

## Test Case 5 — Regression suite locks the contract in place
1. Run `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/parity-baseline-contract.test.ts src/tests/integration/parity-m113-reconciliation.test.ts src/tests/integration/parity-fixture-manifest.test.ts`.
   - Expected: all 11 tests pass.
2. Confirm the test names mention lane matrix contract, M113 reconciliation, and fixture manifest coverage.
   - Expected: the suite proves the baseline lane inventory, reconciliation metadata, and uncovered-capability reporting are all enforced.

## Edge Cases
- If `GSD_LIVE_TESTS=1` is set, the live lane may execute instead of being skipped; that is outside the default S01 UAT path.
- If a future change makes the baseline report exit non-zero when the verdict is failing, that is a regression: S01 requires a truthful report surface even when baseline parity is incomplete.
- If any uncovered capability disappears from the report before S02/S03 land real proof, treat that as over-claiming parity and investigate immediately.

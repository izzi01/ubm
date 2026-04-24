# S02: Web-mode parity proof — UAT

**Milestone:** M115
**Written:** 2026-04-24T10:19:34.453Z

# S02 UAT — Web-mode parity proof

## Preconditions

1. Work in the repo root `/home/cid/projects-personal/umb`.
2. Ensure Node can run strip-types tests in this checkout.
3. Do not set live-provider secrets; this UAT targets deterministic local proof only.

## Test Case 1 — Deterministic web-mode fixture contract stays valid

1. Run:
   `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/web-mode-fixture-contract.test.ts`
2. Expected outcome:
   - The suite passes.
   - Assertions confirm `tests/fixtures/web-mode-parity-manifest.json` and the tracked fixture directory exist.
   - The fixture explicitly names the startup project and switch target.
   - Browser-visible observables align with shipped selectors.

## Test Case 2 — Canonical parity runner emits the web-mode secondary-parity row

1. Run:
   `node --experimental-strip-types tests/parity/run.ts --format json`
2. Expected outcome:
   - Command exits successfully and emits JSON.
   - The JSON includes `secondaryParity.surfaces` with a `web-mode` row.
   - That row shows:
     - `inventoryStatus: "partial"`
     - `releaseReadableStatus: "partial"`
     - `requiredLaneNames` containing `secondary-parity-report` and `integration:web-mode`
     - `existingRequiredLaneNames` containing `integration:web-mode`
     - `missingRequiredLaneNames` containing `secondary-parity-report`
     - `presentFixturePaths` containing `tests/parity/artifacts/secondary-surface-inventory.json` and `src/tests/integration/web-mode-cli.test.ts`
     - `plannedFixturePaths` containing `tests/parity/artifacts/secondary-parity-report.json#web-mode`

## Test Case 3 — Web-mode parity contract test locks truthful report semantics

1. Run:
   `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/web-mode-parity-contract.test.ts`
2. Expected outcome:
   - The suite passes.
   - It verifies the baseline report keeps the web-mode row truthful rather than silently claiming full coverage.
   - It verifies the row preserves actionable uncovered-gap metadata for downstream release reporting.

## Test Case 4 — Diagnostics stay operator-actionable for browser-hosted parity evidence

1. Run:
   `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/web-mode-diagnostics-contract.test.ts`
2. Expected outcome:
   - The suite passes.
   - Browser-phase diagnostics preserve assertion, expected value, actual value, command, exit code, and snippet details.
   - Artifact paths remain present in summaries.

## Test Case 5 — Human-readable diagnostics can be rendered from the baseline artifact

1. First generate the baseline artifact:
   `node --experimental-strip-types tests/parity/run.ts --format json > /tmp/m115-s02-parity.json`
2. Then render diagnostics:
   `node --experimental-strip-types tests/parity/diagnostics.ts --report tests/parity/artifacts/baseline-report.json`
3. Expected outcome:
   - Output starts with `Parity diagnostics:`.
   - It shows the current baseline verdict.
   - It retains actionable lane summaries and artifact paths.
   - Repo/install coding-loop lanes still show browser evidence while web-mode secondary parity remains represented in the baseline artifact rather than falsely promoted to covered.

## Edge Cases / Truthfulness Checks

1. Confirm `web-mode` remains listed in `secondaryParity.summary.surfacesMissingReleaseReadableCoverage`.
   - Expected: `web-mode` is still listed, proving the report does not overclaim closure.
2. Confirm no dedicated `tests/parity/artifacts/web-mode-parity.json` is required for this slice’s current state.
   - Expected: the canonical source of truth is the `secondaryParity` section inside `tests/parity/artifacts/baseline-report.json`, and the contract test locks that behavior.
3. Confirm the slice does not depend on external services.
   - Expected: all commands above pass locally without provider secrets or network dependencies.

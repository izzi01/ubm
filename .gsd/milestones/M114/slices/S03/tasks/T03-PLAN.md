---
estimated_steps: 31
estimated_files: 7
skills_used: []
---

# T03: Wire installed parity into the manifest and baseline report

Skills to load before coding: `test`, `observability`, `verify-before-complete`.

Finish the slice by making installed packaged parity a first-class lane in the shared M114 report contract. The manifest must truthfully describe which coding-loop capabilities are now covered in installed mode, and the JSON report must let later slices compare repo and installed artifacts directly when packaged behavior diverges.

## Failure Modes

| Dependency | On error | On timeout | On malformed response |
|------------|----------|-----------|----------------------|
| parity manifest/report wiring | Fail contract tests before runtime with the missing lane or bad coverage mapping named explicitly | N/A (pure report wiring) | Reject invalid proof/coverage combinations and missing installed artifact targets |
| installed-mode artifact loading | Preserve artifact path and parse error in the lane result | N/A (recorded artifact) | Reject wrong laneName/fixtureId or missing phase diagnostics while keeping the target path visible |

## Load Profile

- **Shared resources**: sequential parity report generation and one JSON artifact write
- **Per-operation cost**: one more recorded-artifact lane plus constant-size report updates
- **10x breakpoint**: lane runtime remains bounded because the report consumes tracked artifacts instead of rerunning the installed binary

## Negative Tests

- **Malformed inputs**: missing installed artifact target, invalid lane coverage entry, wrong installed lane name in the artifact
- **Error paths**: failing installed artifact still emits `failedPhase` and artifactPath, repo-vs-installed mismatch stays visible in report output
- **Boundary conditions**: report with repo mode passing and installed mode failing, report with both lanes passing, manifest coverage cannot claim installed coverage without the installed lane

## Steps

1. Extend `tests/parity/baseline-lanes.ts` with an installed-mode recorded-artifact lane and any comparison metadata needed to tell repo vs installed proof apart.
2. Update `tests/fixtures/parity-web-task-manifest.json` so installed-mode coding-loop coverage for the five capabilities reflects the new lane truthfully while preserving repo-mode coverage from S02.
3. Add/extend contract tests so `tests/parity/run.ts --format json` locks installed-mode lane status, artifactPath, failedPhase behavior, and repo-vs-installed comparison surfaces.

## Must-Haves

- [ ] Installed packaged parity appears as a first-class lane in the parity report.
- [ ] Manifest coverage for the five coding-loop capabilities includes truthful installed-mode lane coverage.
- [ ] The JSON report preserves artifactPath and failedPhase for installed-mode failures.
- [ ] Repo and installed proofs can be compared without rerunning either lane live.

## Verification

- `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/installed-mode-parity-contract.test.ts src/tests/integration/repo-mode-parity-contract.test.ts`
- `node --experimental-strip-types tests/parity/run.ts --format json`

## Observability Impact

- Signals added/changed: installed-mode lane status, artifactPath, failedPhase, and repo-vs-installed comparison points in parity JSON
- How a future agent inspects this: run `tests/parity/run.ts --format json` and inspect the installed lane rows/artifact paths
- Failure state exposed: whether packaged parity failed in inspect/edit/test/dev-server/browser and where the deterministic evidence file lives

## Inputs

- ``tests/parity/baseline-lanes.ts``
- ``tests/parity/run.ts``
- ``tests/fixtures/parity-web-task-manifest.json``
- ``tests/fixtures/recordings/repo-mode-parity-web-task.json``
- ``tests/fixtures/recordings/installed-mode-parity-web-task.json``
- ``src/tests/integration/repo-mode-parity-contract.test.ts``
- ``src/tests/integration/installed-mode-parity-contract.test.ts``

## Expected Output

- ``tests/parity/baseline-lanes.ts``
- ``tests/parity/run.ts``
- ``tests/fixtures/parity-web-task-manifest.json``
- ``src/tests/integration/repo-mode-parity-contract.test.ts``
- ``src/tests/integration/installed-mode-parity-contract.test.ts``

## Verification

node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/installed-mode-parity-contract.test.ts src/tests/integration/repo-mode-parity-contract.test.ts && node --experimental-strip-types tests/parity/run.ts --format json

## Observability Impact

The shared parity report becomes the canonical inspection surface for installed packaged parity, so it must keep artifact paths and phase-local diagnostics explicit even when the lane fails.

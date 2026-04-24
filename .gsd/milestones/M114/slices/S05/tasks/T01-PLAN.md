---
estimated_steps: 1
estimated_files: 5
skills_used: []
---

# T01: Assemble the strict release parity gate over the canonical report

Build a release-facing parity gate command on top of the existing baseline report instead of creating a second harness. The command should rerun or consume the canonical parity report, require the deterministic repo/dev and installed packaged coding-loop lanes to pass, preserve actionable artifactPath/failedPhase/repoInstalledComparison surfaces, and publish a stable report/CLI contract that downstream release checks can call directly.

## Inputs

- `tests/parity/run.ts`
- `tests/parity/baseline-lanes.ts`
- `tests/parity/diagnostics.ts`
- `tests/parity/artifacts/baseline-report.json`
- `src/tests/integration/parity-baseline-contract.test.ts`

## Expected Output

- `tests/parity/release-gate.ts`
- `src/tests/integration/parity-release-gate-contract.test.ts`
- `package.json`

## Verification

node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/parity-release-gate-contract.test.ts

## Observability Impact

Adds a release-facing verdict/report surface that keeps required failing lane, mode, failed phase, artifact path, and repo-vs-installed comparison visible without reading raw JSON by hand.

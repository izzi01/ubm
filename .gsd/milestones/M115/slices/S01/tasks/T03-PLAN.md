---
estimated_steps: 1
estimated_files: 4
skills_used: []
---

# T03: Publish baseline secondary-parity report wiring

Extend the parity runner/report plumbing so M115 has an explicit baseline inventory for secondary surfaces. The runner should emit structured lane metadata, uncovered surfaces, drift findings, and report paths even when the verdict is partial. Keep the report usable by downstream diagnostics and release-gate slices without requiring live reruns.

## Inputs

- `Secondary parity matrix from T02`
- `existing M114 report/diagnostics plumbing`

## Expected Output

- `tests/parity/artifacts/secondary-surface-inventory.json`
- `src/tests/integration/secondary-parity-report-contract.test.ts`

## Verification

node --experimental-strip-types tests/parity/run.ts --format json && node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/secondary-parity-report-contract.test.ts

## Observability Impact

Adds a baseline report surface that later slices can reuse for diagnostics and release gating.

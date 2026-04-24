---
estimated_steps: 14
estimated_files: 5
skills_used: []
---

# T03: Wire repo-mode proof into the parity manifest and report

Skills to load before coding: `test`, `observability`, `verify-before-complete`.

Close the slice by wiring the new repo-mode proof into the existing parity inventory layer so S01's manifest-backed uncovered-capability report becomes truthful repo-mode coverage instead of stale prose. Keep the baseline runner deterministic and machine-readable.

Steps:
1. Extend the parity lane metadata/report contract so the repo-mode coding-loop proof is a first-class repo-mode lane with an artifact path and phase-local diagnostics.
2. Update `tests/fixtures/parity-web-task-manifest.json` so the five repo-mode capabilities reflect the new proof coverage and remaining gaps truthfully.
3. Add contract tests that lock the manifest/report wiring and ensure `tests/parity/run.ts --format json` preserves actionable repo-mode diagnostics even when the new lane fails.

Must-haves:
- [ ] The repo-mode proof appears in the parity report instead of living in an ad-hoc one-off test.
- [ ] Manifest coverage changes are derived from the real lane, not hand-wavy prose.
- [ ] The JSON report preserves enough detail to tell whether inspect/edit/test/dev-server/browser failed.
- [ ] Baseline/report behavior stays deterministic with no live-model dependency.

Failure Modes (Q5): bad manifest coverage mappings must fail contract tests before runtime; parity lane failures must still emit the JSON artifact; missing repo-mode artifact paths must fail with an explicit contract error.
Load Profile (Q6): shared resources are sequential parity lanes and the report artifact writer; per operation cost is one additional repo-mode lane; at 10x load the first breakpoint is lane runtime, so report generation must remain bounded and artifact writes constant-size.
Negative Tests (Q7): verify failing repo-mode lane still produces a report, malformed manifest coverage is rejected, and stale capability status cannot claim covered while uncovered lanes remain.

## Inputs

- ``tests/parity/baseline-lanes.ts``
- ``tests/parity/run.ts``
- ``tests/fixtures/parity-web-task-manifest.json``
- ``tests/fixtures/recordings/repo-mode-parity-web-task.json``
- ``src/tests/integration/repo-mode-coding-loop.test.ts``
- ``package.json``

## Expected Output

- ``tests/parity/baseline-lanes.ts``
- ``tests/parity/run.ts``
- ``tests/fixtures/parity-web-task-manifest.json``
- ``src/tests/integration/repo-mode-parity-contract.test.ts``
- ``package.json``

## Verification

node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/repo-mode-parity-contract.test.ts && node --experimental-strip-types tests/parity/run.ts --format json

## Observability Impact

The parity JSON report should expose repo-mode lane status, artifact path, failed phase, and command/browser diagnostics so later slices can compare repo vs installed behavior without ambiguous stderr scraping.

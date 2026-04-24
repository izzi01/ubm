---
estimated_steps: 1
estimated_files: 5
skills_used: []
---

# T01: Render actionable parity diagnostics from the recorded report

Add an operator-facing diagnostics renderer on top of the existing parity JSON contract instead of inventing a second harness. It should consume the baseline report plus recorded repo/installed artifacts, summarize the failing mode and phase, preserve artifact paths, and surface the highest-signal command/browser evidence for synthetic failure cases. Lock this with integration tests that exercise both passing and failing artifact/report inputs so R031 stays debuggable.

## Inputs

- ``tests/parity/baseline-lanes.ts``
- ``tests/parity/run.ts``
- ``tests/fixtures/recordings/repo-mode-parity-web-task.json``
- ``tests/fixtures/recordings/installed-mode-parity-web-task.json``
- ``src/tests/integration/repo-mode-parity-contract.test.ts``
- ``src/tests/integration/installed-mode-parity-contract.test.ts``

## Expected Output

- ``tests/parity/diagnostics.ts``
- ``src/tests/integration/parity-diagnostics-contract.test.ts``
- ``tests/parity/artifacts/baseline-report.json``

## Verification

node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/parity-diagnostics-contract.test.ts

## Observability Impact

Promotes raw parity JSON into a mode-aware diagnostic summary that keeps failed lane, failed phase, artifact path, repo-vs-installed comparison, and browser/command evidence inspectable without reading the full report by hand.

---
estimated_steps: 1
estimated_files: 7
skills_used: []
---

# T02: Implement web-mode parity lane and diagnostics

Implement the web-mode parity proof lane and diagnostics. Exercise web-mode startup plus the selected project-context behavior, capture machine-readable evidence/artifacts, and make failure output explain whether startup, routing/context, or browser-visible verification broke. Reuse the M114 recorded-artifact pattern where practical so the final report can compare and summarize results without opaque stderr parsing.

## Inputs

- `Web-mode fixture contract from T01`
- `existing diagnostics/report plumbing`

## Expected Output

- `tests/fixtures/recordings/web-mode-parity.json`
- `src/tests/integration/web-mode-parity-contract.test.ts`
- `tests/parity/artifacts/web-mode-parity.json`

## Verification

node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/web-mode-parity-contract.test.ts && node --experimental-strip-types tests/parity/run.ts --format json

## Observability Impact

Adds structured web-mode parity evidence, failed-phase data, and artifact references to the parity report.

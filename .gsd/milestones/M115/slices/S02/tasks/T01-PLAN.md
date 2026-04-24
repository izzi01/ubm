---
estimated_steps: 1
estimated_files: 4
skills_used: []
---

# T01: Define deterministic web-mode fixture and contract

Choose or build a deterministic web-mode fixture that exercises the operator path we care about most for parity. The fixture should prove web-mode startup, project context selection/switching or equivalent scoped project targeting, and a browser-visible success condition without depending on external services. Record the acceptance contract and expected observables.

## Inputs

- `M115 S01 secondary parity manifest`
- `existing web-mode tests/harnesses`
- `M114 fixture/manifest patterns`

## Expected Output

- `tests/fixtures/web-mode-parity-fixture/`
- `tests/fixtures/web-mode-parity-manifest.json`
- `src/tests/integration/web-mode-fixture-contract.test.ts`

## Verification

node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/web-mode-fixture-contract.test.ts

## Observability Impact

Defines the reproducible web-mode proof target and expected browser-visible observables.

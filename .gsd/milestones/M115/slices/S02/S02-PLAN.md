# S02: Web-mode parity proof

**Goal:** Add a deterministic proof lane for web mode so umb's browser-hosted/operator path is verified rather than assumed from isolated tests.
**Demo:** After this: umb can prove a deterministic web-mode workflow with startup, project selection/switching or equivalent project-context behavior, browser-facing verification, and actionable diagnostics.

## Must-Haves

- A reproducible web-mode fixture/path exercises startup, the intended project-context behavior, browser-visible verification, and stable diagnostics. The parity report can point to web-mode artifacts/evidence when the lane passes or fails.

## Proof Level

- This slice proves: Deterministic integration/contract coverage plus machine-readable artifact(s) for web-mode parity evidence.

## Integration Closure

The resulting diagnostics and artifacts are consumable by the milestone's final parity report/release gate.

## Verification

- Introduces web-mode parity artifact paths and failure summaries with enough detail to debug startup or browser-facing regressions.

## Tasks

- [ ] **T01: Define deterministic web-mode fixture and contract** `est:1 day`
  Choose or build a deterministic web-mode fixture that exercises the operator path we care about most for parity. The fixture should prove web-mode startup, project context selection/switching or equivalent scoped project targeting, and a browser-visible success condition without depending on external services. Record the acceptance contract and expected observables.
  - Files: `src/web-mode.ts`, `src/cli-web-branch.ts`, `tests/fixtures/web-mode-parity-manifest.json`, `src/tests/integration/web-mode-fixture-contract.test.ts`
  - Verify: node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/web-mode-fixture-contract.test.ts

- [ ] **T02: Implement web-mode parity lane and diagnostics** `est:1-1.5 days`
  Implement the web-mode parity proof lane and diagnostics. Exercise web-mode startup plus the selected project-context behavior, capture machine-readable evidence/artifacts, and make failure output explain whether startup, routing/context, or browser-visible verification broke. Reuse the M114 recorded-artifact pattern where practical so the final report can compare and summarize results without opaque stderr parsing.
  - Files: `tests/parity/secondary-lanes.ts`, `tests/parity/run.ts`, `tests/parity/diagnostics.ts`, `tests/fixtures/recordings/web-mode-parity.json`, `src/tests/integration/web-mode-parity-contract.test.ts`, `src/web-mode.ts`, `src/cli-web-branch.ts`
  - Verify: node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/web-mode-parity-contract.test.ts && node --experimental-strip-types tests/parity/run.ts --format json

- [ ] **T03: Lock web-mode diagnostic and report contract** `est:0.5 day`
  Add operator-facing verification for the browser-hosted path, ensuring the surfaced diagnostics are actionable and the report remains truthful when the lane is partial, passing, or failing. Confirm the artifact/report output names the web-mode evidence path and preserves expected/actual browser-facing details where appropriate.
  - Files: `tests/parity/diagnostics.ts`, `src/tests/integration/web-mode-diagnostics-contract.test.ts`, `tests/parity/artifacts/web-mode-parity.json`
  - Verify: node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/web-mode-diagnostics-contract.test.ts

## Files Likely Touched

- src/web-mode.ts
- src/cli-web-branch.ts
- tests/fixtures/web-mode-parity-manifest.json
- src/tests/integration/web-mode-fixture-contract.test.ts
- tests/parity/secondary-lanes.ts
- tests/parity/run.ts
- tests/parity/diagnostics.ts
- tests/fixtures/recordings/web-mode-parity.json
- src/tests/integration/web-mode-parity-contract.test.ts
- src/tests/integration/web-mode-diagnostics-contract.test.ts
- tests/parity/artifacts/web-mode-parity.json

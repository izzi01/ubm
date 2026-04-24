---
estimated_steps: 1
estimated_files: 3
skills_used: []
---

# T03: Lock web-mode diagnostic and report contract

Add operator-facing verification for the browser-hosted path, ensuring the surfaced diagnostics are actionable and the report remains truthful when the lane is partial, passing, or failing. Confirm the artifact/report output names the web-mode evidence path and preserves expected/actual browser-facing details where appropriate.

## Inputs

- `Web-mode parity artifact/report from T02`

## Expected Output

- `src/tests/integration/web-mode-diagnostics-contract.test.ts`

## Verification

node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/web-mode-diagnostics-contract.test.ts

## Observability Impact

Locks the actionable web-mode diagnostic surface before integration into the release gate.

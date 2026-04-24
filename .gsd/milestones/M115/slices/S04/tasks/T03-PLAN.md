---
estimated_steps: 1
estimated_files: 3
skills_used: []
---

# T03: Lock workflow diagnostic contract

Add contract coverage for operator-facing workflow diagnostics so failures name the missing artifact, invalid transition, or mismatched expected output directly. Ensure the parity report and diagnostics renderer can summarize workflow proof status without forcing humans to inspect raw task logs.

## Inputs

- `Workflow parity artifact/report from T02`

## Expected Output

- `src/tests/integration/workflow-parity-diagnostics-contract.test.ts`

## Verification

node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/workflow-parity-diagnostics-contract.test.ts

## Observability Impact

Locks the workflow failure surface into a stable, actionable report contract.

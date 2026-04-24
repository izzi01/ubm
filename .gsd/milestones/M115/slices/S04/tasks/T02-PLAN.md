---
estimated_steps: 1
estimated_files: 7
skills_used: []
---

# T02: Implement workflow parity lane and recorded evidence

Implement the representative workflow parity proof. Exercise the scoped planning-to-execution path, capture the produced artifacts and state transitions, and serialize a machine-readable artifact/report that can be consumed by the final parity gate. The proof should clearly show what was planned, what transitioned, and where the operator-facing outputs live when something breaks.

## Inputs

- `Workflow fixture contract from T01`
- `existing workflow engine and artifact writers`
- `shared parity report plumbing`

## Expected Output

- `tests/fixtures/recordings/workflow-parity.json`
- `src/tests/integration/workflow-parity-contract.test.ts`
- `tests/parity/artifacts/workflow-parity.json`

## Verification

node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/workflow-parity-contract.test.ts && node --experimental-strip-types tests/parity/run.ts --format json

## Observability Impact

Adds workflow parity lane evidence and artifact/state-transition diagnostics to the shared parity report.

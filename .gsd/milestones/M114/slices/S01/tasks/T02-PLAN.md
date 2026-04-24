---
estimated_steps: 13
estimated_files: 3
skills_used: []
---

# T02: Reconcile stale M113 cleanup bookkeeping and baseline truth claims

Skills to load before coding: `test`, `verify-before-complete`, `debug-like-expert`.

Use M113’s summary and validation evidence to reconcile the stale cleanup contract that M114 explicitly calls out. The implementation should update the project requirement bookkeeping and make the baseline report truthfully reflect that M113 already delivered its cleanup work, instead of letting S01 build new parity claims on top of known drift.

Steps:
1. Read `.gsd/milestones/M113/M113-SUMMARY.md`, `.gsd/milestones/M113/M113-VALIDATION.md`, and `.gsd/REQUIREMENTS.md` to identify which requirement rows or notes still misstate the delivered state.
2. Update the requirement bookkeeping through the GSD requirement tool during execution, then reflect the reconciled state in the parity baseline module or report annotations so the baseline distinguishes closed M113 cleanup from open M114 parity work.
3. Add an integration test that proves the baseline contract stays aligned with the reconciled requirement/bookkeeping state and fails if the old drift reappears.

Must-haves:
- The stale M113 cleanup drift called out in M114 context is concretely resolved, not merely documented.
- Baseline reporting no longer treats already-validated M113 cleanup as an open parity gap.
- Regression coverage guards the bookkeeping/report alignment.

Failure Modes (Q5): if requirement update tooling fails, stop and surface the exact requirement id and error; if source evidence is inconsistent, fail the test with the mismatched files called out; if the report annotation drifts from bookkeeping, the contract test must fail.
Load Profile (Q6): shared resources are the tracked `.gsd` requirement artifacts and baseline schema; per operation cost is trivial file parsing; at 10x scale the main risk is human confusion from stale state, not runtime load.
Negative Tests (Q7): stale active status, missing validation note, and inconsistent M113 summary-vs-report labeling should all fail deterministically.

## Inputs

- ``.gsd/REQUIREMENTS.md``
- ``.gsd/milestones/M113/M113-SUMMARY.md``
- ``.gsd/milestones/M113/M113-VALIDATION.md``
- ``tests/parity/baseline-lanes.ts``

## Expected Output

- ``.gsd/REQUIREMENTS.md``
- ``tests/parity/baseline-lanes.ts``
- ``src/tests/integration/parity-m113-reconciliation.test.ts``

## Verification

node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/parity-m113-reconciliation.test.ts

## Observability Impact

Makes bookkeeping drift visible in the baseline report so future agents can see whether a parity gap is real missing proof or merely stale contract state.

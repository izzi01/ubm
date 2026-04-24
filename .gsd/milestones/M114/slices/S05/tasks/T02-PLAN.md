---
estimated_steps: 1
estimated_files: 6
skills_used: []
---

# T02: Integrate the optional live spot-check and lock release workflow semantics

Wire the existing live harness into the release gate as an opt-in, non-blocking spot-check. Document and test the policy so missing `GSD_LIVE_TESTS` or missing live model configuration yields a precise skip instead of a flaky release failure, while enabled live runs still appear in the release report. Update the human/operator workflow and package scripts so one release command and one explicit include-live variant exist.

## Inputs

- `tests/live/run.ts`
- `tests/parity/release-gate.ts`
- `tests/parity/human-uat.md`
- `tests/parity/diagnostics.ts`
- `src/tests/integration/parity-human-uat-contract.test.ts`

## Expected Output

- `src/tests/integration/parity-live-spot-check-contract.test.ts`
- `tests/parity/human-uat.md`
- `package.json`

## Verification

node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/parity-live-spot-check-contract.test.ts src/tests/integration/parity-human-uat-contract.test.ts src/tests/integration/parity-release-gate-contract.test.ts && node --experimental-strip-types tests/parity/release-gate.ts --format json --include-live

## Observability Impact

Makes the live lane's participation explicit in release output by surfacing pass/skip/fail plus the reason it was skipped, without leaking API keys or broader environment state.

---
estimated_steps: 31
estimated_files: 7
skills_used: []
---

# T02: Record and contract-test installed-mode coding-loop proof

Skills to load before coding: `test`, `agent-browser`, `verify-before-complete`.

Promote the installed-binary fixture run into the same recorded-artifact pattern established in S02. The installed run must exercise inspect → edit → test → dev-server → browser on the tracked fixture, then persist a deterministic JSON artifact whose phase results and browser assertions can be replayed by parity-report consumers without rerunning a live model.

## Failure Modes

| Dependency | On error | On timeout | On malformed response |
|------------|----------|-----------|----------------------|
| installed-mode fixture helper | Preserve command args, stdout/stderr, and temp repo path in the artifact | Mark the exact stuck phase (`inspect`, `edit`, `test`, `dev-server`, or `browser`) and the readiness/assertion that timed out | Reject artifacts missing ordered phase results or artifactPath metadata |
| browser verification against local dev server | Preserve selector/assertion expected-vs-actual values in the artifact | Fail the `browser` phase with ready URL and timeout context | Reject browser evidence that omits expected/actual values |

## Load Profile

- **Shared resources**: one packaged CLI process, one fixture dev server, one browser session, one artifact file
- **Per-operation cost**: one full installed-mode coding-loop replay on the small fixture
- **10x breakpoint**: browser/server startup time dominates first, so the recorder must remain single-run and deterministic

## Negative Tests

- **Malformed inputs**: artifact missing a phase, duplicate phases, missing artifactPath, wrong fixtureId/laneName
- **Error paths**: failing browser assertion, failing test command, dev server never reaches readiness, helper cleanup misses shutdown
- **Boundary conditions**: passing artifact with a hidden failed phase, failing artifact with no failed phase, artifact override path that does not exist

## Steps

1. Use the installed-mode helper to execute the packaged coding loop against the fixture and write a tracked installed-mode artifact under `tests/fixtures/recordings/`.
2. Add contract tests that validate the artifact shape, ordered phase coverage, and failing-artifact behavior with explicit `failedPhase` plus browser expected/actual diagnostics.
3. Keep the artifact deterministic and fixture-local so it can serve as a stable parity input instead of a flaky live replay.

## Must-Haves

- [ ] The installed-mode artifact covers inspect, edit, test, dev-server, and browser in that order.
- [ ] Browser verification stores explicit assertion, expected text, and actual text values.
- [ ] Failing-artifact coverage proves `failedPhase` survives as actionable JSON.
- [ ] The recorder never depends on secrets or opt-in live provider configuration.

## Verification

- `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/installed-mode-parity-contract.test.ts`
- `test -f tests/fixtures/recordings/installed-mode-parity-web-task.json`

## Observability Impact

- Signals added/changed: installed-mode phaseResults, failedPhase derivation, browser expected/actual evidence
- How a future agent inspects this: open the tracked JSON artifact or run the installed-mode contract test
- Failure state exposed: which packaged coding-loop phase failed and the command/browser evidence needed to localize it

## Inputs

- ``src/tests/integration/helpers/installed-mode-parity.ts``
- ``tests/fixtures/parity-web-task/package.json``
- ``tests/fixtures/parity-web-task/src/task.ts``
- ``tests/fixtures/parity-web-task/tests/task.spec.ts``
- ``tests/fixtures/recordings/repo-mode-parity-web-task.json``
- ``src/tests/integration/repo-mode-parity-contract.test.ts``

## Expected Output

- ``tests/fixtures/recordings/installed-mode-parity-web-task.json``
- ``src/tests/integration/installed-mode-parity-contract.test.ts``
- ``src/tests/integration/helpers/installed-mode-parity.ts``

## Verification

node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/installed-mode-parity-contract.test.ts && test -f tests/fixtures/recordings/installed-mode-parity-web-task.json

## Observability Impact

The installed-mode artifact must surface the same high-signal phase diagnostics as repo mode so parity failures can be compared phase-by-phase instead of inferred from a single exit code.

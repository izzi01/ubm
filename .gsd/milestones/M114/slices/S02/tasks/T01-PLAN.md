---
estimated_steps: 14
estimated_files: 7
skills_used: []
---

# T01: Build the deterministic web-task parity fixture

Skills to load before coding: `test`, `tdd`, `verify-before-complete`.

Build the tracked parity fixture app and task contract that later parity tests will materialize into a temp repo. Keep the fixture small and deterministic: a tiny web app whose required change is confined to one visible behavior, whose tests run locally without secrets, and whose dev server can be started by a fixed npm script.

Steps:
1. Add `tests/fixtures/parity-web-task/` with a minimal web app, a task brief that tells the agent what user-visible change to make, and package scripts for `test` and `dev`.
2. Seed the app in a truthful pre-fix state so the targeted test fails before the intended edit and the browser-visible change is easy to assert after the fix.
3. Add a repo integration contract test that materializes the fixture, validates the file layout and scripts, and proves the fixture uses only tracked inputs.

Must-haves:
- [ ] The task requires editing application source, not only tests or metadata.
- [ ] `npm test` in the materialized fixture is fast and deterministic.
- [ ] `npm run dev` exposes an observable ready URL without arbitrary sleeps.
- [ ] The fixture brief points the agent at tracked files that can be inspected before editing.

Failure Modes (Q5): broken fixture scripts must fail the contract test with the exact missing script/file; malformed temp materialization must surface the offending path; missing Node dependency declarations must fail before the parity lane runs.
Load Profile (Q6): shared resources are temporary directories and one dev-server port; per operation cost is one local test run and one lightweight server process; at 10x load the first breakpoint is port/temp-dir churn, so the fixture must stay single-process and low-dependency.
Negative Tests (Q7): assert missing task brief, missing test script, and non-runnable dev script are rejected; assert the initial fixture state does not already satisfy the task.

## Inputs

- ``tests/fixtures/parity-web-task-manifest.json``
- ``tests/fixtures/provider.ts``
- ``package.json``

## Expected Output

- ``tests/fixtures/parity-web-task/package.json``
- ``tests/fixtures/parity-web-task/index.html``
- ``tests/fixtures/parity-web-task/src/main.ts``
- ``tests/fixtures/parity-web-task/src/task.ts``
- ``tests/fixtures/parity-web-task/tests/task.spec.ts``
- ``tests/fixtures/parity-web-task/TASK.md``
- ``src/tests/integration/repo-mode-fixture-contract.test.ts``

## Verification

node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/repo-mode-fixture-contract.test.ts

## Observability Impact

Contract-test failures should name the missing fixture file/script and the materialized temp path so later parity runs fail early and locally.

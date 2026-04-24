---
estimated_steps: 14
estimated_files: 4
skills_used: []
---

# T01: Build the baseline parity lane matrix and executable report runner

Skills to load before coding: `test`, `verify-before-complete`.

Create a tracked baseline parity runner that inventories the existing proof lanes instead of introducing a new harness family. The runner should define a fixed allowlisted lane matrix for `tests/smoke/run.ts`, `tests/fixtures/run.ts`, `tests/live/run.ts`, `tests/live-regression/run.ts`, `src/tests/integration/e2e-smoke.test.ts`, `src/tests/integration/e2e-headless.test.ts`, and `src/tests/integration/pack-install.test.ts`, then execute or classify them into proof classes such as smoke, repo-infra, installed-binary, live-spot-check, and uncovered-coding-loop.

Steps:
1. Add a small parity module under `tests/parity/` that declares the lane definitions, proof labels, skip semantics, and report schema without accepting arbitrary external commands.
2. Add a runner entrypoint and package script so one command emits a machine-readable baseline report summarizing pass/fail/skip, duration, proof class, and whether each lane actually proves the coding loop claimed by M114.
3. Add an integration test that exercises the runner in a temp workspace, asserts the report shape and labels, and proves the lane matrix stays tied to the real in-repo test files.

Must-haves:
- Fixed allowlisted lane definitions; no arbitrary shell passthrough.
- Machine-readable baseline report with explicit proof-class labels.
- Package script wired for local and CI use.
- Integration test covers success and skipped-lane classification.

Failure Modes (Q5): dependency process spawn failures should surface the lane name and exit code; timeouts should mark the lane timed_out rather than hanging the report; malformed lane definitions should fail the integration test before runtime.
Load Profile (Q6): shared resources are local subprocess slots and temporary directories; per operation cost is one child process per lane; at 10x load the first breakpoint is process churn and runtime, so the runner must stay sequential and bounded.
Negative Tests (Q7): invalid lane metadata, missing script targets, and skipped live lanes without secrets must all be covered.

## Inputs

- ``package.json``
- ``tests/smoke/run.ts``
- ``tests/fixtures/run.ts``
- ``tests/live/run.ts``
- ``tests/live-regression/run.ts``
- ``src/tests/integration/e2e-smoke.test.ts``
- ``src/tests/integration/e2e-headless.test.ts``
- ``src/tests/integration/pack-install.test.ts``

## Expected Output

- ``package.json``
- ``tests/parity/run.ts``
- ``tests/parity/baseline-lanes.ts``
- ``src/tests/integration/parity-baseline-contract.test.ts``

## Verification

node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/parity-baseline-contract.test.ts

## Observability Impact

Adds baseline report fields for lane name, proof class, status, skip reason, exit code, duration, and summary verdict so later parity failures can be localized quickly.

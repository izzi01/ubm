# S02: Repo-mode coding-loop proof

**Goal:** Prove the repo/dev build of umb can complete the deterministic small web-task fixture end-to-end: inspect the fixture, edit application code, run the fixture’s targeted tests, manage the dev server lifecycle, and verify the result in the browser.
**Demo:** After this: the repo/dev build of umb can complete the agreed small web-task fixture end-to-end, including code edits, test execution, dev-server management, and browser verification.

## Must-Haves

- A tracked small web-task fixture exists under `tests/fixtures/parity-web-task/` with a concrete task brief, application source, and task-scoped automated test that starts red before the intended change and passes after the change.
- A deterministic repo-mode parity path runs the repo/dev `umb` entrypoint against a temp materialization of that fixture and records evidence that the agent inspected tracked files, edited application code, ran fixture tests, started and stopped the dev server, and performed explicit browser assertions.
- The parity inventory layer reports repo-mode coding-loop coverage truthfully by wiring the new proof into `tests/parity/` and `tests/fixtures/parity-web-task-manifest.json`, with diagnostics that identify the failed phase and artifact surface.

## Proof Level

- This slice proves: - This slice proves: integration
- Real runtime required: yes
- Human/UAT required: no

## Integration Closure

- Upstream surfaces consumed: `tests/parity/baseline-lanes.ts`, `tests/parity/run.ts`, `tests/fixtures/parity-web-task-manifest.json`, `tests/fixtures/provider.ts`, `src/tests/integration/e2e-smoke.test.ts`, `src/tests/integration/e2e-headless.test.ts`
- New wiring introduced in this slice: tracked parity fixture materialization, deterministic repo-mode coding-loop integration test, repo-mode parity lane/report metadata
- What remains before the milestone is truly usable end-to-end: installed-binary parity in S03, richer diagnostics/UAT in S04, and the strict integrated release gate in S05

## Verification

- Runtime signals: repo-mode parity phase records for inspect/edit/test/dev-server/browser plus final lane verdict and artifact path
- Inspection surfaces: repo-mode integration test output, parity JSON report from `tests/parity/run.ts --format json`, and tracked fixture manifest coverage
- Failure visibility: failing phase, command exit/timeout, ready-check failure, browser assertion mismatch, and emitted artifact location
- Redaction constraints: keep the proof deterministic and local-only; no live secrets or provider-dependent data in artifacts

## Tasks

- [x] **T01: Build the deterministic web-task parity fixture** `est:45m`
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
  - Files: `tests/fixtures/parity-web-task/package.json`, `tests/fixtures/parity-web-task/index.html`, `tests/fixtures/parity-web-task/src/main.ts`, `tests/fixtures/parity-web-task/src/task.ts`, `tests/fixtures/parity-web-task/tests/task.spec.ts`, `tests/fixtures/parity-web-task/TASK.md`, `src/tests/integration/repo-mode-fixture-contract.test.ts`
  - Verify: node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/repo-mode-fixture-contract.test.ts

- [ ] **T02: Prove the repo-mode coding loop against the fixture** `est:1h15m`
  Skills to load before coding: `test`, `agent-browser`, `verify-before-complete`.

Turn the fixture into a real repo-mode proof by driving the repo/dev `umb` entrypoint through the deterministic coding loop in a temp workspace. Reuse the existing fixture replay approach instead of introducing a second harness family, but make the test assert on actual side effects: file edits, fixture test execution, dev-server readiness, browser assertions, and cleanup.

Steps:
1. Add a tracked deterministic conversation/command script that makes `umb` inspect the fixture files, edit the intended source file, run the fixture test command, start the dev server, verify the browser state, and stop the server.
2. Add an integration helper/test that materializes the fixture into a temp git repo, runs the repo/dev CLI against it, and records high-signal artifacts for each phase.
3. Assert the completed run changed the expected tracked files, observed passing fixture tests, captured browser assertion evidence, and cleaned up the dev server before exit.

Must-haves:
- [ ] The proof runs the repo/dev entrypoint from this repository, not the installed binary.
- [ ] The agent path includes inspect → edit → test → dev-server → browser verify → cleanup.
- [ ] Browser verification uses explicit assertions, not prose-only success text.
- [ ] Failure output names the phase that broke and where to inspect artifacts.

Failure Modes (Q5): CLI spawn failures must preserve stdout/stderr and the invoked args; dev-server timeouts must fail with the ready check and port; browser assertion failures must preserve the selector/text expectation and screenshot or DOM evidence; cleanup failures must surface the orphaned process id/command.
Load Profile (Q6): shared resources are one repo-mode child process, one dev server, and one browser session; per run cost is one full coding-loop execution; at 10x load the first breakpoint is browser/server startup time, so the harness must serialize execution and aggressively clean temp state.
Negative Tests (Q7): cover wrong-file edits, fixture tests still failing after the scripted run, dev server never reaching readiness, and browser assertions against stale UI.
  - Files: `tests/fixtures/recordings/repo-mode-parity-web-task.json`, `src/tests/integration/helpers/repo-mode-parity.ts`, `src/tests/integration/repo-mode-coding-loop.test.ts`, `tests/fixtures/parity-web-task/TASK.md`
  - Verify: node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/repo-mode-coding-loop.test.ts

- [ ] **T03: Wire repo-mode proof into the parity manifest and report** `est:45m`
  Skills to load before coding: `test`, `observability`, `verify-before-complete`.

Close the slice by wiring the new repo-mode proof into the existing parity inventory layer so S01's manifest-backed uncovered-capability report becomes truthful repo-mode coverage instead of stale prose. Keep the baseline runner deterministic and machine-readable.

Steps:
1. Extend the parity lane metadata/report contract so the repo-mode coding-loop proof is a first-class repo-mode lane with an artifact path and phase-local diagnostics.
2. Update `tests/fixtures/parity-web-task-manifest.json` so the five repo-mode capabilities reflect the new proof coverage and remaining gaps truthfully.
3. Add contract tests that lock the manifest/report wiring and ensure `tests/parity/run.ts --format json` preserves actionable repo-mode diagnostics even when the new lane fails.

Must-haves:
- [ ] The repo-mode proof appears in the parity report instead of living in an ad-hoc one-off test.
- [ ] Manifest coverage changes are derived from the real lane, not hand-wavy prose.
- [ ] The JSON report preserves enough detail to tell whether inspect/edit/test/dev-server/browser failed.
- [ ] Baseline/report behavior stays deterministic with no live-model dependency.

Failure Modes (Q5): bad manifest coverage mappings must fail contract tests before runtime; parity lane failures must still emit the JSON artifact; missing repo-mode artifact paths must fail with an explicit contract error.
Load Profile (Q6): shared resources are sequential parity lanes and the report artifact writer; per operation cost is one additional repo-mode lane; at 10x load the first breakpoint is lane runtime, so report generation must remain bounded and artifact writes constant-size.
Negative Tests (Q7): verify failing repo-mode lane still produces a report, malformed manifest coverage is rejected, and stale capability status cannot claim covered while uncovered lanes remain.
  - Files: `tests/parity/baseline-lanes.ts`, `tests/parity/run.ts`, `tests/fixtures/parity-web-task-manifest.json`, `src/tests/integration/repo-mode-parity-contract.test.ts`, `package.json`
  - Verify: node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/repo-mode-parity-contract.test.ts && node --experimental-strip-types tests/parity/run.ts --format json

## Files Likely Touched

- tests/fixtures/parity-web-task/package.json
- tests/fixtures/parity-web-task/index.html
- tests/fixtures/parity-web-task/src/main.ts
- tests/fixtures/parity-web-task/src/task.ts
- tests/fixtures/parity-web-task/tests/task.spec.ts
- tests/fixtures/parity-web-task/TASK.md
- src/tests/integration/repo-mode-fixture-contract.test.ts
- tests/fixtures/recordings/repo-mode-parity-web-task.json
- src/tests/integration/helpers/repo-mode-parity.ts
- src/tests/integration/repo-mode-coding-loop.test.ts
- tests/parity/baseline-lanes.ts
- tests/parity/run.ts
- tests/fixtures/parity-web-task-manifest.json
- src/tests/integration/repo-mode-parity-contract.test.ts
- package.json

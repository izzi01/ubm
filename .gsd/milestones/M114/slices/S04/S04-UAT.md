# S04: S04 — UAT

**Milestone:** M114
**Written:** 2026-04-24T07:40:19.565Z

# S04 Human UAT: parity diagnostics and product-claim walkthrough

## Preconditions

1. Work from the repository root `/home/cid/projects-personal/umb`.
2. Ensure the tracked parity assets exist:
   - `tests/parity/human-uat.md`
   - `tests/parity/diagnostics.ts`
   - `tests/fixtures/parity-web-task/TASK.md`
   - `tests/fixtures/parity-web-task-manifest.json`
   - `tests/fixtures/recordings/repo-mode-parity-web-task.json`
   - `tests/fixtures/recordings/installed-mode-parity-web-task.json`
3. Use the same Node invocation style the repo already uses for parity commands (`node --experimental-strip-types ...` and `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test ...`).
4. Treat repo-local artifact paths as the only supported evidence surface for this flow.

## Test Case 1 — Validate the diagnostics and UAT contracts stay tied to tracked files

1. Run:
   `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/parity-human-uat-contract.test.ts src/tests/integration/parity-diagnostics-contract.test.ts`
2. Expected outcome:
   - All 6 tests pass.
   - The diagnostics contract proves the renderer can summarize tracked parity reports and preserve local artifact paths.
   - The UAT contract proves the human guide still references both repo mode and installed mode, the tracked fixture files, `npm test`, `npm run dev`, diagnostics commands, and the browser target `#status-message`.

## Test Case 2 — Generate the current parity baseline report

1. Run:
   `node --experimental-strip-types tests/parity/run.ts --format json`
2. Expected outcome:
   - The command writes/refreshes `tests/parity/artifacts/baseline-report.json`.
   - The current baseline may exit non-zero; that is acceptable for this UAT because the purpose is to inspect truthful parity state rather than force a green overall verdict.
   - In the JSON output, confirm:
     - `summary.provesCodingLoop` is `true`
     - `repo-mode-coding-loop` status is `passed`
     - `pack-install` status is `passed`
     - `repoInstalledComparison.divergencePhases` is empty
   - Also note any still-red upstream lanes, currently `smoke-runner`, and any expected skips such as `live-runner` when live tests are not enabled.

## Test Case 3 — Read the operator-facing diagnostics summary

1. Run:
   `node --experimental-strip-types tests/parity/diagnostics.ts --report tests/parity/artifacts/baseline-report.json`
2. Expected outcome:
   - The renderer prints a concise summary with overall verdict and uncovered lanes.
   - For repo mode and installed mode, it prints repo-local `artifactPath` values for:
     - `tests/fixtures/recordings/repo-mode-parity-web-task.json`
     - `tests/fixtures/recordings/installed-mode-parity-web-task.json`
   - The output includes browser evidence for `#status-message`, showing expected and actual values.
   - The output includes repo-vs-installed comparison details and reports no divergence phases.

## Test Case 4 — Prove the product claim in repo mode from tracked evidence

1. Open `tests/fixtures/parity-web-task/TASK.md` and read the requested change.
2. Inspect the repo-mode recorded artifact referenced by the diagnostics output: `tests/fixtures/recordings/repo-mode-parity-web-task.json`.
3. Expected outcome:
   - The artifact shows the full coding loop phases: `inspect`, `edit`, `test`, `dev-server`, and `browser`.
   - The `test` phase shows `npm test` succeeded.
   - The `dev-server` phase shows `npm run dev` reached the READY URL.
   - The `browser` phase shows the explicit assertion target `#status-message` with expected `Build status: Complete` and actual `Build status: Complete`.
4. Product claim proved for repo mode:
   - umb can inspect the task, edit application code, run tests, manage the dev server, verify behavior in the browser, and complete the small web-task fixture.

## Test Case 5 — Prove the product claim in installed mode from tracked evidence

1. Inspect the installed-mode recorded artifact referenced by the diagnostics output: `tests/fixtures/recordings/installed-mode-parity-web-task.json`.
2. Expected outcome:
   - The same full coding loop phases are present: `inspect`, `edit`, `test`, `dev-server`, and `browser`.
   - `npm test` succeeded in the installed-mode sandbox.
   - `npm run dev` reached the READY URL.
   - The browser assertion again verifies `#status-message` equals `Build status: Complete`.
3. Product claim proved for installed mode:
   - the shipped/packaged `umb` path can perform the same coding loop as repo mode on the same deterministic fixture.

## Test Case 6 — Investigate a red parity report without guessing

1. If Test Case 2 exited non-zero, use the diagnostics output from Test Case 3 as the first debugging surface.
2. Ask these concrete questions:
   - Which lane failed or skipped?
   - Which mode was affected (`repo-mode`, `installed-mode`, `partial`, or `live-only`)?
   - Is there a `failedPhase` or only a lane-level exit failure?
   - Is there an `artifactPath` to inspect?
   - What is the highest-signal command or browser assertion snippet?
   - Did `repoInstalledComparison` show any divergence phases?
3. Expected outcome:
   - For coding-loop lanes, you can jump directly to the recorded artifact file and inspect the failing phase.
   - For browser issues, you can compare the expected and actual `#status-message` values.
   - For broader baseline failures, you can distinguish upstream non-slice issues such as `smoke-runner` failure or `live-runner` skip from repo/installed coding-loop regressions.

## Edge Cases

- If `tests/parity/run.ts --format json` is red but `repo-mode-coding-loop` and `pack-install` are both green, treat the result as an upstream baseline issue rather than a regression in the deterministic coding-loop proof.
- If `live-runner` is skipped, confirm whether `GSD_LIVE_TESTS=1` was intentionally absent; this is expected and should not be confused with repo/installed parity failure.
- If a synthetic or temporary report path is used outside the repo, treat that as invalid for diagnostics contract purposes; this surface is intentionally restricted to repo-local paths for redaction and reproducibility.

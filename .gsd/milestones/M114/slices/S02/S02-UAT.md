# S02: S02 — UAT

**Milestone:** M114
**Written:** 2026-04-24T06:28:44.177Z

# S02 UAT — Repo-mode coding-loop proof

## Preconditions

- Run from the repository root: `/home/cid/projects-personal/umb`
- Node dependencies are installed
- No live-model credentials are required
- Port `4173` is available for the fixture dev server

## Test Case 1 — Fixture contract is present and starts from a truthful pre-fix state
1. Run `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/repo-mode-fixture-contract.test.ts`.
2. Confirm the suite passes all seven checks.
3. Expected outcome: the harness verifies `tests/fixtures/parity-web-task/` contains `TASK.md`, `index.html`, `src/main.ts`, `src/task.ts`, and `tests/task.spec.ts`; the package defines `test` and `dev`; the task brief points at tracked app/test files; the initial fixture state is still `Build status: In progress`; and negative-path checks fail fast for missing files/scripts, malformed materialization paths, broken dev scripts, and unexpected dependencies.

## Test Case 2 — Repo-mode parity artifact encodes the full coding loop
1. Run `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/repo-mode-parity-contract.test.ts`.
2. Expected outcome: the suite passes all five checks.
3. Inspect `tests/fixtures/recordings/repo-mode-parity-web-task.json`.
4. Expected outcome: the artifact contains `laneName: repo-mode-coding-loop`, `status: passed`, and ordered `phaseResults` for `inspect`, `edit`, `test`, `dev-server`, and `browser`.
5. Expected browser evidence: the browser phase records `expected: Build status: Complete` and `actual: Build status: Complete`.

## Test Case 3 — Parity report exposes repo-mode proof in machine-readable output
1. Run `node --experimental-strip-types tests/parity/run.ts --format json`.
2. Expected outcome: the command exits 0 and emits JSON.
3. In the JSON output, find lane `repo-mode-coding-loop`.
4. Expected outcome: the lane has `status: passed`, `artifactPath: tests/fixtures/recordings/repo-mode-parity-web-task.json`, `failedPhase: null`, and all five `phaseResults`.
5. Expected summary outcome: `summary.provesCodingLoop` is `true`.

## Test Case 4 — Failure diagnostics stay actionable
1. Temporarily copy `tests/fixtures/recordings/repo-mode-parity-web-task.json` to a throwaway repo-relative path and modify the browser phase so `status` is `failed`, `expected` stays `Build status: Complete`, and `actual` becomes `Build status: In progress`.
2. Run `GSD_REPO_MODE_PARITY_ARTIFACT=<relative-temp-path> node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/repo-mode-parity-contract.test.ts` logic manually, or reuse the contract suite.
3. Expected outcome: the JSON report preserves `failedPhase: browser`, points to the temp artifact path, and includes the browser assertion mismatch (`expected` vs `actual`) instead of collapsing into a generic lane failure.

## Edge Cases

- Missing repo-mode artifact path should fail fast with `Missing lane target for repo-mode-coding-loop: ...`.
- A broken fixture `dev` script must fail before parity execution and include a parse/shell syntax error tied to the materialized fixture path.
- The repo-mode lane may pass while the overall parity report still has failing non-slice lanes (`smoke-runner`, `pack-install`); that is expected at the end of S02 because installed/release parity is deferred to later slices.

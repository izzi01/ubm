# S03: Installed-binary packaged parity

**Goal:** Prove the shipped packaged `umb` binary can complete the same deterministic parity web-task coding loop as repo mode, then expose that installed-mode proof through the shared parity report with phase-local diagnostics and explicit repo-vs-installed comparison points.
**Demo:** After this: the installed packaged `umb` binary can pass the same small web-task parity proof, so packaged behavior is no longer assumed to match the repo build.

## Must-Haves

- **Demo:** The installed packaged `umb` binary can pass the same small web-task parity proof used for repo mode, and the shared parity report shows installed-mode evidence separately from repo-mode evidence.
- ## Must-Haves
- The installed packaged `umb` binary is exercised against `tests/fixtures/parity-web-task/` through the same inspect → edit → test → dev-server → browser flow used for repo mode.
- A tracked installed-mode parity artifact records phase-local results, failedPhase behavior, and artifact paths without relying on ad-hoc stderr scraping.
- The parity manifest and JSON report truthfully distinguish repo-mode and installed-mode coding-loop coverage for the same fixture.
- Contract tests lock the packaged runner, artifact shape, and report wiring so R028 stays release-gateable and R029 remains truthful.
- ## Threat Surface
- **Abuse**: A packaged-parity harness could accidentally prove the wrong binary, the wrong fixture path, or repo-only assumptions instead of shipped behavior.
- **Data exposure**: None beyond local fixture files and command snippets; no secrets or live credentials are part of the deterministic proof.
- **Input trust**: Untrusted inputs are fixture workspace paths, packaged command output, and recorded artifact JSON loaded back into the report.
- ## Requirement Impact
- **Requirements touched**: R028 directly; R029 as a supporting deterministic-fixture/report contract.
- **Re-verify**: Installed packaged coding-loop proof, artifact-path/failedPhase diagnostics, and manifest/report coverage for the five fixture capabilities.
- **Decisions revisited**: D009 and D010 stay in force; reuse existing lanes and require strict parity in both repo/dev and installed modes.
- ## Verification
- `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/pack-install.test.ts`
- `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/installed-mode-parity-contract.test.ts src/tests/integration/repo-mode-parity-contract.test.ts`
- `node --experimental-strip-types tests/live-regression/run.ts`
- `node --experimental-strip-types tests/parity/run.ts --format json`

## Proof Level

- This slice proves: - This slice proves: integration
- Real runtime required: yes
- Human/UAT required: no

## Integration Closure

- Upstream surfaces consumed: `tests/fixtures/parity-web-task/`, `tests/fixtures/recordings/repo-mode-parity-web-task.json`, `src/tests/integration/pack-install.test.ts`, `tests/live-regression/run.ts`, `tests/parity/baseline-lanes.ts`, `tests/parity/run.ts`.
- New wiring introduced in this slice: installed tarball execution against the parity fixture, tracked installed-mode parity artifact loading, and parity-report comparison between repo and installed modes.
- What remains before the milestone is truly usable end-to-end: S04 still needs richer human-facing diagnostics and UAT; S05 still needs the strict integrated release gate plus optional live spot-check.

## Verification

- Runtime signals: installed-mode phase results with command/browser diagnostics and failedPhase data.
- Inspection surfaces: tracked parity artifact JSON, `tests/parity/run.ts --format json`, and installed-mode contract tests.
- Failure visibility: lane name, artifact path, failed phase, command exit codes, readiness/browser mismatches, and repo-vs-installed divergence points.
- Redaction constraints: keep diagnostics limited to fixture-local paths and command snippets; do not depend on secrets or live credentials.

## Tasks

- [x] **T01: Build the installed-binary parity harness on the tracked fixture** `est:1h15m`
  Skills to load before coding: `test`, `verify-before-complete`.

Extend the existing pack/install and installed-binary regression patterns so the packaged `umb` tarball can target the tracked parity web-task fixture in a temp workspace. Keep the proof anchored to shipped behavior: run the packaged binary, not `dist/loader.js`, and preserve the temp install prefix / temp repo path in failures so later artifact/report work has truthful evidence.

## Failure Modes

| Dependency | On error | On timeout | On malformed response |
|------------|----------|-----------|----------------------|
| `npm pack` / tarball install | Preserve stdout/stderr and temp workspace path so the packaging break is actionable | Fail the task with the timed-out install command and workspace path | Reject missing packaged files or wrong binary/config names before parity execution starts |
| installed `umb` entrypoint | Surface invoked args, exit code, and stderr in the task test | Fail with the command that hung and the temp repo path | Reject output that points at `gsd` / `.gsd` assumptions instead of `umb` / `.umb` |

## Load Profile

- **Shared resources**: temp install prefix, temp git repo, one packaged CLI process
- **Per-operation cost**: one tarball build/install plus one packaged CLI invocation against the fixture
- **10x breakpoint**: temp-dir churn and package install time dominate first, so the harness must stay serialized and clean up aggressively

## Negative Tests

- **Malformed inputs**: missing fixture files, missing packaged binary, wrong config-dir assumptions
- **Error paths**: tarball install failure, packaged CLI spawn failure, version-skew/bootstrap failure in temp HOME
- **Boundary conditions**: empty temp repo, fixture materialized under a non-project temp path, repeated install/run in the same process

## Steps

1. Factor reusable helpers around packaged tarball creation/install so the parity fixture can be exercised from an installed `umb` binary in a temp workspace.
2. Add an integration contract test that materializes `tests/fixtures/parity-web-task/`, runs the installed binary in that temp repo, and asserts packaged resources, binary name, and config-dir behavior stay `umb`-correct.
3. Capture deterministic command-level evidence that later installed-mode recording/report tasks can promote into a tracked parity artifact.

## Must-Haves

- [ ] The task runs the packaged installed binary, not `dist/loader.js` directly.
- [ ] The temp workspace uses tracked fixture files under `tests/fixtures/parity-web-task/` as the coding target.
- [ ] Contract failures name the install prefix / temp repo path and the failing packaged command.
- [ ] The harness keeps `umb` / `.umb` branding expectations explicit so a stray `gsd` assumption fails loudly.

## Verification

- `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/pack-install.test.ts`
- `node --experimental-strip-types tests/live-regression/run.ts`

## Observability Impact

- Signals added/changed: packaged command stdout/stderr capture, temp workspace path capture, binary/config-dir assertion failures
- How a future agent inspects this: run the pack-install integration test or `tests/live-regression/run.ts` and inspect the named temp paths/commands
- Failure state exposed: failing install command, missing packaged file, wrong binary/config-dir, or bootstrap/runtime error before parity recording
  - Files: `src/tests/integration/pack-install.test.ts`, `src/tests/integration/helpers/installed-mode-parity.ts`, `tests/live-regression/run.ts`, `package.json`, `pkg/package.json`, `tests/fixtures/parity-web-task/package.json`, `tests/fixtures/parity-web-task/TASK.md`
  - Verify: node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/pack-install.test.ts && node --experimental-strip-types tests/live-regression/run.ts

- [x] **T02: Record and contract-test installed-mode coding-loop proof** `est:1h15m`
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
  - Files: `src/tests/integration/helpers/installed-mode-parity.ts`, `tests/fixtures/recordings/installed-mode-parity-web-task.json`, `src/tests/integration/installed-mode-parity-contract.test.ts`, `tests/fixtures/parity-web-task/package.json`, `tests/fixtures/parity-web-task/src/task.ts`, `tests/fixtures/parity-web-task/tests/task.spec.ts`, `src/tests/integration/repo-mode-parity-contract.test.ts`
  - Verify: node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/installed-mode-parity-contract.test.ts && test -f tests/fixtures/recordings/installed-mode-parity-web-task.json

- [x] **T03: Wire installed parity into the manifest and baseline report** `est:1h`
  Skills to load before coding: `test`, `observability`, `verify-before-complete`.

Finish the slice by making installed packaged parity a first-class lane in the shared M114 report contract. The manifest must truthfully describe which coding-loop capabilities are now covered in installed mode, and the JSON report must let later slices compare repo and installed artifacts directly when packaged behavior diverges.

## Failure Modes

| Dependency | On error | On timeout | On malformed response |
|------------|----------|-----------|----------------------|
| parity manifest/report wiring | Fail contract tests before runtime with the missing lane or bad coverage mapping named explicitly | N/A (pure report wiring) | Reject invalid proof/coverage combinations and missing installed artifact targets |
| installed-mode artifact loading | Preserve artifact path and parse error in the lane result | N/A (recorded artifact) | Reject wrong laneName/fixtureId or missing phase diagnostics while keeping the target path visible |

## Load Profile

- **Shared resources**: sequential parity report generation and one JSON artifact write
- **Per-operation cost**: one more recorded-artifact lane plus constant-size report updates
- **10x breakpoint**: lane runtime remains bounded because the report consumes tracked artifacts instead of rerunning the installed binary

## Negative Tests

- **Malformed inputs**: missing installed artifact target, invalid lane coverage entry, wrong installed lane name in the artifact
- **Error paths**: failing installed artifact still emits `failedPhase` and artifactPath, repo-vs-installed mismatch stays visible in report output
- **Boundary conditions**: report with repo mode passing and installed mode failing, report with both lanes passing, manifest coverage cannot claim installed coverage without the installed lane

## Steps

1. Extend `tests/parity/baseline-lanes.ts` with an installed-mode recorded-artifact lane and any comparison metadata needed to tell repo vs installed proof apart.
2. Update `tests/fixtures/parity-web-task-manifest.json` so installed-mode coding-loop coverage for the five capabilities reflects the new lane truthfully while preserving repo-mode coverage from S02.
3. Add/extend contract tests so `tests/parity/run.ts --format json` locks installed-mode lane status, artifactPath, failedPhase behavior, and repo-vs-installed comparison surfaces.

## Must-Haves

- [ ] Installed packaged parity appears as a first-class lane in the parity report.
- [ ] Manifest coverage for the five coding-loop capabilities includes truthful installed-mode lane coverage.
- [ ] The JSON report preserves artifactPath and failedPhase for installed-mode failures.
- [ ] Repo and installed proofs can be compared without rerunning either lane live.

## Verification

- `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/installed-mode-parity-contract.test.ts src/tests/integration/repo-mode-parity-contract.test.ts`
- `node --experimental-strip-types tests/parity/run.ts --format json`

## Observability Impact

- Signals added/changed: installed-mode lane status, artifactPath, failedPhase, and repo-vs-installed comparison points in parity JSON
- How a future agent inspects this: run `tests/parity/run.ts --format json` and inspect the installed lane rows/artifact paths
- Failure state exposed: whether packaged parity failed in inspect/edit/test/dev-server/browser and where the deterministic evidence file lives
  - Files: `tests/parity/baseline-lanes.ts`, `tests/parity/run.ts`, `tests/fixtures/parity-web-task-manifest.json`, `tests/fixtures/recordings/repo-mode-parity-web-task.json`, `tests/fixtures/recordings/installed-mode-parity-web-task.json`, `src/tests/integration/repo-mode-parity-contract.test.ts`, `src/tests/integration/installed-mode-parity-contract.test.ts`
  - Verify: node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/installed-mode-parity-contract.test.ts src/tests/integration/repo-mode-parity-contract.test.ts && node --experimental-strip-types tests/parity/run.ts --format json

## Files Likely Touched

- src/tests/integration/pack-install.test.ts
- src/tests/integration/helpers/installed-mode-parity.ts
- tests/live-regression/run.ts
- package.json
- pkg/package.json
- tests/fixtures/parity-web-task/package.json
- tests/fixtures/parity-web-task/TASK.md
- tests/fixtures/recordings/installed-mode-parity-web-task.json
- src/tests/integration/installed-mode-parity-contract.test.ts
- tests/fixtures/parity-web-task/src/task.ts
- tests/fixtures/parity-web-task/tests/task.spec.ts
- src/tests/integration/repo-mode-parity-contract.test.ts
- tests/parity/baseline-lanes.ts
- tests/parity/run.ts
- tests/fixtures/parity-web-task-manifest.json
- tests/fixtures/recordings/repo-mode-parity-web-task.json

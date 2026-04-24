---
estimated_steps: 31
estimated_files: 7
skills_used: []
---

# T01: Build the installed-binary parity harness on the tracked fixture

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

## Inputs

- ``package.json``
- ``pkg/package.json``
- ``src/tests/integration/pack-install.test.ts``
- ``tests/live-regression/run.ts``
- ``tests/fixtures/parity-web-task/package.json``
- ``tests/fixtures/parity-web-task/TASK.md``

## Expected Output

- ``src/tests/integration/pack-install.test.ts``
- ``src/tests/integration/helpers/installed-mode-parity.ts``
- ``tests/live-regression/run.ts``

## Verification

node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/pack-install.test.ts && node --experimental-strip-types tests/live-regression/run.ts

## Observability Impact

Installed-mode harness failures must preserve the temp install prefix, temp repo path, invoked packaged command, and `umb`/`.umb` expectation mismatch so later parity-report work has high-signal debugging surfaces.

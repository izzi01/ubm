# S03: S03 — UAT

**Milestone:** M114
**Written:** 2026-04-24T07:23:47.175Z

# S03 UAT — Installed packaged parity on the deterministic web-task fixture

## Preconditions
- Run from the repo root.
- `npm run build` has completed so `dist/loader.js` and packaged assets are present.
- Node 22+ is available.
- No live-provider secrets are required.

## Test Case 1 — Packaged install branding and binary shape are correct
1. Run `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/pack-install.test.ts`.
2. Expected outcome: all four tests pass.
3. Expected outcome: the tarball contains `dist/loader.js`, `pkg/package.json`, bundled `src/resources/extensions/gsd/index.ts`, and `scripts/postinstall.js`.
4. Expected outcome: the installed binary resolves as `umb` (or `umb.cmd` on Windows), package metadata asserts `piConfig.name === "umb"`, and `piConfig.configDir === ".umb"`.
5. Expected outcome: the non-interactive/version-skew assertions mention `umb` behavior rather than stale `gsd` branding.

## Test Case 2 — Installed parity artifact is present and structurally valid
1. Run `test -f tests/fixtures/recordings/installed-mode-parity-web-task.json`.
2. Expected outcome: the command exits 0.
3. Open `tests/fixtures/recordings/installed-mode-parity-web-task.json`.
4. Expected outcome: the artifact uses lane name `pack-install`, has `status: "passed"`, includes `artifactPath`, and lists phase results in this order: `inspect`, `edit`, `test`, `dev-server`, `browser`.
5. Expected outcome: the browser phase stores `assertion`, `expected`, and `actual` with `Build status: Complete` as the expected completed copy.

## Test Case 3 — Repo and installed coding-loop contracts both pass
1. Run `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/installed-mode-parity-contract.test.ts src/tests/integration/repo-mode-parity-contract.test.ts`.
2. Expected outcome: all contract tests pass.
3. Expected outcome: the installed-mode suite proves artifact-path preservation, failedPhase propagation, duplicate/missing-phase rejection, and browser expected/actual evidence.
4. Expected outcome: the repo-mode suite confirms the tracked manifest now marks repo coding-loop coverage as `covered`.

## Test Case 4 — Shared parity report exposes installed-mode proof and repo-vs-installed comparison
1. Run `node --experimental-strip-types tests/parity/run.ts --format json`.
2. Expected outcome: the command exits 0 and prints JSON.
3. Expected outcome: the `pack-install` lane is present with `status: "passed"`, `artifactPath: "tests/fixtures/recordings/installed-mode-parity-web-task.json"`, and `failedPhase: null`.
4. Expected outcome: the `repo-mode-coding-loop` lane is also `passed`.
5. Expected outcome: `repoInstalledComparison.comparableWithoutRerun === true` and `divergencePhases` is an empty array.
6. Expected outcome: each phase comparison (`inspect`, `edit`, `test`, `dev-server`, `browser`) reports matching pass states.

## Test Case 5 — Manifest/report contract remains truthful about capability coverage
1. Run `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/parity-fixture-manifest.test.ts`.
2. Expected outcome: all manifest tests pass.
3. Expected outcome: each of the five coding-loop capabilities still has top-level `proof: "uncovered"` because broader milestone parity work remains open, but both `repo-mode-coding-loop` and `pack-install` lane coverage entries are `covered`.
4. Expected outcome: uncovered capability rows still point at remaining gaps in smoke/live/generalized support lanes rather than falsely claiming milestone-complete parity.

## Edge Case — Synthetic failure still preserves actionable installed-mode diagnostics
1. Copy `tests/fixtures/recordings/installed-mode-parity-web-task.json` to a throwaway repo-relative path.
2. Modify only the `browser` phase in the copy so `status` becomes `failed` and `browser.actual` becomes `Build status: In progress`.
3. Run the installed-mode contract suite with `GSD_INSTALLED_MODE_PARITY_ARTIFACT=<relative-temp-path>`.
4. Expected outcome: the failing-artifact assertions continue to report `failedPhase: "browser"`, preserve the overridden `artifactPath`, and surface the browser `expected` vs `actual` mismatch without rerunning a live model.

## Edge Case — Installed binary regression lane still works after parity wiring
1. Run `node --experimental-strip-types tests/live-regression/run.ts`.
2. Expected outcome: all 10 checks pass.
3. Expected outcome: installed-binary regression coverage remains intact even though parity proof is now represented through the recorded `pack-install` lane in the shared report.

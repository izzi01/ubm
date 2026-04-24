---
id: S03
parent: M114
milestone: M114
provides:
  - A validated installed packaged coding-loop proof lane (`pack-install`) that downstream release gating can call without rerunning a live model.
  - Truthful manifest coverage showing both repo and installed proof for the five core fixture capabilities.
  - A stable repo-vs-installed comparison surface for S04 diagnostics and S05 release gating.
requires:
  - slice: S02
    provides: Deterministic parity web-task fixture, repo-mode recording, and repo-mode coding-loop contract reused for installed-mode comparison and manifest/report truthfulness.
affects:
  - S04
  - S05
key_files:
  - src/tests/integration/helpers/installed-mode-parity.ts
  - tests/fixtures/recordings/installed-mode-parity-web-task.json
  - src/tests/integration/installed-mode-parity-contract.test.ts
  - src/tests/integration/repo-mode-parity-contract.test.ts
  - src/tests/integration/parity-fixture-manifest.test.ts
  - src/tests/integration/pack-install.test.ts
  - tests/parity/baseline-lanes.ts
  - tests/fixtures/parity-web-task-manifest.json
key_decisions:
  - Represent installed packaged parity as the same recorded-artifact, ordered-phase contract used by repo mode so both proofs are comparable without reruns.
  - Expose repo-vs-installed comparison data directly in the parity report via `repoInstalledComparison` instead of relying on manual report inspection.
  - Treat stale `gsd`/`.gsd` packaging assertions as verification debt and repair them to `umb`/`.umb` during slice closure so installed-mode proof is actually about shipped behavior.
patterns_established:
  - Deterministic coding-loop proof for parity should use tracked artifact JSON with ordered phases and explicit browser expected/actual evidence.
  - Shared report consumers should compare repo and installed proof through artifact metadata and phase comparisons, not by rerunning both lanes live.
  - Packaging assertions in integration tests should validate branded package metadata, installed binary names, and config-dir behavior together to catch rebrand drift early.
observability_surfaces:
  - `tests/fixtures/recordings/installed-mode-parity-web-task.json` as the deterministic installed-mode proof artifact.
  - `failedPhase`, `artifactPath`, and ordered `phaseResults` for both repo and installed lanes in `tests/parity/run.ts --format json`.
  - `repoInstalledComparison` with per-phase match/divergence data for downstream diagnostics.
drill_down_paths:
  - .gsd/milestones/M114/slices/S03/tasks/T01-SUMMARY.md
  - .gsd/milestones/M114/slices/S03/tasks/T02-SUMMARY.md
  - .gsd/milestones/M114/slices/S03/tasks/T03-SUMMARY.md
duration: ""
verification_result: passed
completed_at: 2026-04-24T07:23:47.174Z
blocker_discovered: false
---

# S03: S03

**Validated installed packaged parity for the deterministic web-task fixture, wired it into the shared parity report, and repaired stale packaging assertions so repo and installed proof can now be compared phase-by-phase without reruns.**

## What Happened

S03 finished the installed-binary half of the M114 core coding-loop proof. The slice added and stabilized the installed-mode parity recording/helper path, promoted `pack-install` from a stale packaging-oriented lane into a first-class recorded-artifact coding-loop proof, and updated the parity manifest so the five fixture capabilities now truthfully show both repo-mode and installed-mode coverage. During closure I also repaired adjacent contract drift left by earlier attempts: `src/tests/integration/repo-mode-parity-contract.test.ts` was updated to match the manifest’s now-truthful `covered` repo lane state, `src/tests/integration/parity-fixture-manifest.test.ts` was de-corrupted and refreshed to assert the new coverage/report wording, and `src/tests/integration/pack-install.test.ts` was fixed to assert actual `umb` / `.umb` package metadata, installed binary names, installed package paths, and non-interactive help/error branding instead of stale `gsd` / `.gsd` assumptions. The resulting parity surfaces now show both deterministic coding-loop recordings passing with explicit inspect/edit/test/dev-server/browser diagnostics, preserved artifact paths, failedPhase propagation for synthetic failure cases, and a `repoInstalledComparison` block that lets later slices diagnose divergence without rerunning either proof live.

## Verification

Ran the slice-plan verification set and rechecked the observability surfaces. `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/pack-install.test.ts` passed after updating stale branding/package-path expectations. `node --experimental-strip-types tests/live-regression/run.ts` passed with 10/10 checks. `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/installed-mode-parity-contract.test.ts src/tests/integration/repo-mode-parity-contract.test.ts` passed, proving both recorded coding-loop artifacts and their failing-artifact paths. `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/parity-fixture-manifest.test.ts` passed after repairing syntax drift and updating expectations to match current report text. `test -f tests/fixtures/recordings/installed-mode-parity-web-task.json` passed. `node --experimental-strip-types tests/parity/run.ts --format json` completed successfully and reported `repo-mode-coding-loop` and `pack-install` both `passed`, each with deterministic `artifactPath`, `failedPhase: null`, and a `repoInstalledComparison` block with `comparableWithoutRerun: true` and zero divergence phases. Observability/diagnostic closure was confirmed by the contract suites’ synthetic failing-artifact cases, which preserve browser expected/actual values, artifact-path overrides, and failedPhase attribution for both repo and installed modes.

## Requirements Advanced

- R028 — Validated installed packaged coding-loop parity through passing pack-install, installed-mode parity contract, live-regression, and parity-report verification with deterministic artifact-path and failedPhase surfaces.

## Requirements Validated

- R028 — `src/tests/integration/pack-install.test.ts`, `src/tests/integration/installed-mode-parity-contract.test.ts`, `src/tests/integration/repo-mode-parity-contract.test.ts`, `src/tests/integration/parity-fixture-manifest.test.ts`, `tests/live-regression/run.ts`, and `tests/parity/run.ts --format json` all pass, and the report shows both repo and installed coding-loop lanes passed with comparableWithoutRerun true.

## New Requirements Surfaced

None.

## Requirements Invalidated or Re-scoped

None.

## Operational Readiness

None.

## Deviations

None. Earlier task-level wrap-up interruptions left stale expectations and syntax drift, but those were repaired during slice closure and full slice verification is now green for the planned commands.

## Known Limitations

The integrated parity report still returns an overall `failing` verdict because non-S03 milestone lanes remain open: `smoke-runner` is still failing and `live-runner` is still opt-in/skipped. This slice intentionally proves installed packaged coding-loop parity, not milestone-wide release readiness.

## Follow-ups

S04 should build on the new `repoInstalledComparison`, artifactPath, and failedPhase surfaces to produce more human-readable diagnostics and operator-facing debugging output. S05 should consume the now-validated installed `pack-install` recorded lane directly in the strict release gate rather than reintroducing a second installed proof path.

## Files Created/Modified

- `src/tests/integration/helpers/installed-mode-parity.ts` — Defines installed-mode artifact loading/validation, lane naming, and coverage derivation for the shared parity report.
- `tests/fixtures/recordings/installed-mode-parity-web-task.json` — Tracks deterministic installed packaged coding-loop proof across inspect/edit/test/dev-server/browser phases.
- `tests/parity/baseline-lanes.ts` — Wires `pack-install` as a recorded-artifact parity lane and emits repoInstalledComparison metadata.
- `tests/fixtures/parity-web-task-manifest.json` — Truthfully marks repo-mode and installed-mode coding-loop lane coverage as covered for all five fixture capabilities while preserving broader milestone gaps.
- `src/tests/integration/installed-mode-parity-contract.test.ts` — Locks installed artifact shape, failure-path behavior, browser evidence, and manifest reconciliation.
- `src/tests/integration/repo-mode-parity-contract.test.ts` — Updates repo-mode contract expectations to match the manifest’s covered lane state.
- `src/tests/integration/parity-fixture-manifest.test.ts` — Repairs syntax drift and updates manifest/report assertions to the current installed+repo coverage contract.
- `src/tests/integration/pack-install.test.ts` — Repairs stale branding/package-path assertions so pack/install verification targets shipped `umb` behavior.

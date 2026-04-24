---
id: S04
parent: M114
milestone: M114
provides:
  - Actionable parity diagnostics that identify mode, failing lane, phase, artifact path, and high-signal evidence.
  - A tracked human-readable UAT script for repo and installed parity fixture proof.
  - Stable report semantics that S05 can consume directly for the strict release gate.
requires:
  - slice: S03
    provides: Recorded installed-mode parity artifact, repo-vs-installed comparison data, and packaged failure surfaces that the diagnostics renderer and UAT flow consume.
affects:
  - S05
key_files:
  - tests/parity/diagnostics.ts
  - tests/parity/human-uat.md
  - src/tests/integration/parity-diagnostics-contract.test.ts
  - src/tests/integration/parity-human-uat-contract.test.ts
  - .gsd/PROJECT.md
key_decisions:
  - Built parity diagnostics as a renderer over the existing baseline report contract instead of creating a second harness.
  - Locked the human-readable UAT guide with contract tests that assert tracked files, exact parity commands, both execution modes, and the fixture browser target `#status-message`.
  - Kept diagnostics inputs and artifact references repo-local to preserve redaction and reproducibility boundaries.
patterns_established:
  - Use the canonical parity JSON report as the single source of truth, then layer operator-facing rendering and UAT guidance on top.
  - Treat recorded repo-mode and installed-mode fixture artifacts as the stable proof surfaces for the coding loop, and compare them via `repoInstalledComparison` instead of re-deriving semantics from raw output.
  - Use contract tests to prevent human-facing release/UAT documentation from drifting away from tracked files and executable commands.
observability_surfaces:
  - `tests/parity/diagnostics.ts --report tests/parity/artifacts/baseline-report.json` for mode-aware failure summaries.
  - `tests/parity/artifacts/baseline-report.json` as the canonical parity machine-readable report.
  - Repo and installed recorded fixture artifacts with per-phase command/browser evidence.
  - `repoInstalledComparison` within the baseline report to surface divergence or parity match without reruns.
drill_down_paths:
  - .gsd/milestones/M114/slices/S04/tasks/T01-SUMMARY.md
  - .gsd/milestones/M114/slices/S04/tasks/T02-SUMMARY.md
duration: ""
verification_result: passed
completed_at: 2026-04-24T07:40:19.565Z
blocker_discovered: false
---

# S04: S04

**Added operator-facing parity diagnostics and a tracked human-readable parity UAT path, then validated both contract surfaces while preserving truthful evidence that the broader parity baseline still has upstream red lanes.**

## What Happened

This slice turned the deterministic parity report produced in earlier slices into two operator-facing surfaces that downstream release work can consume directly. T01 added `tests/parity/diagnostics.ts` as a renderer over the canonical baseline report instead of introducing a second harness, so operators now get a mode-aware summary that names the failing or skipped lane, parity mode, failed phase when present, repo-local artifact path, high-signal command/browser evidence, and repo-vs-installed comparison output from the same JSON contract already used elsewhere. T02 added `tests/parity/human-uat.md` as a tracked product-level walkthrough for the parity-web-task fixture, covering repo mode and installed mode, expected outcomes, and a concrete failure-inspection path that starts from the baseline report and diagnostics renderer. Contract tests were added for both surfaces so S05 can rely on exact tracked files and commands rather than prose review. During slice verification, both contract suites passed cleanly and the diagnostics CLI rendered the tracked report as intended. The full parity report command remained truthfully red because `smoke-runner` still fails and `live-runner` is skipped when `GSD_LIVE_TESTS=1` is not enabled; those outcomes predate this slice’s operator-facing work and were preserved as explicit evidence rather than hidden. Repo-mode and installed-mode coding-loop lanes both remain passing, and `repoInstalledComparison` reports no divergence phases.

## Verification

Passed: `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/parity-human-uat-contract.test.ts src/tests/integration/parity-diagnostics-contract.test.ts` (6 tests passed). Passed: `node --experimental-strip-types tests/parity/diagnostics.ts --report tests/parity/artifacts/baseline-report.json` rendered actionable diagnostics from the tracked report, including lane status, mode, repo-local artifact paths, browser assertion evidence, and repo-vs-installed comparison output. Failing but preserved as truthful slice evidence: `node --experimental-strip-types tests/parity/run.ts --format json` exited 1 because the baseline report still contains `smoke-runner` as failed and `live-runner` as skipped without `GSD_LIVE_TESTS=1`; the same report also shows `provesCodingLoop: true`, `repo-mode-coding-loop` passed, `pack-install` passed, and `repoInstalledComparison.divergencePhases` empty.

## Requirements Advanced

- R030 — Added and contract-tested the tracked human-readable UAT script for repo and installed parity proof on the deterministic fixture.
- R031 — Added and contract-tested a diagnostics renderer that promotes lane, mode, phase, artifact path, command/browser evidence, and repo-vs-installed comparison details from the canonical parity report.

## Requirements Validated

- R030 — `tests/parity/human-uat.md` plus passing `src/tests/integration/parity-human-uat-contract.test.ts` prove the project now has a tracked human-readable parity fixture UAT path for both repo and installed modes.
- R031 — `tests/parity/diagnostics.ts` plus passing `src/tests/integration/parity-diagnostics-contract.test.ts` prove parity failures can be rendered into actionable mode-aware diagnostics with artifact-path and command/browser evidence.

## New Requirements Surfaced

None.

## Requirements Invalidated or Re-scoped

None.

## Operational Readiness

None.

## Deviations

None. The slice implemented the planned operator-facing diagnostics and human-readable UAT surfaces on top of the existing parity report contract without introducing a second harness.

## Known Limitations

The broader parity baseline is still not fully green. `node --experimental-strip-types tests/parity/run.ts --format json` currently exits 1 because `smoke-runner` fails and `live-runner` is skipped when live tests are not enabled. This slice makes those outcomes debuggable but does not remediate them.

## Follow-ups

S05 should assemble the strict release-style gate around the canonical baseline report, diagnostics renderer, and human-readable UAT path, while deciding how `smoke-runner` and optional `live-runner` status should influence release acceptance. If full milestone green is required before release, the upstream `smoke-runner` failure must be retired separately from these operator-facing surfaces.

## Files Created/Modified

- `tests/parity/diagnostics.ts` — Added operator-facing rendering of parity baseline report data, including mode-aware summaries, artifact paths, command/browser evidence, and repo-vs-installed comparison output.
- `src/tests/integration/parity-diagnostics-contract.test.ts` — Added contract coverage for passing, failing, and missing-report diagnostics scenarios.
- `tests/parity/human-uat.md` — Added the tracked human-readable parity fixture walkthrough for repo mode, installed mode, and failure inspection.
- `src/tests/integration/parity-human-uat-contract.test.ts` — Added contract coverage that prevents the UAT guide from drifting away from tracked files, commands, and browser assertions.
- `.gsd/PROJECT.md` — Refreshed project state to record S04 completion and the remaining S05 scope.

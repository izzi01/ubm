---
id: S05
parent: M114
milestone: M114
provides:
  - One strict pre-release command (`npm run test:parity:release-gate`) for deterministic parity proof.
  - One explicit include-live variant (`npm run test:parity:release-gate:live`) that reports live participation without weakening deterministic release confidence.
  - A stable release-gate contract that milestone validation and future release work can call directly.
requires:
  - slice: S03
    provides: Packaged installed-mode parity recording, installed-mode lane naming, and repo-vs-installed comparison inputs consumed by the release gate.
  - slice: S04
    provides: Canonical diagnostics renderer, human-readable parity UAT path, and actionable failure-surface contract reused by the final release gate.
affects:
  []
key_files:
  - tests/parity/release-gate.ts
  - tests/parity/baseline-lanes.ts
  - tests/live/run.ts
  - tests/parity/diagnostics.ts
  - tests/parity/human-uat.md
  - src/tests/integration/parity-release-gate-contract.test.ts
  - src/tests/integration/parity-live-spot-check-contract.test.ts
  - src/tests/integration/parity-human-uat-contract.test.ts
  - package.json
  - .gsd/PROJECT.md
key_decisions:
  - Built the release gate on top of the canonical baseline report instead of introducing a second parity harness.
  - Defined strict release success by the deterministic `repo-mode-coding-loop` and `pack-install` lanes only.
  - Reported optional live participation as explicit redacted metadata instead of making it a deterministic release blocker.
  - Derived live skip semantics from the current release-gate invocation and environment rather than stale baseline artifact text.
  - Kept diagnostics and UAT surfaces as the canonical human/operator inspection path.
patterns_established:
  - Release-facing gates should consume canonical machine-readable artifacts rather than reimplement proof collection.
  - Optional live/model checks should publish explicit pass/fail/skip metadata with redacted configuration state while remaining non-blocking for deterministic release proof.
  - Parity failure reporting should preserve mode, failed phase, artifact path, and repo-vs-installed comparison in the top-level release verdict.
observability_surfaces:
  - `tests/parity/release-gate.ts` text and JSON report surfaces with required-lane verdicts, failed phases, artifact paths, diagnostics command, and optional-live metadata.
  - `tests/parity/diagnostics.ts --report tests/parity/artifacts/baseline-report.json` operator-facing summary with actionable lane evidence.
  - `repoInstalledComparison` surfaced through both baseline and release-gate reports for no-rerun repo-vs-installed inspection.
drill_down_paths:
  - .gsd/milestones/M114/slices/S05/tasks/T01-SUMMARY.md
  - .gsd/milestones/M114/slices/S05/tasks/T02-SUMMARY.md
duration: ""
verification_result: passed
completed_at: 2026-04-24T08:06:15.424Z
blocker_discovered: false
---

# S05: S05

**Assembled the final release-facing parity gate so one strict command now proves the required repo/dev and installed coding-loop lanes, while optional live spot-checks remain explicit, redacted, and non-blocking.**

## What Happened

S05 completed the milestone assembly step rather than inventing new proof machinery. The slice added `tests/parity/release-gate.ts` as the release-facing contract over the canonical `tests/parity/artifacts/baseline-report.json`, so operators and downstream milestone validation can either consume the existing artifact or rerun the baseline and still get one stable verdict surface. The release gate requires only the deterministic `repo-mode-coding-loop` and `pack-install` lanes, publishes a stable report schema and text output, and carries forward the diagnostic surfaces established in S04: failed required lanes, failed phases, artifact paths, the diagnostics command, and repo-vs-installed comparison data. The slice also integrated the existing live harness as an opt-in spot-check instead of letting it influence deterministic release proof. `tests/live/run.ts`, `tests/parity/baseline-lanes.ts`, and `tests/parity/release-gate.ts` now distinguish three live states cleanly: not requested, requested but unconfigured, and executed. The release report exposes that state via `optionalLive.includeLiveRequested`, `optionalLive.enabled`, `optionalLive.configured`, `optionalLive.status`, and `optionalLive.skipReason`, while preserving the redaction boundary by never echoing provider secrets. Human/operator workflow was locked by package scripts and tracked guidance: `npm run test:parity:release-gate` is now the default deterministic pre-release command, `npm run test:parity:release-gate:live` is the explicit include-live variant, and `tests/parity/human-uat.md` now explains how to interpret release output, live skips, and the diagnostics path. During closeout verification, the integrated release-gate contract tests passed, the default release gate returned a green verdict tied to the required deterministic lanes, the include-live JSON variant returned a clean skip because no provider key was configured in this environment, and the diagnostics renderer still surfaced actionable lane evidence from the canonical baseline report. One important nuance remains explicit for downstream readers: the baseline report is still truthfully red overall because `smoke-runner` is failing and `live-runner` is skipped in non-live environments, but the release gate intentionally does not treat those non-required lanes as deterministic release blockers. This slice therefore establishes the final M114 pattern: baseline report remains the canonical truth artifact, diagnostics and UAT remain the operator-facing inspection surfaces, and the release gate provides the strict pre-release verdict over the agreed repo/dev and installed coding-loop proof.

## Verification

Passed the slice-plan contract-test command: `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/parity-live-spot-check-contract.test.ts src/tests/integration/parity-human-uat-contract.test.ts src/tests/integration/parity-release-gate-contract.test.ts` (9 tests passed). Passed the release-gate include-live verification command: `node --experimental-strip-types tests/parity/release-gate.ts --format json --include-live`, which returned `verdict: passed`, `requiredLaneNames: ["repo-mode-coding-loop","pack-install"]`, `requiredLanesPassed: true`, and `optionalLive.status: skipped` with `includeLiveRequested: true`, `enabled: true`, `configured: false`, `skipReason: no-provider-configured` in this environment. Confirmed the default operator-facing command `node --experimental-strip-types tests/parity/release-gate.ts --format text` prints the stable release contract with `optionalLiveSkipReason: not-enabled`, artifact paths for repo and installed recordings, diagnostics command, and repoInstalledComparison showing `comparableWithoutRerun: yes` and `divergencePhases: none`. Confirmed observability/diagnostic surfaces remain functional by running `node --experimental-strip-types tests/parity/diagnostics.ts --report tests/parity/artifacts/baseline-report.json`, which rendered actionable lane summaries, mode labels, artifact paths, browser evidence, and repo-vs-installed comparison details from the canonical baseline report.

## Requirements Advanced

- R032 — Integrated the live spot-check into the release workflow as an opt-in, non-blocking, redacted status surface with explicit skip semantics and package-script entrypoints.

## Requirements Validated

- R032 — Release-gate contract tests passed, default release gate reported `optionalLiveSkipReason: not-enabled`, and the `--include-live` run reported `optionalLive.status: skipped`, `configured: false`, `skipReason: no-provider-configured` without affecting the required deterministic release verdict.

## New Requirements Surfaced

None.

## Requirements Invalidated or Re-scoped

None.

## Operational Readiness

None.

## Deviations

None at slice level. Task-level supporting fixes were intentionally limited to keeping the release gate aligned with existing artifact paths and live-skip semantics.

## Known Limitations

The canonical baseline report remains truthfully red overall because `smoke-runner` still fails in the current repo state and the live lane skips unless explicitly enabled/configured. The S05 release gate intentionally treats those as visible but non-required for the deterministic release verdict.

## Follow-ups

Milestone validation should explicitly confirm that the release gate contract is the final operator-facing proof surface and decide whether the still-red `smoke-runner` baseline lane should remain informational or be addressed in a future milestone. If a live-provider environment is available later, run the include-live variant again to produce a passing live spot-check record.

## Files Created/Modified

- `tests/parity/release-gate.ts` — Added the final release-gate report builder, CLI contract, required-lane verdict logic, and optional-live metadata surfaces.
- `tests/parity/baseline-lanes.ts` — Aligned baseline live-lane semantics so the canonical artifact distinguishes enabled-but-unconfigured live skips.
- `tests/live/run.ts` — Exposed importable live spot-check summary helpers with explicit skip-reason/configuration state.
- `tests/parity/diagnostics.ts` — Fixed report-path handling so diagnostics can load absolute or repo-relative artifact paths safely.
- `tests/parity/human-uat.md` — Updated the tracked operator workflow to cover default release, include-live release, live skip semantics, and diagnostics interpretation.
- `src/tests/integration/parity-release-gate-contract.test.ts` — Locked release-gate report, consume-path, rerun-path, and required-lane semantics with contract tests.
- `src/tests/integration/parity-live-spot-check-contract.test.ts` — Added contract coverage for optional live skip semantics and include-live behavior.
- `src/tests/integration/parity-human-uat-contract.test.ts` — Kept the human UAT guide anchored to tracked files, modes, and diagnostics workflow.
- `package.json` — Added operator-facing release-gate scripts for deterministic and include-live runs.
- `.gsd/PROJECT.md` — Refreshed project state to reflect that S05 assembled the release gate and live spot-check workflow.

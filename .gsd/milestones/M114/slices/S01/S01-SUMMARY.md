---
id: S01
parent: M114
milestone: M114
provides:
  - A mechanically runnable baseline parity command/report for M114.
  - A truthful inventory of what current repo checks do and do not prove.
  - A tracked fixture acceptance manifest for the downstream repo-mode parity proof.
  - Closed-foundation reconciliation for M113 cleanup drift so downstream slices start from an honest contract.
requires:
  []
affects:
  - S02
  - S03
  - S04
  - S05
key_files:
  - tests/parity/baseline-lanes.ts
  - tests/parity/run.ts
  - tests/fixtures/parity-web-task-manifest.json
  - src/tests/integration/parity-baseline-contract.test.ts
  - src/tests/integration/parity-m113-reconciliation.test.ts
  - src/tests/integration/parity-fixture-manifest.test.ts
  - tests/parity/artifacts/baseline-report.json
  - .gsd/PROJECT.md
key_decisions:
  - Reuse existing smoke/fixture/live/regression/integration lanes through a fixed allowlisted parity matrix instead of creating a separate harness family.
  - Treat M113 cleanup drift as reconciled foundation metadata in the baseline report rather than an open M114 parity lane.
  - Make the fixture manifest the tracked source of truth for uncovered coding-loop capability reporting.
  - Keep the baseline runner usable even on a failing parity verdict by emitting the report and relying on `summary.verdict` for truth.
patterns_established:
  - Fixed allowlisted lane matrices under `tests/parity/` can inventory proof coverage without opening arbitrary shell passthrough risk.
  - Manifest-backed uncovered-capability reporting is the preferred way to describe milestone proof gaps for downstream parity slices.
  - Baseline commands that exist to inventory reality should emit structured artifacts even when the inventory contains failures.
observability_surfaces:
  - `tests/parity/artifacts/baseline-report.json` with lane status, proof class, parity scope, exit code, skip reason, duration, uncovered capabilities, and reconciled foundations.
  - JSON stdout from `tests/parity/run.ts` and `npm run test:parity:baseline` as a stable machine-readable inspection surface.
drill_down_paths:
  - .gsd/milestones/M114/slices/S01/tasks/T01-SUMMARY.md
  - .gsd/milestones/M114/slices/S01/tasks/T02-SUMMARY.md
  - .gsd/milestones/M114/slices/S01/tasks/T03-SUMMARY.md
duration: ""
verification_result: passed
completed_at: 2026-04-24T05:54:59.509Z
blocker_discovered: false
---

# S01: S01

**Established the M114 baseline parity contract with a fixed lane matrix, machine-readable report, M113 reconciliation metadata, and a tracked fixture acceptance manifest that truthfully names the still-unproven coding-loop capabilities.**

## What Happened

This slice turned the existing smoke, integration, pack-install, live, and live-regression checks into one explicit parity baseline instead of leaving parity claims spread across ad-hoc commands. The work introduced `tests/parity/baseline-lanes.ts` as the allowlisted source of truth for baseline lanes, proof classes, skip semantics, report schema, M113 reconciliation metadata, and fixture-manifest loading. `tests/parity/run.ts` now emits a machine-readable baseline report artifact even when the verdict is failing, which matters because S01's job is to inventory reality rather than force a green result. The slice also published `tests/fixtures/parity-web-task-manifest.json` as the tracked acceptance contract for the downstream small web-task proof, with five concrete capabilities: inspect repository context, edit application code, run targeted tests, manage dev-server lifecycle, and verify browser behavior. Those capabilities are surfaced in the report as explicitly uncovered so S02 starts from a truthful contract instead of milestone prose.

The stale M113 bookkeeping drift called out in the roadmap was reconciled as closed-foundation metadata rather than being left to confuse M114 parity reporting. The baseline report now includes `reconciledFoundations` for R023 and R026 and keeps them out of the current milestone's open parity gaps. Regression coverage was tightened around all of this with integration tests for the lane allowlist and report shape, the M113 reconciliation contract, and the fixture manifest plus uncovered-capability reporting. During closing verification, the baseline report consistently showed the honest current state: 4 lanes passing (`fixtures-runner`, `live-regression-runner`, `e2e-smoke`, `e2e-headless`), 1 lane skipped (`live-runner` without live opt-in), and 2 still failing (`smoke-runner`, `pack-install`). That is the intended output of S01: one truthful parity inventory that downstream slices can now improve against.

## Verification

Fresh slice-level verification was run after the final edits. `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/parity-baseline-contract.test.ts src/tests/integration/parity-m113-reconciliation.test.ts src/tests/integration/parity-fixture-manifest.test.ts` passed 11/11 tests. `node --experimental-strip-types tests/parity/run.ts --format json` completed successfully and emitted the baseline report with `summary.verdict: "failing"`, `passed: 4`, `failed: 2`, `skipped: 1`, and all five fixture capabilities listed under `uncoveredCapabilityNames`. `npm run test:parity:baseline` also completed successfully and produced the same JSON report. Operationally, the new diagnostic surface is the report artifact at `tests/parity/artifacts/baseline-report.json`; it records lane name, proof class, parity scope, status, skip reason, exit code, duration, uncovered capabilities, and reconciled M113 foundations. The actionable current failures are `smoke-runner exited with code 1` and `pack-install exited with code 1`; the skip surface is `live lane skipped because GSD_LIVE_TESTS is not enabled`. Recovery path for future slices is explicit: fix the failing baseline lanes or add new repo/install parity coverage, then re-run the same baseline command to watch uncovered capabilities shrink. Monitoring gap: this slice inventories proof truthfully, but it does not yet add richer per-lane stderr/stdout capture beyond status/exit/skip metadata.

## Requirements Advanced

- R027 — established the manifest-backed repo/dev coding-loop contract and baseline report that explicitly marks the capability as still uncovered until S02 proves it.

## Requirements Validated

None.

## New Requirements Surfaced

None.

## Requirements Invalidated or Re-scoped

None.

## Operational Readiness

None.

## Deviations

Adjusted the runner contract during closing so `tests/parity/run.ts` always emits the JSON report and lets callers inspect `summary.verdict` instead of treating a failing baseline verdict as process failure. This preserved the slice intent: truthful baseline inventory rather than forced greenness.

## Known Limitations

The baseline report currently records lane-level status, exit code, duration, scope, and uncovered capabilities, but it does not yet persist rich stdout/stderr payloads for failed lanes. The baseline still reports real open gaps: `smoke-runner` and `pack-install` fail, the live lane is skipped by default, and none of the five core coding-loop fixture capabilities are yet proven.

## Follow-ups

S02 should build the repo/dev-mode fixture proof and update the manifest-backed coverage so at least the five uncovered coding-loop capabilities begin moving from `uncovered` toward real proof. A later diagnostics slice can extend the report artifact with richer failure evidence if needed.

## Files Created/Modified

- `tests/parity/baseline-lanes.ts` — Added the fixed allowlisted lane matrix, report schema, manifest validation, uncovered-capability derivation, and M113 reconciliation metadata.
- `tests/parity/run.ts` — Added the baseline runner entrypoint and ensured it always emits the machine-readable JSON report.
- `tests/fixtures/parity-web-task-manifest.json` — Published the tracked small web-task acceptance manifest with five concrete coding-loop capabilities and lane-coverage mappings.
- `src/tests/integration/parity-baseline-contract.test.ts` — Locked the lane allowlist, report shape, skip/failure classification, and artifact behavior in regression tests.
- `src/tests/integration/parity-m113-reconciliation.test.ts` — Guarded the M113 cleanup reconciliation contract against future bookkeeping drift.
- `src/tests/integration/parity-fixture-manifest.test.ts` — Validated manifest shape and ensured uncovered coding-loop capabilities are surfaced truthfully.
- `.gsd/PROJECT.md` — Refreshed project state to reflect completed M114/S01 baseline parity work.

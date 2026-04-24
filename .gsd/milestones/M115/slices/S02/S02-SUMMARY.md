---
id: S02
parent: M115
milestone: M115
provides:
  - A deterministic web-mode fixture and manifest for downstream proof slices.
  - A locking contract around the canonical baseline-report web-mode parity row.
  - Truthful partial-state semantics and actionable gap metadata that S05 can consume without rediscovering web-mode status.
requires:
  - slice: S01
    provides: Secondary-surface inventory, parity lane manifest, and canonical secondaryParity baseline-report wiring consumed by the new web-mode contract test.
affects:
  - S05
key_files:
  - tests/fixtures/web-mode-parity-manifest.json
  - src/tests/integration/web-mode-fixture-contract.test.ts
  - src/tests/integration/web-mode-parity-contract.test.ts
  - src/tests/integration/web-mode-diagnostics-contract.test.ts
  - tests/parity/baseline-lanes.ts
  - tests/parity/run.ts
  - tests/parity/diagnostics.ts
  - tests/fixtures/secondary-parity-manifest.json
  - .gsd/PROJECT.md
key_decisions:
  - Used the existing canonical baseline-report secondaryParity payload as the web-mode parity source of truth instead of inventing a second report format.
  - Locked web-mode proof at the contract level with an integration test that verifies present fixtures, planned artifact path, missing required lane, and actionable coverage gaps.
  - Kept web-mode status truthfully partial until a dedicated release-readable `secondary-parity-report` lane exists.
patterns_established:
  - Use tracked manifests plus tracked fixtures as the source of truth for parity semantics.
  - Prefer contract tests over duplicate artifacts when parity/report plumbing already exists in the repo.
  - Keep secondary-surface parity reporting centralized in `tests/parity/artifacts/baseline-report.json#secondaryParity.*` so diagnostics and release gates consume one canonical structure.
observability_surfaces:
  - `tests/parity/artifacts/baseline-report.json#secondaryParity.surfaces.web-mode` as the machine-readable web-mode parity row.
  - `tests/parity/diagnostics.ts` rendered output preserving artifact paths and browser expected/actual evidence.
  - `src/tests/integration/web-mode-diagnostics-contract.test.ts` and `src/tests/integration/web-mode-parity-contract.test.ts` as locking contracts for operator-facing parity diagnostics.
drill_down_paths:
  - .gsd/milestones/M115/slices/S02/tasks/T01-SUMMARY.md
  - .gsd/milestones/M115/slices/S02/tasks/T02-SUMMARY.md
  - .gsd/milestones/M115/slices/S02/tasks/T03-SUMMARY.md
duration: ""
verification_result: passed
completed_at: 2026-04-24T10:19:34.453Z
blocker_discovered: false
---

# S02: Web-mode parity proof

**S02 locked a deterministic web-mode parity fixture plus baseline-report contract so web-mode coverage is now explicitly verified and truthfully reported as partial until a dedicated release-readable secondary-parity lane is added.**

## What Happened

This slice assembled the web-mode secondary-surface proof around the repo’s existing parity architecture rather than inventing a separate reporting path. T01 added a tracked deterministic web-mode fixture and manifest covering startup project selection, project switching, and browser-visible observables. During slice closeout, the repo was verified to already contain the canonical secondary-parity plumbing in `tests/parity/baseline-lanes.ts`, `tests/parity/run.ts`, `tests/parity/diagnostics.ts`, and `tests/fixtures/secondary-parity-manifest.json`; instead of duplicating that machinery, S02 completed the missing lock by adding `src/tests/integration/web-mode-parity-contract.test.ts`. That contract proves the baseline parity runner emits a truthful `secondaryParity.surfaces.web-mode` row with the expected present fixtures, planned release-readable artifact path, explicit missing required lane (`secondary-parity-report`), and actionable gap metadata. T03’s diagnostics contract was re-verified and remains green, so browser-facing expected/actual evidence, artifact paths, and actionable summaries continue to render correctly. The result is a deterministic web-mode proof surface that downstream release reporting can consume from the canonical baseline report, while still being honest that web mode is not yet fully covered: the surface remains `partial` until a dedicated release-readable web-mode parity lane/artifact exists.

## Verification

Verified the slice by running all slice-plan checks against the assembled repository state: (1) `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/web-mode-fixture-contract.test.ts` passed (5/5) confirming the deterministic fixture/manifest contract; (2) `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/web-mode-parity-contract.test.ts` passed (2/2) confirming the baseline parity runner emits the truthful web-mode secondary-parity row and preserves actionable uncovered-gap metadata; (3) `node --experimental-strip-types tests/parity/run.ts --format json` succeeded and wrote the canonical baseline report, whose `secondaryParity.surfaces.web-mode` row reports `releaseReadableStatus: partial`, `missingRequiredLaneNames: ["secondary-parity-report"]`, present fixtures `tests/parity/artifacts/secondary-surface-inventory.json` and `src/tests/integration/web-mode-cli.test.ts`, planned fixture path `tests/parity/artifacts/secondary-parity-report.json#web-mode`, and gap ids `web-parity-artifact-missing` / `web-installed-mode-proof-missing`; and (4) `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/web-mode-diagnostics-contract.test.ts` passed (5/5), confirming browser expected/actual evidence, artifact paths, and actionable rendered diagnostics still work. Observability/diagnostic surfaces were explicitly checked by rendering `tests/parity/diagnostics.ts` against the generated baseline report; the output remains truthful and actionable.

## Requirements Advanced

None.

## Requirements Validated

None.

## New Requirements Surfaced

None.

## Requirements Invalidated or Re-scoped

None.

## Operational Readiness

None.

## Deviations

T02’s plan originally described a separate `web-mode-parity.json` artifact/report path, but assembled-repo verification showed the project had already standardized on the canonical `secondaryParity` section inside `tests/parity/artifacts/baseline-report.json`. Instead of creating a parallel artifact path that would fragment truth, the slice closed by adding a locking integration contract for the canonical baseline-report row.

## Known Limitations

Web-mode parity is still intentionally partial. The baseline report now locks and exposes that state, but the required release-readable `secondary-parity-report` lane for web mode is still missing, and the matrix still records the open question of whether web mode ultimately needs separate repo/install recordings or an explicit scoped exception.

## Follow-ups

S05 should consume the locked `secondaryParity.surfaces.web-mode` row when assembling the integrated secondary-surface release gate. A future follow-up can add the dedicated `secondary-parity-report` lane/artifact if the milestone decides web mode needs a standalone release-readable proof surface beyond the canonical baseline report.

## Files Created/Modified

- `src/tests/integration/web-mode-parity-contract.test.ts` — Added the missing integration contract that locks the truthful web-mode row in the canonical baseline parity report.
- `.gsd/PROJECT.md` — Refreshed project state to reflect completed M115/S02 web-mode parity proof status and remaining milestone work.

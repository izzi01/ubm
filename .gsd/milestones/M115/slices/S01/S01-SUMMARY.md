---
id: S01
parent: M115
milestone: M115
provides:
  - A machine-readable secondary-surface parity matrix for web mode, MCP, workflow/BMAD, and worktree/session/recovery.
  - Deterministic fixture/lane contracts that downstream slices can implement against instead of redefining parity scope.
  - A curated rebrand-drift audit that makes remaining stale `gsd` / `gsd-pi` surfaces explicit.
requires:
  - slice: M114/S05
    provides: Canonical baseline report, diagnostics, and release-gate patterns reused for secondary-surface reporting.
  - slice: M114/S02
    provides: Parity fixture/report architecture pattern and deterministic recorded-lane conventions used as the model for secondary-surface contracts.
  - slice: M113/S01-S04
    provides: Branchless worktree/session architecture and validated cleanup foundation consumed by the worktree/session parity scope.
affects:
  - S02
  - S03
  - S04
  - S05
key_files:
  - tests/parity/secondary-surface-inventory.ts
  - tests/parity/artifacts/secondary-surface-inventory.json
  - tests/parity/secondary-lanes.ts
  - tests/fixtures/secondary-parity-manifest.json
  - tests/parity/baseline-lanes.ts
  - tests/parity/artifacts/baseline-report.json
  - src/tests/integration/secondary-surface-inventory-contract.test.ts
  - src/tests/integration/secondary-parity-manifest.test.ts
  - src/tests/integration/secondary-parity-report-contract.test.ts
  - src/tests/integration/parity-baseline-contract.test.ts
key_decisions:
  - Represent secondary-surface parity as TypeScript source-of-truth modules plus checked-in JSON artifacts and contract tests.
  - Keep all four scoped secondary surfaces marked `partial` until dedicated release-readable proof lanes/artifacts exist.
  - Publish secondary-surface report data through the canonical baseline report instead of introducing a parallel report file.
patterns_established:
  - Truthfulness-first parity reporting: scattered evidence does not equal closure; release-readable proof must be explicit.
  - Source module + rendered JSON artifact + contract test is the standard pattern for parity inventory/manifest surfaces.
  - Canonical baseline report is the shared downstream consumption surface for diagnostics and later release-gate composition.
observability_surfaces:
  - `tests/parity/artifacts/baseline-report.json#secondaryParity` now exposes per-surface inventory state, missing required lanes, planned fixtures, coverage gaps, and rebrand drift.
  - `tests/parity/diagnostics.ts --report tests/parity/artifacts/baseline-report.json` continues to provide operator-facing diagnostics from the canonical artifact without reruns.
drill_down_paths:
  - .gsd/milestones/M115/slices/S01/tasks/T01-SUMMARY.md
  - .gsd/milestones/M115/slices/S01/tasks/T02-SUMMARY.md
  - .gsd/milestones/M115/slices/S01/tasks/T03-SUMMARY.md
duration: ""
verification_result: passed
completed_at: 2026-04-24T10:01:19.611Z
blocker_discovered: false
---

# S01: S01

**Published a truthful secondary-surface parity inventory, deterministic lane/fixture contracts, and canonical baseline-report wiring for web mode, MCP, workflow/BMAD, and worktree/session/recovery surfaces.**

## What Happened

Slice S01 converted M115’s secondary-surface parity scope from scattered repo knowledge into tracked contracts that downstream slices can consume directly. T01 introduced `tests/parity/secondary-surface-inventory.ts` plus the rendered `tests/parity/artifacts/secondary-surface-inventory.json`, establishing a machine-readable audit of the four scoped surfaces (`web-mode`, `mcp`, `workflow-bmad`, and `worktree-session-recovery`), the deterministic evidence that already exists in-repo, the remaining uncovered areas, and a curated rebrand-drift list. The audit was intentionally truth-first: all four surfaces remain marked `partial` because there is not yet a dedicated release-readable proof lane for each surface. T02 then defined the stable contract layer in `tests/parity/secondary-lanes.ts` and `tests/fixtures/secondary-parity-manifest.json`, locking proof classes, required versus optional lanes, deterministic fixture paths, and explicit uncovered-surface semantics so later slices extend one source of truth instead of inventing ad hoc definitions. T03 wired that contract into the canonical parity runner by deriving a `secondaryParity` payload into `tests/parity/artifacts/baseline-report.json`, with contract tests proving that emitted and persisted report shapes stay synchronized with the tracked inventory and manifest. The slice also documented remaining rename drift rather than hiding it: runtime diagnostics, worktree usage text, MCP/web startup output, packaging metadata, and some test/fixture assumptions still expose `gsd` or `gsd-pi`, and those are now explicit downstream retirement work instead of ambient repo folklore. The resulting pattern for M115 is clear: core coding-loop parity remains the M114 proof lane, while secondary surfaces now have a truthful matrix/report surface and deterministic fixture contracts that S02–S05 can close incrementally.

## Verification

Executed the full slice verification stack and confirmed the assembled work matches the slice plan. `rg -n "gsd-pi|Usage: gsd|\[gsd\]" src tests package.json` exited 0 and surfaced the expected remaining drift inventory, which is now intentionally captured in the new audit/report artifacts rather than treated as an implicit failure. `node --experimental-strip-types tests/parity/run.ts --format json` exited 0 and emitted a canonical baseline report whose `secondaryParity` section summarizes all four scoped surfaces as `partial`, preserves 12 drift findings, and remains consumable without reruns. `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/secondary-surface-inventory-contract.test.ts src/tests/integration/secondary-parity-manifest.test.ts src/tests/integration/secondary-parity-report-contract.test.ts src/tests/integration/parity-baseline-contract.test.ts` exited 0 with 15/15 passing assertions, proving inventory/artifact identity, lane/fixture manifest shape, uncovered-surface semantics, and canonical report wiring. For the observability/diagnostic surface required by this slice, `node --experimental-strip-types tests/parity/diagnostics.ts --report tests/parity/artifacts/baseline-report.json` exited 0 and rendered an operator-facing partial verdict with actionable lane metadata, repo-installed comparison, uncovered lanes, and the new secondary-surface payload available for downstream release-gate consumers.

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

None. The only factual adjustment during assembly was preserving truthful expectations in the pre-existing baseline contract after the observed baseline verdict was `partial` rather than an older hard-coded failing assumption.

## Known Limitations

The slice intentionally does not close parity for web mode, MCP, workflow/BMAD, or worktree/session/recovery. All four surfaces remain `partial`, release-readable proof lanes for each surface are still planned work, and the documented `gsd`/`gsd-pi` drift remains present in runtime diagnostics, packaging metadata, and some tests/comments.

## Follow-ups

S02 should consume the web-mode contract rows and decide whether web parity requires repo/install dual proof or an explicit scoped exception. S03 should add a controlled MCP parity lane that proves discover → call → failure diagnostics on a deterministic fixture server. S04 should define one representative workflow/BMAD fixture and explicit scope semantics for what counts as workflow parity. S05 should compose the new `secondaryParity` data into an integrated release-facing secondary-surface gate and retire or clearly bucket the documented rebrand drift.

## Files Created/Modified

- `tests/parity/secondary-surface-inventory.ts` — Added the source-of-truth inventory for scoped secondary surfaces, current coverage, uncovered areas, and rebrand drift.
- `tests/parity/artifacts/secondary-surface-inventory.json` — Rendered machine-readable artifact for the audited secondary-surface inventory.
- `tests/parity/secondary-lanes.ts` — Added typed secondary parity lane definitions, proof classes, fixture metadata, and validation helpers.
- `tests/fixtures/secondary-parity-manifest.json` — Rendered tracked manifest for the four secondary surfaces and their required/optional proof lanes.
- `tests/parity/baseline-lanes.ts` — Extended canonical baseline report generation to derive and emit the `secondaryParity` payload.
- `tests/parity/artifacts/baseline-report.json` — Persisted canonical baseline report now includes the derived secondary parity section and drift metadata.
- `src/tests/integration/secondary-surface-inventory-contract.test.ts` — Locked inventory source/artifact identity and scoped-surface truthfulness semantics.
- `src/tests/integration/secondary-parity-manifest.test.ts` — Locked manifest shape, lane counts, proof taxonomy, and partial-surface semantics.
- `src/tests/integration/secondary-parity-report-contract.test.ts` — Locked runner and persisted report wiring for the canonical secondary parity payload.
- `src/tests/integration/parity-baseline-contract.test.ts` — Updated stale local expectations so the baseline contract matches the repo’s current truthful `partial` state.

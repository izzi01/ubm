---
id: S05
parent: M115
milestone: M115
provides:
  - One integrated secondary-surface parity gate/report for release consumers.
  - Deterministic worktree/session/recovery and scoped rebrand-drift contracts that feed the integrated gate.
  - A human-readable secondary-surface UAT and diagnostics path aligned with the machine-readable artifact.
requires:
  - slice: S02
    provides: Release-readable web-mode parity row and artifact wiring in the canonical baseline report.
  - slice: S03
    provides: Dedicated deterministic MCP parity artifact and diagnostics contract.
  - slice: S04
    provides: Representative workflow/BMAD parity artifact and diagnostics contract.
affects:
  - milestone-complete
key_files:
  - tests/fixtures/worktree-session-parity-manifest.json
  - src/tests/integration/worktree-session-parity-contract.test.ts
  - src/tests/integration/rebrand-surface-contract.test.ts
  - tests/parity/secondary-release-gate.ts
  - src/tests/integration/secondary-release-gate-contract.test.ts
  - tests/parity/artifacts/secondary-release-report.json
  - tests/parity/diagnostics.ts
  - tests/parity/human-uat-secondary.md
  - src/tests/integration/secondary-parity-diagnostics-contract.test.ts
  - .gsd/PROJECT.md
key_decisions:
  - Compose the secondary release gate from existing canonical artifacts and manifest-backed contracts instead of creating a separate runner stack.
  - Treat web-mode, MCP, workflow/BMAD, worktree/session/recovery, and scoped rebrand drift as required release-driving lanes while keeping planned-proof and live/provider lanes explicit but non-blocking.
  - Represent worktree/session/recovery parity as a deterministic manifest plus integration contracts and classify remaining old-brand strings as tracked expected drift.
  - Extend the shared diagnostics CLI with a secondary surface mode rather than creating a second diagnostics tool.
patterns_established:
  - Truthfulness-first parity reporting: required lanes drive the verdict, optional/live lanes remain visible, and drift is surfaced explicitly.
  - Use tracked JSON artifacts plus integration contracts to make release gates debuggable without rerunning all underlying slice-level flows.
  - Map downstream failures to explicit top-level failed phases so aggregated red reports stay actionable.
observability_surfaces:
  - `tests/parity/artifacts/secondary-release-report.json` as the integrated machine-readable secondary parity artifact.
  - `node --experimental-strip-types tests/parity/diagnostics.ts --surface secondary --report tests/parity/artifacts/secondary-release-report.json` as the operator-facing diagnostics view.
  - Stable failed surface, failed phase, artifact path, and optionalLive metadata in both text and JSON output.
drill_down_paths:
  - .gsd/milestones/M115/slices/S05/tasks/T01-SUMMARY.md
  - .gsd/milestones/M115/slices/S05/tasks/T02-SUMMARY.md
  - .gsd/milestones/M115/slices/S05/tasks/T03-SUMMARY.md
duration: ""
verification_result: passed
completed_at: 2026-04-24T11:25:40.633Z
blocker_discovered: false
---

# S05: Integrated secondary-surface release gate

**Delivered a passing integrated secondary-surface parity gate that truthfully composes web mode, MCP, workflow/BMAD, worktree/session/recovery, and scoped rebrand drift into one release-facing report with actionable diagnostics and human UAT.**

## What Happened

S05 closed the secondary-surface parity band by turning the previously separate web-mode, MCP, workflow/BMAD, worktree/session/recovery, and rebrand findings into one integrated release-facing gate and report. T01 added a deterministic `tests/fixtures/worktree-session-parity-manifest.json` contract plus integration tests that lock the current branchless lifecycle/recovery exports and keep remaining operator-visible old-brand strings explicit instead of pretending the rename is fully closed. T02 implemented `tests/parity/secondary-release-gate.ts`, which composes the canonical baseline report with the dedicated MCP and workflow artifacts and the new worktree/rebrand contracts, writes `tests/parity/artifacts/secondary-release-report.json`, preserves artifact paths plus failed surfaces/phases, and makes only the required secondary lanes verdict-driving while keeping planned-proof and provider/live lanes visible but non-blocking. T03 extended the shared diagnostics renderer with a secondary surface mode, added `tests/parity/human-uat-secondary.md`, and locked both the operator-facing report and the human-readable UAT path with integration contracts. The established pattern for this slice is truthfulness-first release reporting: required lanes must drive the verdict, optional/live/planned lanes must remain explicit, and scoped drift must be reported as drift rather than hidden. Assumption made autonomously: remaining old-brand worktree/session strings in the scoped surface are acceptable to ship for this milestone only when they remain explicitly inventoried and non-blocking in the integrated gate.

## Verification

All slice-plan verification passed. Verified T01 with `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/worktree-session-parity-contract.test.ts src/tests/integration/rebrand-surface-contract.test.ts` (6/6 pass). Verified T02 with `node --experimental-strip-types tests/parity/secondary-release-gate.ts --format text && node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/secondary-release-gate-contract.test.ts` (secondary release gate passed; 4/4 contract tests pass). Verified T03 with `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/secondary-parity-diagnostics-contract.test.ts` (5/5 pass). Confirmed the observability/reporting surface directly with `node --experimental-strip-types tests/parity/diagnostics.ts --surface secondary --report tests/parity/artifacts/secondary-release-report.json`, which rendered the human-auditable required/optional/live breakdown successfully. The integrated gate reports required lanes `web-mode`, `mcp`, `workflow-bmad`, `worktree-session-recovery`, and `rebrand-drift` as passed, while optional planned-proof lanes and provider-live coverage remain explicit and non-blocking. Verification evidence also confirms the baseline report remains truthfully contextual rather than artificially green: `baselineSummary: verdict=failing passed=6/8 failed=1 skipped=1`, with `optionalLive.status=skipped` and `skipReason=not-enabled` preserved in the secondary artifact.

## Requirements Advanced

- R031 — Extended the truthfulness-first diagnostics pattern from core parity into the integrated secondary-surface release artifact and human-readable diagnostics path.
- R033 — Reduced the deferred secondary-surface parity scope by delivering release-readable proof for web mode, MCP, workflow/BMAD, worktree/session/recovery, and scoped rebrand surfaces in M115.

## Requirements Validated

None.

## New Requirements Surfaced

None.

## Requirements Invalidated or Re-scoped

None.

## Operational Readiness

None.

## Deviations

None.

## Known Limitations

The integrated secondary release gate is intentionally scoped to release-readable secondary surfaces already proven in M115. Optional planned-proof lanes remain visible but unimplemented, and provider/live coverage remains non-blocking and usually skipped unless explicitly enabled/configured. Remaining old-brand strings in the scoped worktree/session surface are tracked as expected drift rather than fully eliminated.

## Follow-ups

Milestone-level validation and completion should now assess M115 as a whole. Future parity work can convert currently planned-proof optional lanes—especially installed-recording coverage for secondary surfaces—into additional deterministic artifacts if release confidence needs to increase.

## Files Created/Modified

- `tests/fixtures/worktree-session-parity-manifest.json` — Added the deterministic worktree/session/recovery parity and scoped rebrand-drift manifest consumed by the integrated gate.
- `src/tests/integration/worktree-session-parity-contract.test.ts` — Locked branchless worktree/session/recovery contract expectations and operator help branding.
- `src/tests/integration/rebrand-surface-contract.test.ts` — Pinned expected remaining old-brand drift findings used by the release gate.
- `tests/parity/secondary-release-gate.ts` — Implemented the integrated secondary release gate and report emission logic.
- `src/tests/integration/secondary-release-gate-contract.test.ts` — Locked release gate report shape, green/red semantics, and artifact preservation behavior.
- `tests/parity/diagnostics.ts` — Extended shared parity diagnostics with a secondary-surface rendering mode.
- `tests/parity/human-uat-secondary.md` — Added operator-facing UAT guidance for the secondary-surface parity band.
- `src/tests/integration/secondary-parity-diagnostics-contract.test.ts` — Locked the secondary diagnostics output and human-readable UAT contract.
- `.gsd/PROJECT.md` — Refreshed project state to reflect S05 completion and the integrated secondary release gate.

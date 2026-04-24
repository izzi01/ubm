---
id: T01
parent: S01
milestone: M115
key_files:
  - tests/parity/secondary-surface-inventory.ts
  - tests/parity/artifacts/secondary-surface-inventory.json
  - src/tests/integration/secondary-surface-inventory-contract.test.ts
key_decisions:
  - Represent the audit as a TypeScript source-of-truth module plus a rendered JSON artifact and a contract test that asserts they remain identical.
  - Keep all four scoped secondary surfaces marked `partial` until downstream slices publish dedicated parity proof lanes/artifacts instead of over-claiming closure from scattered existing tests.
  - Capture a curated high-signal rebrand-drift list covering runtime diagnostics, worktree usage text, web/MCP startup output, packaging metadata, and representative install/test fixture assumptions rather than trying to rewrite all drift in the audit task.
duration: 
verification_result: passed
completed_at: 2026-04-24T09:41:26.720Z
blocker_discovered: false
---

# T01: Added a tracked secondary-surface parity inventory artifact and contract test that audits web, MCP, workflow/BMAD, and worktree-session recovery coverage plus rebrand drift.

**Added a tracked secondary-surface parity inventory artifact and contract test that audits web, MCP, workflow/BMAD, and worktree-session recovery coverage plus rebrand drift.**

## What Happened

I audited the repo’s current secondary parity surfaces against the M115 slice scope and found that web mode, MCP, workflow/BMAD, and worktree/session/recovery each already have meaningful targeted coverage, but that coverage is scattered across integration/unit tests and not yet expressed as one release-readable parity contract. I implemented `tests/parity/secondary-surface-inventory.ts` as the source-of-truth inventory module, encoding four scoped surface rows, their current `partial` status, the tracked evidence paths already covering each surface, the uncovered areas that downstream slices still need to close, and a structured rebrand-drift list covering runtime diagnostics, help/usage, packaging, and install/test fixture assumptions. I rendered the matching machine-readable artifact to `tests/parity/artifacts/secondary-surface-inventory.json` and added `src/tests/integration/secondary-surface-inventory-contract.test.ts` to lock source/artifact identity, fixed surface scope, cited evidence paths, expected drift bands, and validation behavior for summary mismatches or unknown surface references. I intentionally did not mutate the existing parity runner in this task because the current slice contract for T01 is the truthful audit surface itself; the runner still targets the M114 core parity baseline, and the new artifact now gives downstream slices a stable contract to wire into that reporting path without re-auditing the repo ad hoc.

## Verification

Verified the new audit contract directly with Node’s test runner and confirmed all five secondary-surface inventory contract assertions pass. Re-ran the existing parity baseline runner to ensure this task did not break the pre-existing parity report plumbing; it still exits 0 and emits the current baseline JSON report. Re-ran the planned grep audit command to capture the stale `gsd`/`gsd-pi` references as explicit evidence; the command exits 0 because matches exist, which is expected for this audit task and now corresponds to structured rows in the new inventory artifact rather than an implicit warning.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/secondary-surface-inventory-contract.test.ts` | 0 | ✅ pass | 103ms |
| 2 | `node --experimental-strip-types tests/parity/run.ts --format json` | 0 | ✅ pass | 33678ms |
| 3 | `rg -n "gsd-pi|Usage: gsd|\[gsd\]" src tests package.json` | 0 | ✅ pass | 10ms |

## Deviations

None.

## Known Issues

The repo still contains additional stale `[gsd]` and `gsd-pi` references beyond the highest-signal rows captured in this first inventory artifact, especially inside extension/runtime internals and auxiliary tests. Those are not hidden anymore, but they are not yet fully normalized or grouped into downstream retirement bands beyond the four scoped surfaces and the selected drift list captured here.

## Files Created/Modified

- `tests/parity/secondary-surface-inventory.ts`
- `tests/parity/artifacts/secondary-surface-inventory.json`
- `src/tests/integration/secondary-surface-inventory-contract.test.ts`

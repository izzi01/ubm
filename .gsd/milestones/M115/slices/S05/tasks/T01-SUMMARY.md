---
id: T01
parent: S05
milestone: M115
key_files:
  - tests/fixtures/worktree-session-parity-manifest.json
  - src/tests/integration/worktree-session-parity-contract.test.ts
  - src/tests/integration/rebrand-surface-contract.test.ts
key_decisions:
  - Represent the worktree/session/recovery parity lane as a deterministic source-inspection manifest plus integration contracts, matching the existing secondary-parity inventory/manifest pattern instead of introducing a new runner.
  - Treat remaining CLI/worktree old-brand strings as explicit expected drift in the contract so the later release gate can classify them truthfully rather than silently assuming rename closure.
duration: 
verification_result: passed
completed_at: 2026-04-24T11:08:17.619Z
blocker_discovered: false
---

# T01: Added deterministic worktree/session parity and rebrand drift contracts for the secondary release gate.

**Added deterministic worktree/session parity and rebrand drift contracts for the secondary release gate.**

## What Happened

Added a tracked `worktree-session-recovery` parity manifest that names the release-readable contract scope for branchless worktree lifecycle, stale-worktree/session recovery helpers, headless resume resolution, and operator help surfaces. Added `worktree-session-parity-contract.test.ts` to lock the expected exported branchless-flow primitives in `auto-worktree.ts`, `auto-recovery.ts`, and `headless.ts`, while also proving the public help text is branded as `umb` for the sessions/worktree surface. Added `rebrand-surface-contract.test.ts` to pin the remaining user-visible old-brand drift strings in `src/cli.ts` and `src/worktree-cli.ts` and verify they still match the tracked secondary-surface inventory findings. During verification I hit two narrow contract mistakes in my new test/manifest assumptions: first an abbreviated RTK warning string, then an incorrect assumption that every drift finding in this scoped manifest belonged to the `worktree-session-recovery` surface. I corrected both and re-ran the same verification command to green.

## Verification

Ran the task verification command exactly as planned: `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/worktree-session-parity-contract.test.ts src/tests/integration/rebrand-surface-contract.test.ts`. The first run failed because the new manifest abbreviated the RTK warning string and the new rebrand test incorrectly forced all included drift findings to the `worktree-session-recovery` surface. After correcting those two assumptions, the same command passed with all 6 tests green.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/worktree-session-parity-contract.test.ts src/tests/integration/rebrand-surface-contract.test.ts` | 0 | ✅ pass | 108ms |

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `tests/fixtures/worktree-session-parity-manifest.json`
- `src/tests/integration/worktree-session-parity-contract.test.ts`
- `src/tests/integration/rebrand-surface-contract.test.ts`

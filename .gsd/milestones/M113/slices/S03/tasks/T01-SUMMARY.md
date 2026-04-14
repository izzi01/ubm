---
id: T01
parent: S03
milestone: M113
key_files:
  - (none)
key_decisions:
  - (none)
duration: 
verification_result: passed
completed_at: 2026-04-14T03:47:54.383Z
blocker_discovered: false
---

# T01: Removed stash/pop, milestone shelter, and .gsd/ auto-resolve from mergeMilestoneToMain (227 lines cut)

**Removed stash/pop, milestone shelter, and .gsd/ auto-resolve from mergeMilestoneToMain (227 lines cut)**

## What Happened

Removed three defensive mechanisms from mergeMilestoneToMain that became unnecessary after S01 made .gsd planning artifacts git-tracked:

1. **Stash/pop** (~95 lines) — Section 7 + stash-pop calls in dirty-tree and conflict error paths. With .gsd files git-tracked, the primary reason for stashing (untracked .gsd files blocking merge) is eliminated.

2. **Milestone shelter** (~70 lines) — Section 7a + restoreShelter helper. With .gsd/milestones/ git-tracked, untracked milestone directories no longer need temporary relocation during squash merge.

3. **Auto-resolve .gsd/ conflicts** (~40 lines) — The isSafeToAutoResolve-based conflict separation and nativeCheckoutTheirs resolution within section 8. With .gsd files git-tracked, they won't diverge between branches.

Also removed dead exports: `isSafeToAutoResolve` and `SAFE_AUTO_RESOLVE_PATTERNS`, plus their dedicated test file. Removed now-unused imports (`nativeCheckoutTheirs`, `nativeAddPaths`, `nativeRmForce`).

Conflict handling now simplifies to: dirty tree → throw GSDError; any conflicts → abort merge state → throw MergeConflictError. The function went from ~652 lines to 447 lines. Core functionality preserved: dirty tree detection, branch-ref divergence check, merge state cleanup, auto-push, auto-PR.

## Verification

tsc --noEmit passes cleanly. grep confirms zero production-code references to stash, shelter, isSafeToAutoResolve, or SAFE_AUTO_RESOLVE_PATTERNS. One pre-existing failing integration test (git-service.test.ts:585 — slice branch integration recording) confirmed unrelated to changes.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `npx tsc --noEmit --pretty` | 0 | ✅ pass | 8000ms |
| 2 | `grep -n 'stash|shelter|isSafeToAutoResolve|SAFE_AUTO_RESOLVE' src/resources/extensions/gsd/auto-worktree.ts` | 1 | ✅ pass (no hits) | 100ms |
| 3 | `grep -rn 'isSafeToAutoResolve|SAFE_AUTO_RESOLVE_PATTERNS' src/ --include='*.ts'` | 1 | ✅ pass (no imports remain) | 200ms |

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

None.

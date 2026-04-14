---
id: T02
parent: S03
milestone: M113
key_files:
  - src/resources/extensions/gsd/auto-worktree.ts
  - src/resources/extensions/gsd/tests/integration/auto-worktree-milestone-merge.test.ts
key_decisions:
  - (none)
duration: 
verification_result: passed
completed_at: 2026-04-14T03:57:37.521Z
blocker_discovered: false
---

# T02: Cleaned up tests (deleted 4 files, rewrote 2), extracted cleanupMergeStateFiles helper, trimmed mergeMilestoneToMain from 447 to 233 lines

**Cleaned up tests (deleted 4 files, rewrote 2), extracted cleanupMergeStateFiles helper, trimmed mergeMilestoneToMain from 447 to 233 lines**

## What Happened

T01 left mergeMilestoneToMain at 447 lines — still 197 over the ≤250 target. This task achieved the goal through two workstreams:

**Production code simplification (auto-worktree.ts):**
- Extracted `cleanupMergeStateFiles(basePath, label)` helper to deduplicate the merge-artifact cleanup pattern that was copy-pasted 4 times (pre-merge, dirty-tree error, conflict error, post-commit). Each copy was ~8 lines of identical try/catch/for logic. This saved ~40 lines.
- Trimmed verbose inline comments throughout the function — kept issue references (#2929, #1668, etc.) but removed multi-paragraph narrative explanations that duplicated docblock content. Saved ~100 lines of comments.
- Consolidated auto-push and auto-PR sections (steps 10) under a single `!nothingToCommit` guard with shared `remote` variable.
- Consolidated worktree removal and branch deletion (steps 12-13) from 15 lines to 6.
- Simplified pre-teardown safety net (step 11a) from 25 lines with debugLog calls to 12 lines.
- Result: 447 → 233 lines (48% reduction). File total: 1086 → 877 lines.

**Test cleanup:**
- Deleted 3 test files (auto-worktree-auto-resolve.test.ts was already deleted by T01):
  - stash-pop-gsd-conflict.test.ts (6KB)
  - stash-queued-context-files.test.ts (12KB)
  - integration/auto-stash-merge.test.ts (5KB)
- Updated integration/auto-worktree-milestone-merge.test.ts:
  - Removed "auto-resolve .gsd/ state file conflicts" test (functionality removed in T01)
  - Rewrote "#2151 e2e: dirty tree is stashed" → "#2151 e2e: dirty tree rejects merge with GSDError" — stash is gone, dirty tree now correctly throws GSDError with file list
  - Fixed mislabeled test name (skip checkout #757 was accidentally relabeled as #1738 bug 3 during edit)
- All 22 integration tests pass.

## Verification

tsc --noEmit passes cleanly. All 4 deleted test files confirmed absent. mergeMilestoneToMain is 233 lines (≤250 target). All 22 integration tests pass including the rewritten #2151 dirty-tree rejection test. grep confirms zero references to stash, shelter, isSafeToAutoResolve, or SAFE_AUTO_RESOLVE in production code.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `npx tsc --noEmit --pretty` | 0 | ✅ pass | 8000ms |
| 2 | `test ! -f stash-pop-gsd-conflict.test.ts && test ! -f stash-queued-context-files.test.ts && test ! -f auto-worktree-auto-resolve.test.ts && test ! -f integration/auto-stash-merge.test.ts` | 0 | ✅ pass (4 files deleted) | 100ms |
| 3 | `awk '/^export function mergeMilestoneToMain/,/^}$/' auto-worktree.ts | wc -l` | 0 | ✅ pass (233 lines, ≤250 target) | 100ms |
| 4 | `grep -n 'stash|shelter|isSafeToAutoResolve|SAFE_AUTO_RESOLVE' auto-worktree.ts` | 1 | ✅ pass (no references remain) | 100ms |
| 5 | `node --test integration/auto-worktree-milestone-merge.test.ts (22 tests)` | 0 | ✅ pass (22/22) | 6400ms |

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `src/resources/extensions/gsd/auto-worktree.ts`
- `src/resources/extensions/gsd/tests/integration/auto-worktree-milestone-merge.test.ts`

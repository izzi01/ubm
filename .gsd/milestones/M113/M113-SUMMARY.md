---
id: M113
title: "Branchless Worktree Architecture"
status: complete
completed_at: 2026-04-14T04:44:43.849Z
key_decisions:
  - Extracted cleanupMergeStateFiles() helper to deduplicate merge-artifact cleanup pattern (was copy-pasted 4 times in mergeMilestoneToMain)
  - Conflict handling simplified to two cases: dirty tree → GSDError; any conflicts → abort + MergeConflictError (no nuanced classification)
  - Historical comment reference to removed sync function preserved in merge-cwd-restore.test.ts as documentation of original bug context
key_files:
  - src/resources/extensions/gsd/auto-worktree.ts
  - src/resources/extensions/gsd/auto-recovery.ts
  - src/resources/extensions/gsd/auto.ts
  - .gitignore
  - src/resources/extensions/gsd/tests/integration/auto-worktree-milestone-merge.test.ts
lessons_learned:
  - Converting .gsd from symlink to real directory was the single enabler — all downstream simplification (sync removal, merge simplification) depended on this
  - Line count targets function as useful forcing functions for simplification — the ≤250 line target drove extraction of the cleanupMergeStateFiles helper and comment trimming
  - Historical comments referencing removed functions should be preserved when they document bug context, not deleted as dead code
  - The sync layer had zero production callers at removal time — prior changes had already migrated consumers, making S02 a clean deletion with no behavioral risk
---

# M113: Branchless Worktree Architecture

**Eliminated the worktree sync layer by tracking planning artifacts in git, removing ~3400 lines of sync code, simplifying mergeMilestoneToMain from 652 to 233 lines, and validating all 4 requirements.**

## What Happened

M113 delivered the branchless worktree architecture across four slices. The core insight: if planning artifacts travel with branches via git, the entire sync layer becomes unnecessary.

**S01** (low risk) converted .gsd from a symlink to a real directory and configured .gitignore with 25 specific runtime patterns, enabling 8 planning .md files and 355 milestone files to be git-tracked while runtime files (gsd.db, STATE.md, activity/, etc.) remain gitignored.

**S02** (medium risk) removed 4 exported sync functions, 3 private helpers, and 2 utility functions from auto-worktree.ts. Deleted 9 sync-only test files and cleaned 13 mixed-content test files. rg confirms zero production references remain.

**S03** (high risk) simplified mergeMilestoneToMain from ~652 to 233 lines (64% reduction). Removed stash/pop (~95 lines), milestone shelter (~70 lines), and .gsd/ auto-resolve (~40 lines). Extracted cleanupMergeStateFiles() helper. All 22 integration tests pass.

**S04** (medium risk) removed .gsd/ auto-resolve branch from reconcileMergeState in auto-recovery.ts and deleted duplicate abortAndResetMerge. Cleaned unused native-git-bridge imports. Full test suite: 20 vitest files / 405 tests passing, tsc clean.

Total impact: 30 files changed, ~3370 lines net removed. Four requirements validated (R023–R026). Zero regressions.

## Success Criteria Results

## Success Criteria Results

| Criterion | Result | Evidence |
|-----------|--------|----------|
| git ls-files shows planning artifacts tracked, runtime files untracked | ✅ PASS | 5 planning .md files confirmed tracked via `git ls-files`; gsd.db, STATE.md, runtime/, activity/, journal/ confirmed gitignored via `git check-ignore` |
| rg finds zero references to deleted sync functions in production code | ✅ PASS | rg across `src/resources/extensions/gsd/` (type ts) finds zero production references; only historical comment in merge-cwd-restore.test.ts (non-functional) |
| mergeMilestoneToMain is ≤250 lines | ✅ PASS | Function reduced to 233 lines. Zero references to stash/shelter/isSafeToAutoResolve/SAFE_AUTO_RESOLVE in auto-worktree.ts |
| Sync-specific test files deleted, remaining tests compile and pass | ✅ PASS | 9 sync-only test files deleted; tsc --noEmit: 0 errors; vitest: 20 files / 405 tests passing; abortAndResetMerge: 0 rg hits across entire codebase |

## Definition of Done Results

## Definition of Done Results

| Item | Result | Evidence |
|------|--------|----------|
| All 4 slices complete | ✅ PASS | gsd_milestone_status confirms S01, S02, S03, S04 all status: complete |
| All slice summaries exist | ✅ PASS | 4 slice summaries (S01–S04) + 7 task summaries found on disk |
| Cross-slice integration works | ✅ PASS | S02 consumed S01's git-tracked artifacts; S03 consumed S02's clean codebase; S04 consumed S03's simplified merge code. No integration conflicts reported. |
| No regressions | ✅ PASS | tsc --noEmit: 0 errors; vitest: 405 tests passing; 22/22 merge integration tests passing |
| Code changes verified | ✅ PASS | git diff shows 30 files changed, ~3370 lines net removed across auto-worktree.ts, auto-recovery.ts, and test files |

## Requirement Outcomes

## Requirement Outcomes

| ID | Transition | Evidence |
|----|-----------|----------|
| R023 | active → validated | .gsd is real directory (not symlink). 8 planning .md + 355 milestone files staged. 25 runtime patterns gitignored. git check-ignore confirms correct behavior. |
| R024 | active → validated | rg finds zero production references to 9 deleted sync functions. tsc clean. 9 test files deleted, 13 cleaned. |
| R025 | active → validated | mergeMilestoneToMain: 652 → 233 lines (≤250 target met). stash/shelter/auto-resolve removed. 22/22 integration tests pass. |
| R026 | active → validated | tsc clean. 405 tests passing. abortAndResetMerge: 0 references. reconcileMergeState simplified. |

## Deviations

None.

## Follow-ups

None.

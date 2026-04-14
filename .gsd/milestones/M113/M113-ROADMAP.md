# M113: Branchless Worktree Architecture

## Vision
Eliminate the worktree sync layer by tracking planning artifacts in git, cascading into removing ~500 lines of sync code, simplifying mergeMilestoneToMain from ~650 to ≤250 lines, and deleting ~2000+ lines of sync-specific tests.

## Slice Overview
| ID | Slice | Risk | Depends | Done | After this |
|----|-------|------|---------|------|------------|
| S01 | S01 | low | — | ⬜ | git ls-files shows planning artifacts tracked, runtime files untracked. git worktree add produces correct .gsd/milestones/ from branch. |
| S02 | Remove worktree sync layer | medium | S01 | ⬜ | rg finds zero references to deleted sync functions in production code. tsc --noEmit passes. |
| S03 | Simplify mergeMilestoneToMain | high | S01, S02 | ⬜ | mergeMilestoneToMain is ≤250 lines. No stash/shelter/isSafeToAutoResolve references. Function still handles dirty tree detection and branch-ref divergence. |
| S04 | Test cleanup + git-self-heal simplification | medium | S02, S03 | ⬜ | Sync-specific test files deleted. Remaining tests compile and pass. abortAndReset simplified. |

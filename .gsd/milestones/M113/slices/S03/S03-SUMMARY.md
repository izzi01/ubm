---
id: S03
parent: M113
milestone: M113
provides:
  - (none)
requires:
  []
affects:
  []
key_files:
  - ["src/resources/extensions/gsd/auto-worktree.ts", "src/resources/extensions/gsd/tests/integration/auto-worktree-milestone-merge.test.ts"]
key_decisions:
  - ["Extracted cleanupMergeStateFiles() helper to deduplicate merge-artifact cleanup pattern (was copy-pasted 4 times)"]
patterns_established:
  - ["cleanupMergeStateFiles() helper for merge-artifact cleanup", "Simple conflict model: dirty tree → GSDError; conflicts → abort + MergeConflictError (no nuanced classification)"]
observability_surfaces:
  - none
drill_down_paths:
  []
duration: ""
verification_result: passed
completed_at: 2026-04-14T03:59:26.285Z
blocker_discovered: false
---

# S03: S03: Simplify mergeMilestoneToMain

**Removed stash/pop, milestone shelter, and .gsd/ auto-resolve from mergeMilestoneToMain, cutting it from ~652 to 233 lines while preserving all core merge functionality.**

## What Happened

## What Happened

This slice simplified mergeMilestoneToMain from ~652 lines to 233 lines (64% reduction), achieving the ≤250 line target. The simplification was possible because S01 made .gsd planning artifacts git-tracked, eliminating the three defensive mechanisms that were no longer needed.

**T01** removed the three major defensive mechanisms:
- **Stash/pop** (~95 lines) — With .gsd files git-tracked, untracked .gsd files no longer block merges.
- **Milestone shelter** (~70 lines) — With .gsd/milestones/ git-tracked, untracked milestone directories no longer need temporary relocation.
- **Auto-resolve .gsd/ conflicts** (~40 lines) — With .gsd files git-tracked, they won't diverge between branches.
- Also removed dead exports: `isSafeToAutoResolve` and `SAFE_AUTO_RESOLVE_PATTERNS`, plus unused imports.

Result after T01: ~652 → 447 lines. Conflict handling simplified to: dirty tree → throw GSDError; any conflicts → abort merge state → throw MergeConflictError.

**T02** completed the simplification to hit the ≤250 target:
- Extracted `cleanupMergeStateFiles()` helper to deduplicate 4 identical merge-artifact cleanup blocks (~40 lines saved).
- Trimmed verbose inline comments that duplicated docblock content (~100 lines saved).
- Consolidated auto-push/auto-PR and worktree removal sections.
- Deleted 3 test files (stash-pop-gsd-conflict, stash-queued-context-files, auto-stash-merge) that exclusively tested removed functionality.
- Rewrote #2151 e2e test: "dirty tree is stashed" → "dirty tree rejects merge with GSDError".
- Removed auto-resolve .gsd/ conflicts test from the integration suite.

Result after T02: 447 → 233 lines. All 22 integration tests pass.

## Patterns Established

- **cleanupMergeStateFiles()** helper — reusable pattern for cleaning up merge artifacts (MERGE_HEAD, SQUASH_MSG, etc.) that was duplicated 4 times. Future merge-related code should use this helper.
- **Conflict handling is now simple**: dirty tree → GSDError; any conflicts → abort + MergeConflictError. No more nuanced conflict classification.

## Provides to Downstream

- S04 (Test cleanup + git-self-heal simplification) can now proceed with a clean codebase. mergeMilestoneToMain is at 233 lines, all stash/shelter/auto-resolve references are gone, and the test suite is consistent with the simplified production code.

## Verification

All slice-level verification checks pass:
- tsc --noEmit: ✅ pass (0 errors)
- mergeMilestoneToMain line count: ✅ 233 lines (≤250 target)
- grep for stash/shelter/isSafeToAutoResolve/SAFE_AUTO_RESOLVE in auto-worktree.ts: ✅ zero references
- 4 test files deleted: ✅ all confirmed absent
- Integration tests: ✅ 22/22 pass (including rewritten #2151 dirty-tree rejection test)

## Requirements Advanced

None.

## Requirements Validated

- R025 — mergeMilestoneToMain reduced from ~652 to 233 lines. stash/pop, milestone shelter, and .gsd/ auto-resolve removed. tsc passes, 22/22 integration tests pass, zero references to removed code.

## New Requirements Surfaced

None.

## Requirements Invalidated or Re-scoped

None.

## Operational Readiness

None.

## Deviations

None.

## Known Limitations

None.

## Follow-ups

None.

## Files Created/Modified

- `src/resources/extensions/gsd/auto-worktree.ts` — Removed stash/shelter/auto-resolve, extracted cleanupMergeStateFiles helper, trimmed comments. ~652 → 233 lines.
- `src/resources/extensions/gsd/tests/integration/auto-worktree-milestone-merge.test.ts` — Removed auto-resolve test, rewrote #2151 dirty-tree test to verify GSDError behavior

# S03: Simplify mergeMilestoneToMain

**Goal:** Simplify mergeMilestoneToMain from ~650 lines to ≤250 lines by removing stash/pop, milestone shelter, and .gsd/ conflict auto-resolution — defensive mechanisms that became unnecessary once S01 made .gsd planning artifacts git-tracked.
**Demo:** mergeMilestoneToMain is ≤250 lines. No stash/shelter/isSafeToAutoResolve references. Function still handles dirty tree detection and branch-ref divergence.

## Must-Haves

- mergeMilestoneToMain function is ≤250 lines (measured by awk range count)\n- No references to stash, shelter, or isSafeToAutoResolve in production code\n- Function still handles: auto-commit dirty state, checkout main, squash merge, commit, worktree teardown, auto-push, code change detection, branch-ref divergence check\n- MergeConflictError still thrown on real code conflicts\n- tsc --noEmit passes\n- All merge-related integration tests pass

## Proof Level

- This slice proves: contract

## Integration Closure

- Upstream surfaces consumed: S01 (git-tracked .gsd) and S02 (clean auto-worktree.ts)\n- New wiring introduced: None — pure simplification\n- What remains: nothing (final slice)

## Verification

- No new observability surfaces — this is internal simplification

## Tasks

- [x] **T01: Remove stash, shelter, and auto-resolve from mergeMilestoneToMain** `est:45m`
  Remove three major defensive mechanisms from mergeMilestoneToMain that became unnecessary once S01 made .gsd planning artifacts git-tracked:

1. **Stash/pop** (~95 lines) — Section 7 + 9a-ii + scattered stash-pop calls in error paths. With .gsd files git-tracked, the primary reason for stashing (untracked .gsd files blocking merge) is eliminated.

2. **Milestone shelter** (~70 lines) — Section 7a + 9a-iii + restoreShelter helper. With .gsd/milestones/ git-tracked, untracked milestone directories no longer exist.

3. **Auto-resolve .gsd/ conflicts** (~40 lines) — Within section 8. With .gsd files git-tracked, they won't diverge between branches.

Also remove dead exports: `isSafeToAutoResolve` and `SAFE_AUTO_RESOLVE_PATTERNS` (~15 lines).

Conflict handling simplifies to: dirty tree → throw GSDError; any conflicts → abort merge state → throw MergeConflictError.
  - Files: `src/resources/extensions/gsd/auto-worktree.ts`
  - Verify: tsc --noEmit passes; grep -n 'stash|shelter|isSafeToAutoResolve|SAFE_AUTO_RESOLVE' src/resources/extensions/gsd/auto-worktree.ts returns no production code hits

- [x] **T02: Clean up tests and verify final line count ≤250** `est:45m`
  After T01 removed stash/shelter/auto-resolve from production code, clean up the test suite to match.

Delete 4 test files that exclusively test removed functionality:
- stash-pop-gsd-conflict.test.ts
- stash-queued-context-files.test.ts
- auto-worktree-auto-resolve.test.ts
- integration/auto-stash-merge.test.ts

Update integration/auto-worktree-milestone-merge.test.ts:
- Remove auto-resolve .gsd/ conflicts test
- Update #1738 bug 3 (synced .gsd/ dirs cleaned) — may still pass via clearProjectRootStateFiles
- Update #2151 e2e (dirty tree stashed) — stash removed, dirty tree now causes GSDError; rewrite to verify that behavior

Run tsc --noEmit and integration tests. Verify mergeMilestoneToMain ≤250 lines via awk wc.
  - Files: `src/resources/extensions/gsd/tests/integration/auto-worktree-milestone-merge.test.ts`, `src/resources/extensions/gsd/tests/stash-pop-gsd-conflict.test.ts`, `src/resources/extensions/gsd/tests/stash-queued-context-files.test.ts`, `src/resources/extensions/gsd/tests/auto-worktree-auto-resolve.test.ts`, `src/resources/extensions/gsd/tests/integration/auto-stash-merge.test.ts`, `src/resources/extensions/gsd/auto-worktree.ts`
  - Verify: test ! -f src/resources/extensions/gsd/tests/stash-pop-gsd-conflict.test.ts; test ! -f src/resources/extensions/gsd/tests/stash-queued-context-files.test.ts; test ! -f src/resources/extensions/gsd/tests/auto-worktree-auto-resolve.test.ts; test ! -f src/resources/extensions/gsd/tests/integration/auto-stash-merge.test.ts; tsc --noEmit passes; node --test src/resources/extensions/gsd/tests/integration/auto-worktree-milestone-merge.test.ts passes; awk '/^export function mergeMilestoneToMain/,/^}$/' src/resources/extensions/gsd/auto-worktree.ts | wc -l ≤ 250

## Files Likely Touched

- src/resources/extensions/gsd/auto-worktree.ts
- src/resources/extensions/gsd/tests/integration/auto-worktree-milestone-merge.test.ts
- src/resources/extensions/gsd/tests/stash-pop-gsd-conflict.test.ts
- src/resources/extensions/gsd/tests/stash-queued-context-files.test.ts
- src/resources/extensions/gsd/tests/auto-worktree-auto-resolve.test.ts
- src/resources/extensions/gsd/tests/integration/auto-stash-merge.test.ts

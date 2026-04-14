---
estimated_steps: 6
estimated_files: 1
skills_used: []
---

# T01: Remove stash, shelter, and auto-resolve from mergeMilestoneToMain

Remove three major defensive mechanisms from mergeMilestoneToMain that became unnecessary once S01 made .gsd planning artifacts git-tracked:

1. **Stash/pop** (~95 lines) — Section 7 + 9a-ii + scattered stash-pop calls in error paths. With .gsd files git-tracked, the primary reason for stashing (untracked .gsd files blocking merge) is eliminated.

2. **Milestone shelter** (~70 lines) — Section 7a + 9a-iii + restoreShelter helper. With .gsd/milestones/ git-tracked, untracked milestone directories no longer exist.

3. **Auto-resolve .gsd/ conflicts** (~40 lines) — Within section 8. With .gsd files git-tracked, they won't diverge between branches.

Also remove dead exports: `isSafeToAutoResolve` and `SAFE_AUTO_RESOLVE_PATTERNS` (~15 lines).

Conflict handling simplifies to: dirty tree → throw GSDError; any conflicts → abort merge state → throw MergeConflictError.

## Inputs

- ``src/resources/extensions/gsd/auto-worktree.ts` — 1313-line file containing mergeMilestoneToMain (lines 662-1314), isSafeToAutoResolve (line 164), SAFE_AUTO_RESOLVE_PATTERNS (line 154)`

## Expected Output

- ``src/resources/extensions/gsd/auto-worktree.ts` — Simplified with stash/shelter/auto-resolve removed and dead exports deleted`

## Verification

tsc --noEmit passes; grep -n 'stash|shelter|isSafeToAutoResolve|SAFE_AUTO_RESOLVE' src/resources/extensions/gsd/auto-worktree.ts returns no production code hits

# S04: Test cleanup + git-self-heal simplification — UAT

**Milestone:** M113
**Written:** 2026-04-14T04:39:47.209Z

# UAT: S04 — Test cleanup + git-self-heal simplification

## Preconditions
- Repository at `/home/cid/projects-personal/umb/`
- Node.js installed, dependencies available
- M113 S01–S03 completed (not verified here, assumed from prior slices)

## Test Cases

### TC1: No duplicate abortAndResetMerge in codebase
1. Run: `rg -c 'abortAndResetMerge' src/resources/extensions/gsd/ --type ts`
2. Expected: Exit code 1 (no matches found)
3. Rationale: The duplicate function was fully deleted; only the canonical abortAndReset from git-self-heal.ts should exist

### TC2: TypeScript compilation passes
1. Run: `npx tsc --noEmit`
2. Expected: Exit code 0, no error output
3. Rationale: Removing imports and functions must not break compilation

### TC3: Full vitest suite passes
1. Run: `npx vitest run`
2. Expected: 20 test files passed, 405 tests passed
3. Rationale: No regressions from merge recovery simplification; existing reconcileMergeState tests still cover the clean and conflict paths

### TC4: reconcileMergeState has no .gsd/ auto-resolve logic
1. Run: `rg -c 'theirs' src/resources/extensions/gsd/auto-recovery.ts`
2. Expected: 0 occurrences (the .gsd/ auto-resolve branch that accepted theirs was removed)
3. Rationale: .gsd/ files are now git-tracked; special-case conflict resolution is obsolete

### TC5: Unused native-git-bridge imports removed
1. Run: `rg 'nativeCheckoutTheirs|nativeAddPaths|nativeMergeAbort|nativeResetHard' src/resources/extensions/gsd/auto-recovery.ts`
2. Expected: No matches
3. Rationale: These were only used by the deleted .gsd/ auto-resolve branch

## Edge Cases
- **mergeMilestoneToMain still works**: The function was simplified in S03 but not modified in S04. Verify no regressions by checking that reconcileMergeState callers (phases.ts, auto-worktree.ts, git-service.ts, etc.) still compile cleanly (covered by TC2).
- **Conflict handling returns blocked**: When reconcileMergeState encounters conflicts (any type, including .gsd/), it returns "blocked" and preserves the worktree. No automatic resolution is attempted.

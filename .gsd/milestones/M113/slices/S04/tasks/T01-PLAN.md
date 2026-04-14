---
estimated_steps: 2
estimated_files: 1
skills_used: []
---

# T01: Simplify reconcileMergeState — remove .gsd/ auto-resolve and deduplicate abortAndResetMerge

Simplify merge recovery in auto-recovery.ts by removing the now-obsolete .gsd/ auto-resolve branch from reconcileMergeState() and replacing the local abortAndResetMerge() with the canonical abortAndReset from git-self-heal.ts.

**Context**: S01 made .gsd/ planning artifacts git-tracked. S02 removed sync functions. S03 simplified mergeMilestoneToMain. The reconcileMergeState() function in auto-recovery.ts still has a branch that auto-resolves .gsd/ conflicts during merge reconciliation — this is now unnecessary because .gsd/ files won't diverge between branches. Additionally, the local abortAndResetMerge() function duplicates abortAndReset from git-self-heal.ts.

## Inputs

- `src/resources/extensions/gsd/auto-recovery.ts`
- `src/resources/extensions/gsd/git-self-heal.ts`
- `src/resources/extensions/gsd/tests/integration/auto-recovery.test.ts`

## Expected Output

- `src/resources/extensions/gsd/auto-recovery.ts`
- `src/resources/extensions/gsd/tests/integration/auto-recovery.test.ts`

## Verification

npx vitest run 2>&1 | grep -aE 'Test Files.*passed' should show 20 passed; rg -c 'abortAndResetMerge' src/resources/extensions/gsd/auto-recovery.ts should return 0

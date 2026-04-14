# S04: Test cleanup + git-self-heal simplification

**Goal:** Remove merge-specific recovery logic from auto-recovery.ts (now that .gsd/ files are git-tracked, .gsd/ auto-resolve is unnecessary) and verify all tests compile and pass.
**Demo:** Sync-specific test files deleted. Remaining tests compile and pass. abortAndReset simplified.

## Must-Haves

- reconcileMergeState() has no .gsd/ auto-resolve branch\n- Local abortAndResetMerge() is removed; canonical abortAndReset from git-self-heal.ts is used instead\n- tsc --noEmit passes with 0 errors\n- All vitest tests pass (20 test files, 405+ tests)\n- No production or test code references deleted sync functions (validated in S02, confirmed still clean)

## Proof Level

- This slice proves: contract

## Integration Closure

- Upstream surfaces consumed: auto-recovery.ts (reconcileMergeState, abortAndResetMerge), git-self-heal.ts (abortAndReset)\n- New wiring: reconcileMergeState will import abortAndReset from git-self-heal.ts instead of using local duplicate\n- What remains: nothing — this is the last slice in M113

## Verification

- none

## Tasks

- [x] **T01: Simplify reconcileMergeState — remove .gsd/ auto-resolve and deduplicate abortAndResetMerge** `est:45m`
  Simplify merge recovery in auto-recovery.ts by removing the now-obsolete .gsd/ auto-resolve branch from reconcileMergeState() and replacing the local abortAndResetMerge() with the canonical abortAndReset from git-self-heal.ts.

**Context**: S01 made .gsd/ planning artifacts git-tracked. S02 removed sync functions. S03 simplified mergeMilestoneToMain. The reconcileMergeState() function in auto-recovery.ts still has a branch that auto-resolves .gsd/ conflicts during merge reconciliation — this is now unnecessary because .gsd/ files won't diverge between branches. Additionally, the local abortAndResetMerge() function duplicates abortAndReset from git-self-heal.ts.
  - Files: `src/resources/extensions/gsd/auto-recovery.ts`
  - Verify: npx vitest run 2>&1 | grep -aE 'Test Files.*passed' should show 20 passed; rg -c 'abortAndResetMerge' src/resources/extensions/gsd/auto-recovery.ts should return 0

- [ ] **T02: Verify compilation and full test suite health** `est:30m`
  Run tsc --noEmit and the full vitest suite to confirm all tests compile and pass. Fix any issues introduced by T01 or pre-existing failures that block R026 validation.

The test suite has ~20 vitest test files (405 tests) that pass, plus ~1993 dist-test/ files that fail (pre-existing, expected — they use node:test format). The executor should confirm the vitest-only count is stable after T01 changes.
  - Files: `src/resources/extensions/gsd/tests/integration/auto-recovery.test.ts`, `src/resources/extensions/gsd/tests/auto-loop.test.ts`, `src/resources/extensions/gsd/tests/custom-engine-loop-integration.test.ts`, `src/resources/extensions/gsd/tests/journal-integration.test.ts`
  - Verify: npx tsc --noEmit 2>&1 | tail -1 should show 0 errors; npx vitest run 2>&1 | grep -aE 'Test Files.*passed' should show 20 passed test files

## Files Likely Touched

- src/resources/extensions/gsd/auto-recovery.ts
- src/resources/extensions/gsd/tests/integration/auto-recovery.test.ts
- src/resources/extensions/gsd/tests/auto-loop.test.ts
- src/resources/extensions/gsd/tests/custom-engine-loop-integration.test.ts
- src/resources/extensions/gsd/tests/journal-integration.test.ts

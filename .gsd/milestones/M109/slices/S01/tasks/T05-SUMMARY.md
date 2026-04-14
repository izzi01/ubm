---
id: T05
parent: S01
milestone: M109
key_files:
  - src/resources/extensions/gsd/tests/regex-hardening.test.ts
  - src/resources/extensions/gsd/tests/worktree.test.ts
  - src/resources/extensions/gsd/tests/worktree-integration.test.ts
  - src/resources/extensions/gsd/tests/integration/integration-mixed-milestones.test.ts
  - src/resources/extensions/gsd/tests/none-mode-gates.test.ts
key_decisions:
  - (none)
duration: 
verification_result: passed
completed_at: 2026-04-12T09:27:26.609Z
blocker_discovered: false
---

# T05: Removed all dead SLICE_BRANCH_RE, parseSliceBranch, and dead isolation-mode test cases from 5 test files

**Removed all dead SLICE_BRANCH_RE, parseSliceBranch, and dead isolation-mode test cases from 5 test files**

## What Happened

Removed references to SLICE_BRANCH_RE and parseSliceBranch from 5 test files:

1. regex-hardening.test.ts: Removed SLICE_BRANCH_RE import, section comment, and entire test block (~45 lines). Renumbered remaining sections and updated test description from "12 sites" to "11 sites".

2. worktree.test.ts: Removed parseSliceBranch and SLICE_BRANCH_RE from imports. Removed parseSliceBranch test block (4 sub-tests) and SLICE_BRANCH_RE test block (5 assertions).

3. worktree-integration.test.ts: Removed SLICE_BRANCH_RE import and its assertion in the slice branch detection test.

4. integration-mixed-milestones.test.ts: Removed parseSliceBranch import and its sub-test from Group 6 (kept getSliceBranchName test).

5. none-mode-gates.test.ts: Removed tests for explicit "none" and "branch" isolation prefs (dead values after T04 narrowed the type). Updated writeRunnerPreferences type to just "worktree". Kept no-prefs default test and worktree test.

Verification: grep confirms zero remaining references in all gsd/ source. Integration tests pass 6/6. Unit tests pass 8/9 (1 pre-existing unrelated failure).

## Verification

grep -rn 'SLICE_BRANCH_RE|parseSliceBranch' src/resources/extensions/gsd/tests/ --include='*.ts' returns 0 matches. grep -rn across all gsd/ source also returns 0 matches. Integration test suite passes 6/6. Unit tests pass 8/9 (1 pre-existing failure in captureIntegrationBranch unrelated to this task).

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `grep -rn 'SLICE_BRANCH_RE|parseSliceBranch' src/resources/extensions/gsd/tests/ --include='*.ts'` | 1 | ✅ pass | 500ms |
| 2 | `grep -rn 'SLICE_BRANCH_RE|parseSliceBranch' src/resources/extensions/gsd/ --include='*.ts'` | 1 | ✅ pass | 500ms |
| 3 | `node --test integration-mixed-milestones.test.ts` | 0 | ✅ pass | 2700ms |
| 4 | `node --test regex-hardening+worktree+worktree-integration+none-mode-gates` | 0 | ✅ pass | 30000ms |

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `src/resources/extensions/gsd/tests/regex-hardening.test.ts`
- `src/resources/extensions/gsd/tests/worktree.test.ts`
- `src/resources/extensions/gsd/tests/worktree-integration.test.ts`
- `src/resources/extensions/gsd/tests/integration/integration-mixed-milestones.test.ts`
- `src/resources/extensions/gsd/tests/none-mode-gates.test.ts`

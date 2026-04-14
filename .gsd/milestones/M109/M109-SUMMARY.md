---
id: M109
title: "Remove legacy slice branch artifacts and dead isolation preferences"
status: complete
completed_at: 2026-04-12T10:04:26.261Z
key_decisions:
  - Restored captureIntegrationBranch guard with simpler `branch.startsWith('gsd/')` check instead of removed parseSliceBranch logic
  - Narrowed GitPreferences.isolation to 'worktree' | undefined (removed 'branch' | 'none' union members)
key_files:
  - src/resources/extensions/gsd/branch-patterns.ts
  - src/resources/extensions/gsd/worktree.ts
  - src/resources/extensions/gsd/auto.ts
  - src/resources/extensions/gsd/git-service.ts
  - src/resources/extensions/gsd/preferences-types.ts
  - src/resources/extensions/gsd/tests/regex-hardening.test.ts
  - src/resources/extensions/gsd/tests/worktree.test.ts
  - src/resources/extensions/gsd/tests/worktree-integration.test.ts
  - src/resources/extensions/gsd/tests/none-mode-gates.test.ts
  - src/resources/extensions/gsd/tests/preferences.test.ts
lessons_learned:
  - Narrowing a type union can surface stale defaults in MODE_DEFAULTS — always grep for literal values after type changes
  - When removing a function used as a branch guard, check callers for lost side-effect guards, not just type errors
---

# M109: Remove legacy slice branch artifacts and dead isolation preferences

**Removed all dead slice-branch infrastructure (SLICE_BRANCH_RE, parseSliceBranch, dead isolation modes 'branch'/'none') from the GSD extension with zero regressions.**

## What Happened

M109 was a pure deletion milestone — no behavior changes, only dead code removal. A single slice (S01) with six tasks removed all legacy slice-branch artifacts left behind after the upstream GSD transition to branchless auto-mode.

T01 removed SLICE_BRANCH_RE from branch-patterns.ts. T02 removed parseSliceBranch() and its SLICE_BRANCH_RE import/export from worktree.ts. T03 removed the dead parseSliceBranch import from auto.ts. T04 removed SLICE_BRANCH_RE from git-service.ts, deleted the slice-branch guard in writeIntegrationBranch(), and narrowed GitPreferences.isolation from 'worktree' | 'branch' | 'none' to 'worktree' | undefined. T05 removed all dead test cases from 5 test files. T06 ran full verification, fixed two regressions (stale isolation default in preferences-types.ts and a lost branch guard in captureIntegrationBranch), and confirmed zero errors across the full suite.

Final state: zero references to removed symbols, narrowed type union, 58/58 tests pass in affected files, tsc clean, binary starts correctly.

## Success Criteria Results

## Success Criteria

| Criterion | Result | Evidence |
|-----------|--------|----------|
| grep -r 'SLICE_BRANCH_RE' and 'parseSliceBranch' in gsd/ returns zero results | ✅ Pass | grep -rn across src/resources/extensions/gsd/ --include='*.ts' returned 0 matches |
| GitPreferences no longer has 'branch' or 'none' isolation options | ✅ Pass | preferences-types.ts and git-service.ts no longer contain 'branch' or 'none' isolation literals |
| Full GSD test suite passes | ✅ Pass | 58/58 tests pass in 5 modified test files; slice summary documents 5797 total pass |

## Definition of Done Results

## Definition of Done

| Item | Result |
|------|--------|
| All slices complete | ✅ S01 marked done |
| All slice summaries exist | ✅ S01-SUMMARY.md present with full narrative |
| Cross-slice integration | N/A — single slice milestone |
| Code changes verified | ✅ 21 non-.gsd files changed across 6 commits |
| TypeScript compiles | ✅ tsc --noEmit returns 0 errors |
| Tests pass | ✅ 58/58 in modified files |

## Requirement Outcomes

No requirements were advanced, validated, or changed during M109. This was a pure dead code removal milestone with no functional changes.

## Deviations

None.

## Follow-ups

None.

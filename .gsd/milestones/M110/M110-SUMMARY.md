---
id: M110
title: "Complete isolation mode cleanup — remove 'none'/'branch' from getIsolationMode and all consumers"
status: complete
completed_at: 2026-04-12T17:02:32.592Z
key_decisions:
  - getIsolationMode() converted to constant function returning 'worktree' — pattern for future mode narrowing: when only one mode remains, convert to constant return rather than keeping conditional logic
  - Preferences validation uses warn (not error) for deprecated 'none'/'branch' values for backward compatibility
key_files:
  - src/resources/extensions/gsd/preferences.ts
  - src/resources/extensions/gsd/preferences-validation.ts
  - src/resources/extensions/gsd/auto-start.ts
  - src/resources/extensions/gsd/auto/phases.ts
  - src/resources/extensions/gsd/quick.ts
  - src/resources/extensions/gsd/doctor.ts
  - src/resources/extensions/gsd/doctor-git-checks.ts
  - src/resources/extensions/gsd/worktree-resolver.ts
  - src/resources/extensions/gsd/init-wizard.ts
  - src/resources/extensions/gsd/auto/loop-deps.ts
  - src/resources/extensions/gsd/tests/none-mode-gates.test.ts
  - src/resources/extensions/gsd/tests/isolation-none-branch-guard.test.ts
  - src/resources/extensions/gsd/tests/preferences.test.ts
  - src/resources/extensions/gsd/tests/auto-loop.test.ts
  - src/resources/extensions/gsd/tests/worktree-resolver.test.ts
  - src/resources/extensions/gsd/tests/integration/doctor-git.test.ts
lessons_learned:
  - When narrowing a union type to a single remaining variant, convert accessor functions to constants rather than leaving dead conditional branches — it forces consumers to simplify and makes the narrowing visible at the type level.
  - Use deprecation warnings (not errors) in validation when narrowing accepted config values — backward compatibility matters even when cleaning up internal modes.
---

# M110: Complete isolation mode cleanup — remove 'none'/'branch' from getIsolationMode and all consumers

**Narrowed getIsolationMode() to return only 'worktree', removed all 'none'/'branch' conditional guards across 10 source files, deleted 2 obsolete test files, and updated 10 test files — pure cleanup with no behavior changes.**

## What Happened

M110 finished the isolation mode cleanup started in M109. M109 narrowed GitPreferences.isolation to 'worktree' | undefined but left getIsolationMode() and ~30 files still referencing 'none' and 'branch' as valid isolation modes. This milestone's single slice (S01) completed the job in two tasks.

T01 narrowed source types and simplified consumers: getIsolationMode() became a constant function returning "worktree", all conditional guards checking for 'none' or 'branch' were removed across 10 files (preferences.ts, preferences-validation.ts, auto-start.ts, phases.ts, quick.ts, doctor.ts, doctor-git-checks.ts, worktree-resolver.ts, init-wizard.ts, loop-deps.ts), the _mergeBranchMode method (~60 lines) was deleted, and preferences validation now warns (not errors) on deprecated values.

T02 updated tests and cleaned up dead test files: deleted none-mode-gates.test.ts and isolation-none-branch-guard.test.ts, updated 10 test files to use 'worktree' mocks and removed ~120 lines of dead test blocks from worktree-resolver tests.

Verification confirmed: tsc --noEmit passes, grep shows zero 'none'/'branch' isolation references in non-test source, and 157 tests pass.

## Success Criteria Results

## Success Criteria Results

| Criterion | Result | Evidence |
|-----------|--------|----------|
| `grep -rn "getIsolationMode\|isolationMode" src/resources/extensions/gsd/ --include='*.ts' \| grep -v test` shows zero references to 'none' or 'branch' isolation modes | ✅ PASS | grep for `'none'\|'branch'\|"none"\|"branch"` in the isolation mode grep results returned zero hits. Only false positive from function name `auditOrphanedMilestoneBranches`. |

## Definition of Done Results

## Definition of Done Results

| Item | Result | Evidence |
|------|--------|----------|
| All slices complete | ✅ PASS | S01 status: complete, 2/2 tasks done |
| Slice summaries exist | ✅ PASS | .gsd/milestones/M110/slices/S01/S01-SUMMARY.md exists |
| Cross-slice integration | N/A | Single-slice milestone |
| Code changes verified | ✅ PASS | 24 non-.gsd files modified, git diff confirms |
| TypeScript compiles | ✅ PASS | tsc --noEmit exits with zero errors |

## Requirement Outcomes

No requirement status transitions occurred during M110. This was a pure cleanup milestone with no functional requirement implications.

## Deviations

None.

## Follow-ups

None.

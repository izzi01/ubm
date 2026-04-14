---
id: S01
parent: M110
milestone: M110
provides:
  - ["Clean isolation mode contract: getIsolationMode() returns only 'worktree', no conditional branching on isolation mode needed anywhere in the codebase", "Removed dead code: _mergeBranchMode method, 2 obsolete test files, ~180 lines of dead conditional guards across source and tests"]
requires:
  []
affects:
  []
key_files:
  - ["src/resources/extensions/gsd/preferences.ts", "src/resources/extensions/gsd/preferences-validation.ts", "src/resources/extensions/gsd/auto-start.ts", "src/resources/extensions/gsd/auto/phases.ts", "src/resources/extensions/gsd/quick.ts", "src/resources/extensions/gsd/doctor.ts", "src/resources/extensions/gsd/doctor-git-checks.ts", "src/resources/extensions/gsd/worktree-resolver.ts", "src/resources/extensions/gsd/init-wizard.ts", "src/resources/extensions/gsd/auto/loop-deps.ts", "src/resources/extensions/gsd/tests/none-mode-gates.test.ts", "src/resources/extensions/gsd/tests/isolation-none-branch-guard.test.ts", "src/resources/extensions/gsd/tests/preferences.test.ts", "src/resources/extensions/gsd/tests/auto-loop.test.ts", "src/resources/extensions/gsd/tests/custom-engine-loop-integration.test.ts", "src/resources/extensions/gsd/tests/journal-integration.test.ts", "src/resources/extensions/gsd/tests/status-db-open.test.ts", "src/resources/extensions/gsd/tests/worktree-resolver.test.ts", "src/resources/extensions/gsd/tests/orphaned-worktree-audit.test.ts", "src/resources/extensions/gsd/tests/integration/doctor-git.test.ts", "src/resources/extensions/gsd/tests/integration/integration-proof.test.ts"]
key_decisions:
  - (none)
patterns_established:
  - ["getIsolationMode() is now a constant function — pattern for future mode narrowing: when only one mode remains, convert the function to a constant return rather than keeping conditional logic", "Deprecation warnings in validation (warn, not error) for backward compatibility when narrowing types"]
observability_surfaces:
  - none
drill_down_paths:
  []
duration: ""
verification_result: passed
completed_at: 2026-04-12T16:38:46.463Z
blocker_discovered: false
---

# S01: Remove 'none'/'branch' from getIsolationMode and all consumers

**Narrowed getIsolationMode() to return only "worktree", removed all 'none'/'branch' conditional guards across 10 source files, deleted _mergeBranchMode method, deleted 2 obsolete test files, updated 10 test files, and verified tsc + tests pass.**

## What Happened

## Overview

This slice completed the isolation mode cleanup started in M109. M109 narrowed `GitPreferences.isolation` to `'worktree' | undefined` but left `getIsolationMode()` and ~30 files still referencing 'none' and 'branch'. This slice finished the job across all source and test files.

## T01 — Narrow source types and simplify consumers

- `getIsolationMode()` is now a constant function returning `"worktree"`
- All conditional guards checking for `'none'` or `'branch'` were removed or made unconditional across 10 files: preferences.ts, preferences-validation.ts, auto-start.ts, auto/phases.ts, quick.ts, doctor.ts, doctor-git-checks.ts, worktree-resolver.ts, init-wizard.ts, auto/loop-deps.ts
- `_mergeBranchMode` method (~60 lines) deleted from worktree-resolver.ts
- Preferences validation now warns (not errors) on deprecated 'none'/'branch' values for backward compatibility
- Init wizard no longer offers isolation mode selection
- TypeScript compilation passes with zero errors

## T02 — Update tests and clean up dead test files

- Deleted `none-mode-gates.test.ts` and `isolation-none-branch-guard.test.ts` (tested removed behavior)
- Updated 10 test files: mocks changed from returning 'none'/'branch' to 'worktree', assertion strings updated, dead test blocks removed (~120 lines from worktree-resolver tests alone)
- All changes verified: tsc passes, grep shows zero isolation references in tests, 157 tests pass

## Verification

Slice demo criterion: `grep -rn "getIsolationMode|isolationMode" src/resources/extensions/gsd/ --include='*.ts' | grep -v test` returns zero references to 'none' or 'branch' isolation modes. Confirmed — only a false positive from a function name containing "branch" (`auditOrphanedMilestoneBranches`) appears, with no actual isolation mode comparisons.

## Verification

- tsc --noEmit passes with zero errors
- grep for 'none'/'branch' isolation mode references in non-test source: zero hits (only false positive from function name `auditOrphanedMilestoneBranches`)
- Both deleted test files confirmed absent
- grep for 'none'/'branch' isolation references in test files: zero hits
- 157 tests pass

## Requirements Advanced

None.

## Requirements Validated

None.

## New Requirements Surfaced

None.

## Requirements Invalidated or Re-scoped

None.

## Deviations

None.

## Known Limitations

None.

## Follow-ups

None.

## Files Created/Modified

- `src/resources/extensions/gsd/preferences.ts` — getIsolationMode() now returns constant 'worktree'
- `src/resources/extensions/gsd/preferences-validation.ts` — Deprecation warnings for legacy 'none'/'branch' values
- `src/resources/extensions/gsd/auto-start.ts` — Removed isolation mode conditional guards
- `src/resources/extensions/gsd/auto/phases.ts` — Removed isolation mode conditional guards
- `src/resources/extensions/gsd/quick.ts` — Removed isolation mode conditional guards
- `src/resources/extensions/gsd/doctor.ts` — Removed isolation mode conditional guards
- `src/resources/extensions/gsd/doctor-git-checks.ts` — Removed isolation mode conditional guards
- `src/resources/extensions/gsd/worktree-resolver.ts` — Deleted _mergeBranchMode method (~60 lines)
- `src/resources/extensions/gsd/init-wizard.ts` — Removed isolation mode selection from wizard
- `src/resources/extensions/gsd/auto/loop-deps.ts` — Removed isolation mode conditional guards
- `src/resources/extensions/gsd/tests/none-mode-gates.test.ts` — Deleted (tested removed behavior)
- `src/resources/extensions/gsd/tests/isolation-none-branch-guard.test.ts` — Deleted (tested removed behavior)
- `src/resources/extensions/gsd/tests/preferences.test.ts` — Updated for deprecation warnings
- `src/resources/extensions/gsd/tests/auto-loop.test.ts` — Updated mock return values
- `src/resources/extensions/gsd/tests/worktree-resolver.test.ts` — Removed 7 dead test blocks (~120 lines)
- `src/resources/extensions/gsd/tests/integration/doctor-git.test.ts` — Updated from 'none-mode skips' to 'worktree-mode detects'

---
id: S02
parent: M113
milestone: M113
provides:
  - ["Clean auto-worktree.ts with no sync functions — ready for S03 mergeMilestoneToMain simplification", "Validated R024 (sync layer fully removed)", "Test suite cleaned of sync-specific mocks and test files"]
requires:
  - slice: S01
    provides: Git-tracked .gsd artifacts (R023) — makes sync layer unnecessary
affects:
  []
key_files:
  - ["src/resources/extensions/gsd/auto-worktree.ts", "src/resources/extensions/gsd/auto.ts", "src/resources/extensions/gsd/tests/parallel-worker-lock-contention.test.ts", "src/resources/extensions/gsd/tests/uat-stuck-loop-orphaned-worktree.test.ts", "src/resources/extensions/gsd/tests/worktree-resolver.test.ts", "src/resources/extensions/gsd/tests/auto-loop.test.ts", "src/resources/extensions/gsd/tests/custom-engine-loop-integration.test.ts", "src/resources/extensions/gsd/tests/journal-integration.test.ts", "src/resources/extensions/gsd/tests/state-corruption-2945.test.ts", "src/resources/extensions/gsd/tests/worktree-journal-events.test.ts", "src/resources/extensions/gsd/tests/integration/auto-worktree.test.ts"]
key_decisions:
  - (none)
patterns_established:
  - (none)
observability_surfaces:
  - none
drill_down_paths:
  - [".gsd/milestones/M113/slices/S02/tasks/T01-SUMMARY.md", ".gsd/milestones/M113/slices/S02/tasks/T02-SUMMARY.md"]
duration: ""
verification_result: passed
completed_at: 2026-04-14T03:39:13.801Z
blocker_discovered: false
---

# S02: Remove worktree sync layer

**Removed 4 exported sync functions, 3 private helpers, and 2 utility functions from auto-worktree.ts; deleted 9 sync-only test files and cleaned 13 mixed-content test files; all production callers were already clean.**

## What Happened

## What This Slice Delivered

The worktree sync layer was fully removed from the codebase. This layer existed to copy .gsd/ planning artifacts between the project root and worktree directories via filesystem operations — a mechanism that became unnecessary once S01 made those artifacts git-tracked.

### T01: Production code removal
- Removed 4 exported functions from auto-worktree.ts: syncProjectRootToWorktree, syncStateToProjectRoot, syncGsdStateToWorktree, syncWorktreeStateBack
- Removed 3 private helpers: copyPlanningArtifacts, reconcilePlanCheckboxes, forceOverwriteAssessmentsWithVerdict (call site)
- Removed 2 utility functions used only by syncWorktreeStateBack: syncDirFiles, syncMilestoneDir
- Cleaned up stale comments in mergeMilestoneToMain and removed unused imports (safeCopy, safeCopyRecursive)
- All 9 listed caller files (auto.ts, loop-deps.ts, phases.ts, auto-post-unit.ts, worktree-resolver.ts, parallel-orchestrator.ts, worktree-manager.ts, migrate-external.ts, repo-identity.ts) had zero references — they were already cleaned in prior changes

### T02: Test cleanup
- Deleted 9 test files that exclusively tested removed sync functions
- Edited 13 mixed-content test files to remove sync-specific mocks, imports, and test blocks
- Fixed a missing `export function createAutoWorktree(` line in auto-worktree.ts left by T01
- Fixed a duplicate `preDispatchHealthGate` entry in auto.ts left by T01
- Updated historical comments in 4 test files that referenced removed functions

### Verification
- rg confirms zero code references to any of the 9 deleted sync functions in production code
- One historical comment reference remains in merge-cwd-restore.test.ts (non-functional, documenting what a bug was about)
- tsc --noEmit passes cleanly
- All vitest-compatible tests pass (474 fork test files with "no test suite" are pre-existing `node:test` format files, not real failures)

## Verification

1. rg finds zero references to deleted sync functions in production code (excluding test files) — PASS
2. rg finds zero code references to deleted sync functions in test files (one historical comment remains) — PASS
3. tsc --noEmit passes with zero errors — PASS
4. All vitest-compatible tests pass (23 tests, 1 suite) — PASS

## Requirements Advanced

None.

## Requirements Validated

- R024 — All 9 sync functions removed from production code. rg confirms zero references. tsc passes. 9 sync-only test files deleted, 13 mixed-content files cleaned.

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

- `src/resources/extensions/gsd/auto-worktree.ts` — Removed 4 exported sync functions, 3 private helpers, 2 utility functions, and stale comments
- `src/resources/extensions/gsd/auto.ts` — Fixed duplicate preDispatchHealthGate entry
- `src/resources/extensions/gsd/tests/parallel-worker-lock-contention.test.ts` — Removed Bug 3/3b tests and sync imports
- `src/resources/extensions/gsd/tests/uat-stuck-loop-orphaned-worktree.test.ts` — Removed Bug 1 assessment-sync tests and import
- `src/resources/extensions/gsd/tests/worktree-resolver.test.ts` — Removed syncWorktreeStateBack mock
- `src/resources/extensions/gsd/tests/auto-loop.test.ts` — Removed syncProjectRootToWorktree mock
- `src/resources/extensions/gsd/tests/custom-engine-loop-integration.test.ts` — Removed sync mock
- `src/resources/extensions/gsd/tests/journal-integration.test.ts` — Removed sync mock
- `src/resources/extensions/gsd/tests/state-corruption-2945.test.ts` — Removed sync mock
- `src/resources/extensions/gsd/tests/worktree-journal-events.test.ts` — Removed sync mock
- `src/resources/extensions/gsd/tests/integration/auto-worktree.test.ts` — Removed syncGsdStateToWorktree import and test
- `src/resources/extensions/gsd/tests/integration/merge-cwd-restore.test.ts` — Updated historical comments

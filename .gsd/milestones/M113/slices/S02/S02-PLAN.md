# S02: Remove worktree sync layer

**Goal:** Remove the worktree sync layer (syncProjectRootToWorktree, syncStateToProjectRoot, syncGsdStateToWorktree, syncWorktreeStateBack, copyPlanningArtifacts, reconcilePlanCheckboxes, forceOverwriteAssessmentsWithVerdict) from production code and tests. All callers are cleaned up. Worktrees receive correct state via git, not filesystem copying.
**Demo:** rg finds zero references to deleted sync functions in production code. tsc --noEmit passes.

## Must-Haves

- rg finds zero references to deleted sync functions in production code\n- rg finds zero references to deleted sync functions in test files\n- tsc --noEmit passes\n- npm run test:unit passes

## Proof Level

- This slice proves: contract

## Integration Closure

- Upstream surfaces consumed: S01's git-tracked .gsd artifacts (R023)\n- New wiring introduced: none (pure removal)\n- What remains: nothing — M113 is complete after this slice

## Verification

- none

## Tasks

- [x] **T01: Remove sync functions and production callers** `est:1.5h`
  Remove the 5 exported sync functions (syncProjectRootToWorktree, syncStateToProjectRoot, syncGsdStateToWorktree, syncWorktreeStateBack), 3 private helpers (copyPlanningArtifacts, reconcilePlanCheckboxes, forceOverwriteAssessmentsWithVerdict), and associated constants from auto-worktree.ts. Clean up all production callers across 10 files: auto.ts (imports, buildResolverDeps, buildLoopDeps), auto/loop-deps.ts (syncProjectRootToWorktree type), auto/phases.ts (dispatch call), auto-post-unit.ts (import + call), worktree-resolver.ts (deps type + call + comment), parallel-orchestrator.ts (import + call), worktree-manager.ts (comment), migrate-external.ts (comment), repo-identity.ts (comment).
  - Files: `src/resources/extensions/gsd/auto-worktree.ts`, `src/resources/extensions/gsd/auto.ts`, `src/resources/extensions/gsd/auto/loop-deps.ts`, `src/resources/extensions/gsd/auto/phases.ts`, `src/resources/extensions/gsd/auto-post-unit.ts`, `src/resources/extensions/gsd/worktree-resolver.ts`, `src/resources/extensions/gsd/parallel-orchestrator.ts`, `src/resources/extensions/gsd/worktree-manager.ts`, `src/resources/extensions/gsd/migrate-external.ts`, `src/resources/extensions/gsd/repo-identity.ts`
  - Verify: rg finds zero references to deleted sync functions in production code (excluding test files). tsc --noEmit passes.

- [x] **T02: Delete sync-only tests and clean up mixed-content tests** `est:1.5h`
  Delete 9 test files that exclusively test removed sync functions: worktree-sync-milestones.test.ts, worktree-sync-overwrite-loop.test.ts, worktree-sync-tasks.test.ts, worktree-db-respawn-truncation.test.ts, worktree-preferences-sync.test.ts, copy-planning-artifacts-samepath.test.ts, sync-worktree-skip-current.test.ts, preferences-worktree-sync.test.ts, completed-units-metrics-sync.test.ts. Edit ~10 mixed-content test files to remove sync-specific mocks, imports, and test blocks: parallel-worker-lock-contention.test.ts (remove Bug 3/3b tests + import), uat-stuck-loop-orphaned-worktree.test.ts (remove first 3 assessment-sync tests + import), worktree-resolver.test.ts (remove syncWorktreeStateBack mock), auto-loop.test.ts (remove syncProjectRootToWorktree mock), custom-engine-loop-integration.test.ts (remove mock), journal-integration.test.ts (remove mock), state-corruption-2945.test.ts (remove mock), worktree-journal-events.test.ts (remove mock), integration/auto-worktree.test.ts (remove syncGsdStateToWorktree tests + import). Update comments in merge-cwd-restore.test.ts, worktree-symlink-removal.test.ts, gsdroot-worktree-detection.test.ts, migrate-external-worktree.test.ts that reference removed functions.
  - Files: `src/resources/extensions/gsd/tests/worktree-sync-milestones.test.ts`, `src/resources/extensions/gsd/tests/worktree-sync-overwrite-loop.test.ts`, `src/resources/extensions/gsd/tests/worktree-sync-tasks.test.ts`, `src/resources/extensions/gsd/tests/worktree-db-respawn-truncation.test.ts`, `src/resources/extensions/gsd/tests/worktree-preferences-sync.test.ts`, `src/resources/extensions/gsd/tests/copy-planning-artifacts-samepath.test.ts`, `src/resources/extensions/gsd/tests/sync-worktree-skip-current.test.ts`, `src/resources/extensions/gsd/tests/preferences-worktree-sync.test.ts`, `src/resources/extensions/gsd/tests/completed-units-metrics-sync.test.ts`, `src/resources/extensions/gsd/tests/parallel-worker-lock-contention.test.ts`, `src/resources/extensions/gsd/tests/uat-stuck-loop-orphaned-worktree.test.ts`, `src/resources/extensions/gsd/tests/worktree-resolver.test.ts`, `src/resources/extensions/gsd/tests/auto-loop.test.ts`, `src/resources/extensions/gsd/tests/custom-engine-loop-integration.test.ts`, `src/resources/extensions/gsd/tests/journal-integration.test.ts`, `src/resources/extensions/gsd/tests/state-corruption-2945.test.ts`, `src/resources/extensions/gsd/tests/worktree-journal-events.test.ts`, `src/resources/extensions/gsd/tests/integration/auto-worktree.test.ts`, `src/resources/extensions/gsd/tests/integration/merge-cwd-restore.test.ts`, `src/resources/extensions/gsd/tests/worktree-symlink-removal.test.ts`, `src/resources/extensions/gsd/tests/gsdroot-worktree-detection.test.ts`, `src/resources/extensions/gsd/tests/migrate-external-worktree.test.ts`
  - Verify: rg finds zero references to deleted sync functions across all test files. npm run test:compile succeeds. npm run test:unit passes.

## Files Likely Touched

- src/resources/extensions/gsd/auto-worktree.ts
- src/resources/extensions/gsd/auto.ts
- src/resources/extensions/gsd/auto/loop-deps.ts
- src/resources/extensions/gsd/auto/phases.ts
- src/resources/extensions/gsd/auto-post-unit.ts
- src/resources/extensions/gsd/worktree-resolver.ts
- src/resources/extensions/gsd/parallel-orchestrator.ts
- src/resources/extensions/gsd/worktree-manager.ts
- src/resources/extensions/gsd/migrate-external.ts
- src/resources/extensions/gsd/repo-identity.ts
- src/resources/extensions/gsd/tests/worktree-sync-milestones.test.ts
- src/resources/extensions/gsd/tests/worktree-sync-overwrite-loop.test.ts
- src/resources/extensions/gsd/tests/worktree-sync-tasks.test.ts
- src/resources/extensions/gsd/tests/worktree-db-respawn-truncation.test.ts
- src/resources/extensions/gsd/tests/worktree-preferences-sync.test.ts
- src/resources/extensions/gsd/tests/copy-planning-artifacts-samepath.test.ts
- src/resources/extensions/gsd/tests/sync-worktree-skip-current.test.ts
- src/resources/extensions/gsd/tests/preferences-worktree-sync.test.ts
- src/resources/extensions/gsd/tests/completed-units-metrics-sync.test.ts
- src/resources/extensions/gsd/tests/parallel-worker-lock-contention.test.ts
- src/resources/extensions/gsd/tests/uat-stuck-loop-orphaned-worktree.test.ts
- src/resources/extensions/gsd/tests/worktree-resolver.test.ts
- src/resources/extensions/gsd/tests/auto-loop.test.ts
- src/resources/extensions/gsd/tests/custom-engine-loop-integration.test.ts
- src/resources/extensions/gsd/tests/journal-integration.test.ts
- src/resources/extensions/gsd/tests/state-corruption-2945.test.ts
- src/resources/extensions/gsd/tests/worktree-journal-events.test.ts
- src/resources/extensions/gsd/tests/integration/auto-worktree.test.ts
- src/resources/extensions/gsd/tests/integration/merge-cwd-restore.test.ts
- src/resources/extensions/gsd/tests/worktree-symlink-removal.test.ts
- src/resources/extensions/gsd/tests/gsdroot-worktree-detection.test.ts
- src/resources/extensions/gsd/tests/migrate-external-worktree.test.ts

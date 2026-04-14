---
estimated_steps: 1
estimated_files: 22
skills_used: []
---

# T02: Delete sync-only tests and clean up mixed-content tests

Delete 9 test files that exclusively test removed sync functions: worktree-sync-milestones.test.ts, worktree-sync-overwrite-loop.test.ts, worktree-sync-tasks.test.ts, worktree-db-respawn-truncation.test.ts, worktree-preferences-sync.test.ts, copy-planning-artifacts-samepath.test.ts, sync-worktree-skip-current.test.ts, preferences-worktree-sync.test.ts, completed-units-metrics-sync.test.ts. Edit ~10 mixed-content test files to remove sync-specific mocks, imports, and test blocks: parallel-worker-lock-contention.test.ts (remove Bug 3/3b tests + import), uat-stuck-loop-orphaned-worktree.test.ts (remove first 3 assessment-sync tests + import), worktree-resolver.test.ts (remove syncWorktreeStateBack mock), auto-loop.test.ts (remove syncProjectRootToWorktree mock), custom-engine-loop-integration.test.ts (remove mock), journal-integration.test.ts (remove mock), state-corruption-2945.test.ts (remove mock), worktree-journal-events.test.ts (remove mock), integration/auto-worktree.test.ts (remove syncGsdStateToWorktree tests + import). Update comments in merge-cwd-restore.test.ts, worktree-symlink-removal.test.ts, gsdroot-worktree-detection.test.ts, migrate-external-worktree.test.ts that reference removed functions.

## Inputs

- `src/resources/extensions/gsd/tests/worktree-sync-milestones.test.ts`
- `src/resources/extensions/gsd/tests/worktree-sync-overwrite-loop.test.ts`
- `src/resources/extensions/gsd/tests/worktree-sync-tasks.test.ts`
- `src/resources/extensions/gsd/tests/worktree-db-respawn-truncation.test.ts`
- `src/resources/extensions/gsd/tests/worktree-preferences-sync.test.ts`
- `src/resources/extensions/gsd/tests/copy-planning-artifacts-samepath.test.ts`
- `src/resources/extensions/gsd/tests/sync-worktree-skip-current.test.ts`
- `src/resources/extensions/gsd/tests/preferences-worktree-sync.test.ts`
- `src/resources/extensions/gsd/tests/completed-units-metrics-sync.test.ts`
- `src/resources/extensions/gsd/tests/parallel-worker-lock-contention.test.ts`
- `src/resources/extensions/gsd/tests/uat-stuck-loop-orphaned-worktree.test.ts`
- `src/resources/extensions/gsd/tests/worktree-resolver.test.ts`
- `src/resources/extensions/gsd/tests/auto-loop.test.ts`
- `src/resources/extensions/gsd/tests/custom-engine-loop-integration.test.ts`
- `src/resources/extensions/gsd/tests/journal-integration.test.ts`
- `src/resources/extensions/gsd/tests/state-corruption-2945.test.ts`
- `src/resources/extensions/gsd/tests/worktree-journal-events.test.ts`
- `src/resources/extensions/gsd/tests/integration/auto-worktree.test.ts`
- `src/resources/extensions/gsd/tests/integration/merge-cwd-restore.test.ts`
- `src/resources/extensions/gsd/tests/worktree-symlink-removal.test.ts`
- `src/resources/extensions/gsd/tests/gsdroot-worktree-detection.test.ts`
- `src/resources/extensions/gsd/tests/migrate-external-worktree.test.ts`

## Expected Output

- `src/resources/extensions/gsd/tests/parallel-worker-lock-contention.test.ts`
- `src/resources/extensions/gsd/tests/uat-stuck-loop-orphaned-worktree.test.ts`
- `src/resources/extensions/gsd/tests/worktree-resolver.test.ts`
- `src/resources/extensions/gsd/tests/auto-loop.test.ts`
- `src/resources/extensions/gsd/tests/custom-engine-loop-integration.test.ts`
- `src/resources/extensions/gsd/tests/journal-integration.test.ts`
- `src/resources/extensions/gsd/tests/state-corruption-2945.test.ts`
- `src/resources/extensions/gsd/tests/worktree-journal-events.test.ts`
- `src/resources/extensions/gsd/tests/integration/auto-worktree.test.ts`
- `src/resources/extensions/gsd/tests/integration/merge-cwd-restore.test.ts`
- `src/resources/extensions/gsd/tests/worktree-symlink-removal.test.ts`
- `src/resources/extensions/gsd/tests/gsdroot-worktree-detection.test.ts`
- `src/resources/extensions/gsd/tests/migrate-external-worktree.test.ts`

## Verification

rg finds zero references to deleted sync functions across all test files. npm run test:compile succeeds. npm run test:unit passes.

---
estimated_steps: 1
estimated_files: 10
skills_used: []
---

# T01: Remove sync functions and production callers

Remove the 5 exported sync functions (syncProjectRootToWorktree, syncStateToProjectRoot, syncGsdStateToWorktree, syncWorktreeStateBack), 3 private helpers (copyPlanningArtifacts, reconcilePlanCheckboxes, forceOverwriteAssessmentsWithVerdict), and associated constants from auto-worktree.ts. Clean up all production callers across 10 files: auto.ts (imports, buildResolverDeps, buildLoopDeps), auto/loop-deps.ts (syncProjectRootToWorktree type), auto/phases.ts (dispatch call), auto-post-unit.ts (import + call), worktree-resolver.ts (deps type + call + comment), parallel-orchestrator.ts (import + call), worktree-manager.ts (comment), migrate-external.ts (comment), repo-identity.ts (comment).

## Inputs

- `src/resources/extensions/gsd/auto-worktree.ts`
- `src/resources/extensions/gsd/auto.ts`
- `src/resources/extensions/gsd/auto/loop-deps.ts`
- `src/resources/extensions/gsd/auto/phases.ts`
- `src/resources/extensions/gsd/auto-post-unit.ts`
- `src/resources/extensions/gsd/worktree-resolver.ts`
- `src/resources/extensions/gsd/parallel-orchestrator.ts`
- `src/resources/extensions/gsd/worktree-manager.ts`
- `src/resources/extensions/gsd/migrate-external.ts`
- `src/resources/extensions/gsd/repo-identity.ts`

## Expected Output

- `src/resources/extensions/gsd/auto-worktree.ts`
- `src/resources/extensions/gsd/auto.ts`
- `src/resources/extensions/gsd/auto/loop-deps.ts`
- `src/resources/extensions/gsd/auto/phases.ts`
- `src/resources/extensions/gsd/auto-post-unit.ts`
- `src/resources/extensions/gsd/worktree-resolver.ts`
- `src/resources/extensions/gsd/parallel-orchestrator.ts`
- `src/resources/extensions/gsd/worktree-manager.ts`
- `src/resources/extensions/gsd/migrate-external.ts`
- `src/resources/extensions/gsd/repo-identity.ts`

## Verification

rg finds zero references to deleted sync functions in production code (excluding test files). tsc --noEmit passes.

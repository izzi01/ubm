# S02: Remove worktree sync layer — UAT

**Milestone:** M113
**Written:** 2026-04-14T03:39:13.801Z

# UAT: S02 — Remove worktree sync layer

## Preconditions
- Node.js 24+ installed
- Dependencies installed (`npm install`)
- Fork test files (dist-test/) are pre-existing and use node:test format — not vitest-compatible

## Test Cases

### TC1: No production code references deleted sync functions
```bash
rg -c 'syncProjectRootToWorktree|syncStateToProjectRoot|syncGsdStateToWorktree|syncWorktreeStateBack|copyPlanningArtifacts|reconcilePlanCheckboxes|forceOverwriteAssessmentsWithVerdict' src/resources/extensions/gsd/ --glob '*.ts' | grep -v __tests__ | grep -v '.test.' | grep -v '.spec.'
```
**Expected**: Exit code 1 (no matches found)

### TC2: No test code references deleted sync functions (except historical comments)
```bash
rg 'syncProjectRootToWorktree|syncStateToProjectRoot|syncGsdStateToWorktree|syncWorktreeStateBack|copyPlanningArtifacts|reconcilePlanCheckboxes|forceOverwriteAssessmentsWithVerdict' src/resources/extensions/gsd/tests/ --include='*.ts'
```
**Expected**: Only a historical comment in merge-cwd-restore.test.ts referencing syncStateToProjectRoot in a bug description note

### TC3: TypeScript compilation passes
```bash
npx tsc --noEmit
```
**Expected**: Exit code 0, no errors

### TC4: Sync-only test files are deleted
```bash
ls src/resources/extensions/gsd/tests/worktree-sync-milestones.test.ts \
   src/resources/extensions/gsd/tests/worktree-sync-overwrite-loop.test.ts \
   src/resources/extensions/gsd/tests/worktree-sync-tasks.test.ts \
   src/resources/extensions/gsd/tests/worktree-db-respawn-truncation.test.ts \
   src/resources/extensions/gsd/tests/worktree-preferences-sync.test.ts \
   src/resources/extensions/gsd/tests/copy-planning-artifacts-samepath.test.ts \
   src/resources/extensions/gsd/tests/sync-worktree-skip-current.test.ts \
   src/resources/extensions/gsd/tests/preferences-worktree-sync.test.ts \
   src/resources/extensions/gsd/tests/completed-units-metrics-sync.test.ts 2>&1
```
**Expected**: All 9 files return "No such file or directory"

### TC5: auto-worktree.ts exports no sync functions
```bash
grep -c 'export.*sync\|export.*copyPlanningArtifacts\|export.*reconcilePlanCheckboxes\|export.*forceOverwrite' src/resources/extensions/gsd/auto-worktree.ts
```
**Expected**: 0 matches

## Edge Cases
- Historical comments referencing removed functions in test files are acceptable (non-functional documentation)
- Fork test files (dist-test/) using node:test format are pre-existing and unrelated to this slice

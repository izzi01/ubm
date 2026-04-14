# S03: S03: Simplify mergeMilestoneToMain — UAT

**Milestone:** M113
**Written:** 2026-04-14T03:59:26.286Z

# UAT: S03 — Simplify mergeMilestoneToMain

## Preconditions
- Repository with `.gsd/` directory containing tracked planning artifacts (S01 pattern)
- A milestone branch with code changes ready to merge to main
- `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types` available for test execution

## Test Cases

### TC1: Function line count is within target
1. Run: `awk '/^export function mergeMilestoneToMain/,/^}$/' src/resources/extensions/gsd/auto-worktree.ts | wc -l`
2. Expected: output ≤ 250

### TC2: No stash/shelter/auto-resolve references remain in production code
1. Run: `grep -n 'stash\|shelter\|isSafeToAutoResolve\|SAFE_AUTO_RESOLVE' src/resources/extensions/gsd/auto-worktree.ts`
2. Expected: exit code 1 (no matches)

### TC3: No dead exports remain in entire codebase
1. Run: `grep -rn 'isSafeToAutoResolve\|SAFE_AUTO_RESOLVE_PATTERNS' src/ --include='*.ts'`
2. Expected: exit code 1 (no matches anywhere in src/)

### TC4: Removed test files are truly deleted
1. Run: `test ! -f src/resources/extensions/gsd/tests/stash-pop-gsd-conflict.test.ts && test ! -f src/resources/extensions/gsd/tests/stash-queued-context-files.test.ts && test ! -f src/resources/extensions/gsd/tests/auto-worktree-auto-resolve.test.ts && test ! -f src/resources/extensions/gsd/tests/integration/auto-stash-merge.test.ts && echo "ALL_DELETED"`
2. Expected: output "ALL_DELETED"

### TC5: TypeScript compilation passes
1. Run: `npx tsc --noEmit --pretty`
2. Expected: exit code 0, no errors

### TC6: All integration tests pass
1. Run: `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/resources/extensions/gsd/tests/integration/auto-worktree-milestone-merge.test.ts`
2. Expected: tests 22, pass 22, fail 0

### TC7: Dirty tree correctly throws GSDError (behavioral verification)
1. The #2151 e2e test verifies: when mergeMilestoneToMain is called with a dirty working tree, it throws GSDError (not MergeConflictError)
2. This confirms the stash removal was complete — dirty trees are rejected, not silently stashed

### TC8: Core merge functionality preserved
1. The integration test suite covers: auto-commit dirty state (when enabled), checkout main, squash merge, commit, worktree teardown, auto-push, code change detection, branch-ref divergence check
2. All 22 tests passing confirms these paths still work correctly after simplification

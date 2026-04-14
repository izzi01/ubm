---
estimated_steps: 11
estimated_files: 6
skills_used: []
---

# T02: Clean up tests and verify final line count ≤250

After T01 removed stash/shelter/auto-resolve from production code, clean up the test suite to match.

Delete 4 test files that exclusively test removed functionality:
- stash-pop-gsd-conflict.test.ts
- stash-queued-context-files.test.ts
- auto-worktree-auto-resolve.test.ts
- integration/auto-stash-merge.test.ts

Update integration/auto-worktree-milestone-merge.test.ts:
- Remove auto-resolve .gsd/ conflicts test
- Update #1738 bug 3 (synced .gsd/ dirs cleaned) — may still pass via clearProjectRootStateFiles
- Update #2151 e2e (dirty tree stashed) — stash removed, dirty tree now causes GSDError; rewrite to verify that behavior

Run tsc --noEmit and integration tests. Verify mergeMilestoneToMain ≤250 lines via awk wc.

## Inputs

- ``src/resources/extensions/gsd/auto-worktree.ts` — Simplified by T01`
- ``src/resources/extensions/gsd/tests/integration/auto-worktree-milestone-merge.test.ts` — Main test file to update`
- ``src/resources/extensions/gsd/tests/stash-pop-gsd-conflict.test.ts` — To delete`
- ``src/resources/extensions/gsd/tests/stash-queued-context-files.test.ts` — To delete`
- ``src/resources/extensions/gsd/tests/auto-worktree-auto-resolve.test.ts` — To delete`
- ``src/resources/extensions/gsd/tests/integration/auto-stash-merge.test.ts` — To delete`

## Expected Output

- ``src/resources/extensions/gsd/auto-worktree.ts` — Possibly further condensed if line count > 250 after T01`
- ``src/resources/extensions/gsd/tests/integration/auto-worktree-milestone-merge.test.ts` — Updated tests`
- ``src/resources/extensions/gsd/tests/stash-pop-gsd-conflict.test.ts` — Deleted`
- ``src/resources/extensions/gsd/tests/stash-queued-context-files.test.ts` — Deleted`
- ``src/resources/extensions/gsd/tests/auto-worktree-auto-resolve.test.ts` — Deleted`
- ``src/resources/extensions/gsd/tests/integration/auto-stash-merge.test.ts` — Deleted`

## Verification

test ! -f src/resources/extensions/gsd/tests/stash-pop-gsd-conflict.test.ts; test ! -f src/resources/extensions/gsd/tests/stash-queued-context-files.test.ts; test ! -f src/resources/extensions/gsd/tests/auto-worktree-auto-resolve.test.ts; test ! -f src/resources/extensions/gsd/tests/integration/auto-stash-merge.test.ts; tsc --noEmit passes; node --test src/resources/extensions/gsd/tests/integration/auto-worktree-milestone-merge.test.ts passes; awk '/^export function mergeMilestoneToMain/,/^}$/' src/resources/extensions/gsd/auto-worktree.ts | wc -l ≤ 250

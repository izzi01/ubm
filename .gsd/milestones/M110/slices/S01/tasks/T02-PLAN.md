---
estimated_steps: 5
estimated_files: 12
skills_used: []
---

# T02: Update all test files and verify with tsc + test run

**Slice:** S01 — Remove 'none'/'branch' from getIsolationMode and all consumers
**Milestone:** M110

## Description

After T01 narrows the source types, update all test files to match. This includes changing mock return values from `"none"` or `"branch"` to `"worktree"`, updating assertion strings, deleting test files that test removed behavior, and verifying the full test suite passes.

## Steps

1. **Delete obsolete test files** — These files test behavior that no longer exists:
   - `src/resources/extensions/gsd/tests/none-mode-gates.test.ts` — tests getIsolationMode returning "none" for no prefs
   - `src/resources/extensions/gsd/tests/isolation-none-branch-guard.test.ts` — structural test checking for "none" guard in auto-start.ts

2. **Update mock return values** — In all test files where `getIsolationMode: () => "none"` or `() => "branch"` appears in mock deps objects, change to `() => "worktree"`:
   - `src/resources/extensions/gsd/tests/auto-loop.test.ts` (line ~459)
   - `src/resources/extensions/gsd/tests/custom-engine-loop-integration.test.ts` (line ~177)
   - `src/resources/extensions/gsd/tests/journal-integration.test.ts` (line ~71)
   - `src/resources/extensions/gsd/tests/worktree-resolver.test.ts` (~15 occurrences, lines 593-755)

3. **Update test assertions** that reference "none" or "branch" isolation:
   - `src/resources/extensions/gsd/tests/preferences.test.ts` — update the getIsolationMode default test (line ~46-56). The default is now "worktree", not "none". Update the expected value in the ternary.
   - `src/resources/extensions/gsd/tests/status-db-open.test.ts` — this structural test checks that quick.ts has `getIsolationMode() !== "none"`. Since that guard is removed in T01, this test must be updated or the assertion removed.
   - `src/resources/extensions/gsd/tests/worktree-resolver.test.ts` — tests that set mode to "branch" and assert branch-mode behavior need to be updated to "worktree" or removed if they test branch-specific paths.

4. **Update integration tests** that pass `isolationMode: "none"` or `"branch"` to `runGSDDoctor`:
   - `src/resources/extensions/gsd/tests/integration/doctor-git.test.ts` — change `isolationMode: "none"` to `isolationMode: "worktree"` or remove the parameter
   - `src/resources/extensions/gsd/tests/integration/integration-proof.test.ts` (line ~383)
   - `src/resources/extensions/gsd/tests/integration/worktree-e2e.test.ts` — these already use "worktree", should be fine

5. **Run tsc and test suite** to verify everything passes:
   - `npx tsc --noEmit --project tsconfig.json`
   - `npx vitest run --reporter=verbose`

## Must-Haves

- [ ] `none-mode-gates.test.ts` and `isolation-none-branch-guard.test.ts` are deleted
- [ ] All mock `getIsolationMode` return values are `"worktree"`
- [ ] All `isolationMode` parameters in doctor tests are `"worktree"`
- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] `npx vitest run` passes (any test skips must be justified)

## Verification

- `test ! -f src/resources/extensions/gsd/tests/none-mode-gates.test.ts` — file deleted
- `test ! -f src/resources/extensions/gsd/tests/isolation-none-branch-guard.test.ts` — file deleted
- `grep -rn '"none"\|"branch"' src/resources/extensions/gsd/tests/ --include='*.ts' | grep -i isolat` — should return zero hits
- `npx tsc --noEmit --project tsconfig.json && npx vitest run --reporter=verbose 2>&1 | tail -30` — all pass

## Inputs

- `src/resources/extensions/gsd/tests/none-mode-gates.test.ts` — to delete
- `src/resources/extensions/gsd/tests/isolation-none-branch-guard.test.ts` — to delete
- `src/resources/extensions/gsd/tests/preferences.test.ts` — update default assertion
- `src/resources/extensions/gsd/tests/auto-loop.test.ts` — update mock
- `src/resources/extensions/gsd/tests/custom-engine-loop-integration.test.ts` — update mock
- `src/resources/extensions/gsd/tests/journal-integration.test.ts` — update mock
- `src/resources/extensions/gsd/tests/status-db-open.test.ts` — update structural test
- `src/resources/extensions/gsd/tests/worktree-resolver.test.ts` — update mocks and branch-mode tests
- `src/resources/extensions/gsd/tests/integration/doctor-git.test.ts` — update isolationMode params
- `src/resources/extensions/gsd/tests/integration/integration-proof.test.ts` — update isolationMode param
- `src/resources/extensions/gsd/tests/integration/worktree-e2e.test.ts` — verify already correct
- `src/resources/extensions/gsd/tests/orphaned-worktree-audit.test.ts` — check for isolation refs

## Expected Output

- `src/resources/extensions/gsd/tests/none-mode-gates.test.ts` — deleted
- `src/resources/extensions/gsd/tests/isolation-none-branch-guard.test.ts` — deleted
- `src/resources/extensions/gsd/tests/preferences.test.ts` — updated assertions
- `src/resources/extensions/gsd/tests/auto-loop.test.ts` — updated mock
- `src/resources/extensions/gsd/tests/custom-engine-loop-integration.test.ts` — updated mock
- `src/resources/extensions/gsd/tests/journal-integration.test.ts` — updated mock
- `src/resources/extensions/gsd/tests/status-db-open.test.ts` — updated or removed stale assertions
- `src/resources/extensions/gsd/tests/worktree-resolver.test.ts` — updated mocks, branch tests removed/updated
- `src/resources/extensions/gsd/tests/integration/doctor-git.test.ts` — updated isolationMode params
- `src/resources/extensions/gsd/tests/integration/integration-proof.test.ts` — updated isolationMode param
- `src/resources/extensions/gsd/tests/orphaned-worktree-audit.test.ts` — verified or updated

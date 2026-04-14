# S01: Remove SLICE_BRANCH_RE, parseSliceBranch, and dead isolation prefs

**Goal:** Remove all dead slice-branch code and dead isolation preference values from the GSD extension
**Demo:** grep -r 'SLICE_BRANCH_RE' and 'parseSliceBranch' in gsd/ returns zero results (outside docs). GitPreferences no longer has 'branch' or 'none' isolation options. Full GSD test suite passes.

## Must-Haves

- Not provided.

## Proof Level

- This slice proves: Not provided.

## Integration Closure

Not provided.

## Verification

- Not provided.

## Tasks

- [x] **T01: Remove SLICE_BRANCH_RE from branch-patterns.ts** `est:2 min`
  In src/resources/extensions/gsd/branch-patterns.ts:
1. Remove the comment line referencing SLICE_BRANCH_RE (line 4)
2. Remove the SLICE_BRANCH_RE export (line 10)
3. Keep QUICK_BRANCH_RE and WORKFLOW_BRANCH_RE untouched

This is the source of truth for the regex — removing it means all downstream imports will break at compile time, which is what we want (they're all dead).
  - Files: `src/resources/extensions/gsd/branch-patterns.ts`
  - Verify: grep -c 'SLICE_BRANCH_RE' src/resources/extensions/gsd/branch-patterns.ts # expect 0

- [x] **T02: Remove parseSliceBranch and SLICE_BRANCH_RE from worktree.ts** `est:3 min`
  In src/resources/extensions/gsd/worktree.ts:
1. Remove the re-export line: export { SLICE_BRANCH_RE } from "./branch-patterns.js"; (line 249)
2. Remove the import line: import { SLICE_BRANCH_RE } from "./branch-patterns.js"; (line 250)
3. Remove the parseSliceBranch() function (lines 256-272)
4. Update the module comment to remove references to parseSliceBranch and SLICE_BRANCH_RE (lines 7-8, 11-12)
  - Files: `src/resources/extensions/gsd/worktree.ts`
  - Verify: grep -c 'parseSliceBranch\|SLICE_BRANCH_RE' src/resources/extensions/gsd/worktree.ts # expect 0

- [x] **T03: Remove dead parseSliceBranch import from auto.ts and update docstring** `est:2 min`
  In src/resources/extensions/gsd/auto.ts:
1. Remove the parseSliceBranch import at line 139 (dead import, never called)
2. Update shouldUseWorktreeIsolation() docstring — remove references to 'none' default since the type no longer includes 'none'. The function already only checks for 'worktree' so the logic stays the same.
  - Files: `src/resources/extensions/gsd/auto.ts`
  - Verify: grep -c 'parseSliceBranch' src/resources/extensions/gsd/auto.ts # expect 0

- [x] **T04: Remove SLICE_BRANCH_RE from git-service.ts and narrow GitPreferences type** `est:3 min`
  In src/resources/extensions/gsd/git-service.ts:
1. Remove SLICE_BRANCH_RE from the import on line 22 (keep QUICK_BRANCH_RE, WORKFLOW_BRANCH_RE)
2. Remove the SLICE_BRANCH_RE guard in writeIntegrationBranch() at line 262: if (SLICE_BRANCH_RE.test(branch)) return;
3. Narrow GitPreferences.isolation type from 'worktree' | 'branch' | 'none' to just 'worktree' | undefined
4. Update the isolation docstring to remove references to 'branch' and 'none' options (lines 53-56)
  - Files: `src/resources/extensions/gsd/git-service.ts`
  - Verify: grep -c 'SLICE_BRANCH_RE' src/resources/extensions/gsd/git-service.ts # expect 0

- [x] **T05: Remove dead test cases for SLICE_BRANCH_RE, parseSliceBranch, and dead isolation options** `est:8 min`
  Remove all test cases that reference SLICE_BRANCH_RE or parseSliceBranch:

1. src/resources/extensions/gsd/tests/regex-hardening.test.ts:
   - Remove SLICE_BRANCH_RE import (line 22)
   - Remove comment referencing SLICE_BRANCH_RE (line 7)
   - Remove entire SLICE_BRANCH_RE test block (lines 100-145)

2. src/resources/extensions/gsd/tests/worktree.test.ts:
   - Remove parseSliceBranch and SLICE_BRANCH_RE imports (lines 13, 16)
   - Remove parseSliceBranch test block (lines 72-88)
   - Remove SLICE_BRANCH_RE test block (lines 91-96)

3. src/resources/extensions/gsd/tests/worktree-integration.test.ts:
   - Remove SLICE_BRANCH_RE import (line 28)
   - Remove the assertion using SLICE_BRANCH_RE (line 121)

4. src/resources/extensions/gsd/tests/integration/integration-mixed-milestones.test.ts:
   - Remove parseSliceBranch import (line 20)
   - Remove parseSliceBranch test block (lines 529-531)

5. src/resources/extensions/gsd/tests/none-mode-gates.test.ts:
   - Remove the test for 'branch' isolation (lines 51-55) — this option no longer exists
   - Remove the test for 'none' isolation with explicit prefs (lines 40-44) — type no longer has 'none'
   - Keep the 'no prefs' test (lines 79-86) but update it — remove the explicit 'none' isolation set, since the default (undefined) already means no isolation
   - Keep the 'worktree' test (lines 62-66) unchanged
  - Files: `src/resources/extensions/gsd/tests/regex-hardening.test.ts`, `src/resources/extensions/gsd/tests/worktree.test.ts`, `src/resources/extensions/gsd/tests/worktree-integration.test.ts`, `src/resources/extensions/gsd/tests/integration/integration-mixed-milestones.test.ts`, `src/resources/extensions/gsd/tests/none-mode-gates.test.ts`
  - Verify: grep -rn 'SLICE_BRANCH_RE\|parseSliceBranch' src/resources/extensions/gsd/tests/ --include='*.ts' # expect 0

- [x] **T06: Build and run full test suite to verify zero regressions** `est:5 min`
  Run the full verification chain:
1. tsc --noEmit — ensure zero type errors
2. Run the upstream GSD test suite (node:test runner)
3. Verify umb binary starts: ./bin/umb --version or equivalent
4. Final grep sweep: grep -rn 'SLICE_BRANCH_RE\|parseSliceBranch' src/resources/extensions/gsd/ --include='*.ts' should return zero results
5. Verify QUICK_BRANCH_RE and WORKFLOW_BRANCH_RE still exist and are importable
  - Verify: tsc --noEmit && npm test (GSD suite) && grep -rn 'SLICE_BRANCH_RE\|parseSliceBranch' src/resources/extensions/gsd/ --include='*.ts' | wc -l # expect 0

## Files Likely Touched

- src/resources/extensions/gsd/branch-patterns.ts
- src/resources/extensions/gsd/worktree.ts
- src/resources/extensions/gsd/auto.ts
- src/resources/extensions/gsd/git-service.ts
- src/resources/extensions/gsd/tests/regex-hardening.test.ts
- src/resources/extensions/gsd/tests/worktree.test.ts
- src/resources/extensions/gsd/tests/worktree-integration.test.ts
- src/resources/extensions/gsd/tests/integration/integration-mixed-milestones.test.ts
- src/resources/extensions/gsd/tests/none-mode-gates.test.ts

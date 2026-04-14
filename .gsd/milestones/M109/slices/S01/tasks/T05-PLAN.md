---
estimated_steps: 20
estimated_files: 5
skills_used: []
---

# T05: Remove dead test cases for SLICE_BRANCH_RE, parseSliceBranch, and dead isolation options

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

## Inputs

- `All 5 test files listed above`

## Expected Output

- `All 5 test files updated without SLICE_BRANCH_RE or parseSliceBranch references`
- `none-mode-gates.test.ts with only worktree and default (no prefs) tests`

## Verification

grep -rn 'SLICE_BRANCH_RE\|parseSliceBranch' src/resources/extensions/gsd/tests/ --include='*.ts' # expect 0

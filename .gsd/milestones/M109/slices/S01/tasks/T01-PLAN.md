---
estimated_steps: 5
estimated_files: 1
skills_used: []
---

# T01: Remove SLICE_BRANCH_RE from branch-patterns.ts

In src/resources/extensions/gsd/branch-patterns.ts:
1. Remove the comment line referencing SLICE_BRANCH_RE (line 4)
2. Remove the SLICE_BRANCH_RE export (line 10)
3. Keep QUICK_BRANCH_RE and WORKFLOW_BRANCH_RE untouched

This is the source of truth for the regex — removing it means all downstream imports will break at compile time, which is what we want (they're all dead).

## Inputs

- `src/resources/extensions/gsd/branch-patterns.ts`

## Expected Output

- `branch-patterns.ts with only QUICK_BRANCH_RE and WORKFLOW_BRANCH_RE`

## Verification

grep -c 'SLICE_BRANCH_RE' src/resources/extensions/gsd/branch-patterns.ts # expect 0

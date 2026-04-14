---
estimated_steps: 5
estimated_files: 1
skills_used: []
---

# T02: Remove parseSliceBranch and SLICE_BRANCH_RE from worktree.ts

In src/resources/extensions/gsd/worktree.ts:
1. Remove the re-export line: export { SLICE_BRANCH_RE } from "./branch-patterns.js"; (line 249)
2. Remove the import line: import { SLICE_BRANCH_RE } from "./branch-patterns.js"; (line 250)
3. Remove the parseSliceBranch() function (lines 256-272)
4. Update the module comment to remove references to parseSliceBranch and SLICE_BRANCH_RE (lines 7-8, 11-12)

## Inputs

- `src/resources/extensions/gsd/worktree.ts`

## Expected Output

- `worktree.ts without parseSliceBranch or SLICE_BRANCH_RE references`

## Verification

grep -c 'parseSliceBranch\|SLICE_BRANCH_RE' src/resources/extensions/gsd/worktree.ts # expect 0

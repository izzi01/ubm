---
estimated_steps: 5
estimated_files: 1
skills_used: []
---

# T04: Remove SLICE_BRANCH_RE from git-service.ts and narrow GitPreferences type

In src/resources/extensions/gsd/git-service.ts:
1. Remove SLICE_BRANCH_RE from the import on line 22 (keep QUICK_BRANCH_RE, WORKFLOW_BRANCH_RE)
2. Remove the SLICE_BRANCH_RE guard in writeIntegrationBranch() at line 262: if (SLICE_BRANCH_RE.test(branch)) return;
3. Narrow GitPreferences.isolation type from 'worktree' | 'branch' | 'none' to just 'worktree' | undefined
4. Update the isolation docstring to remove references to 'branch' and 'none' options (lines 53-56)

## Inputs

- `src/resources/extensions/gsd/git-service.ts`

## Expected Output

- `git-service.ts without SLICE_BRANCH_RE, narrowed GitPreferences type`

## Verification

grep -c 'SLICE_BRANCH_RE' src/resources/extensions/gsd/git-service.ts # expect 0

---
estimated_steps: 3
estimated_files: 1
skills_used: []
---

# T03: Remove dead parseSliceBranch import from auto.ts and update docstring

In src/resources/extensions/gsd/auto.ts:
1. Remove the parseSliceBranch import at line 139 (dead import, never called)
2. Update shouldUseWorktreeIsolation() docstring — remove references to 'none' default since the type no longer includes 'none'. The function already only checks for 'worktree' so the logic stays the same.

## Inputs

- `src/resources/extensions/gsd/auto.ts`

## Expected Output

- `auto.ts without parseSliceBranch import`

## Verification

grep -c 'parseSliceBranch' src/resources/extensions/gsd/auto.ts # expect 0

---
estimated_steps: 4
estimated_files: 1
skills_used: []
---

# T04: Inline compareSemver into resource-loader.ts

In /home/cid/projects-personal/umb/src/resource-loader.ts:
1. Remove `import { compareSemver } from './update-check.js'`
2. Add a local compareSemver function (inline the logic from update-check.ts)
3. Verify no other imports from update-check remain

## Inputs

- `/home/cid/projects-personal/umb/src/resource-loader.ts`

## Expected Output

- `resource-loader.ts with local compareSemver, no update-check import`

## Verification

grep -n 'update-check' /home/cid/projects-personal/umb/src/resource-loader.ts returns no matches

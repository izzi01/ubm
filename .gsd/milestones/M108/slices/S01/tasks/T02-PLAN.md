---
estimated_steps: 5
estimated_files: 1
skills_used: []
---

# T02: Remove update-check imports and calls from cli.ts

In /home/cid/projects-personal/umb/src/cli.ts:
1. Remove the import line: `import { checkForUpdates } from './update-check.js'`
2. Remove the startup checkForUpdates() call (around line 363-366)
3. Remove the `gsd update` command handler block (around line 160-165)
4. Remove or update any stale references to npm install gsd-pi or gsd update in error messages

## Inputs

- `/home/cid/projects-personal/umb/src/cli.ts`

## Expected Output

- `cli.ts with no update-check imports or calls`

## Verification

grep -n 'checkForUpdates\|update-check\|update-cmd\|runUpdate' /home/cid/projects-personal/umb/src/cli.ts returns no matches

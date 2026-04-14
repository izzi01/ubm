# S01: Remove update-check module and CLI integration

**Goal:** Remove update-check.ts, update-cmd.ts, their imports in cli.ts, the startup checkForUpdates() call, and the gsd update command handler
**Demo:** CLI starts without any npm registry check; `gsd update` command removed

## Must-Haves

- Not provided.

## Proof Level

- This slice proves: Not provided.

## Integration Closure

Not provided.

## Verification

- Not provided.

## Tasks

- [x] **T01: Delete update-check.ts and update-cmd.ts** `est:5m`
  Delete src/update-check.ts and src/update-cmd.ts from the fork repo at /home/cid/projects-personal/umb/src/
  - Files: `/home/cid/projects-personal/umb/src/update-check.ts`, `/home/cid/projects-personal/umb/src/update-cmd.ts`
  - Verify: ls /home/cid/projects-personal/umb/src/update-check.ts /home/cid/projects-personal/umb/src/update-cmd.ts 2>&1 | grep 'No such file'

- [x] **T02: Remove update-check imports and calls from cli.ts** `est:10m`
  In /home/cid/projects-personal/umb/src/cli.ts:
1. Remove the import line: `import { checkForUpdates } from './update-check.js'`
2. Remove the startup checkForUpdates() call (around line 363-366)
3. Remove the `gsd update` command handler block (around line 160-165)
4. Remove or update any stale references to npm install gsd-pi or gsd update in error messages
  - Files: `/home/cid/projects-personal/umb/src/cli.ts`
  - Verify: grep -n 'checkForUpdates\|update-check\|update-cmd\|runUpdate' /home/cid/projects-personal/umb/src/cli.ts returns no matches

## Files Likely Touched

- /home/cid/projects-personal/umb/src/update-check.ts
- /home/cid/projects-personal/umb/src/update-cmd.ts
- /home/cid/projects-personal/umb/src/cli.ts

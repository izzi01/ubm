# S02: Remove update-service and inline compareSemver

**Goal:** Delete update-service.ts, inline compareSemver into resource-loader.ts, update windows-portability test, and remove update-check.test.ts
**Demo:** No update-service.ts file; resource-loader.ts has its own compareSemver

## Must-Haves

- Not provided.

## Proof Level

- This slice proves: Not provided.

## Integration Closure

Not provided.

## Verification

- Not provided.

## Tasks

- [x] **T03: Delete update-service.ts and update-check.test.ts** `est:5m`
  Delete /home/cid/projects-personal/umb/src/web/update-service.ts and /home/cid/projects-personal/umb/src/tests/update-check.test.ts
  - Files: `/home/cid/projects-personal/umb/src/web/update-service.ts`, `/home/cid/projects-personal/umb/src/tests/update-check.test.ts`
  - Verify: ls /home/cid/projects-personal/umb/src/web/update-service.ts /home/cid/projects-personal/umb/src/tests/update-check.test.ts 2>&1 | grep 'No such file'

- [x] **T04: Inline compareSemver into resource-loader.ts** `est:10m`
  In /home/cid/projects-personal/umb/src/resource-loader.ts:
1. Remove `import { compareSemver } from './update-check.js'`
2. Add a local compareSemver function (inline the logic from update-check.ts)
3. Verify no other imports from update-check remain
  - Files: `/home/cid/projects-personal/umb/src/resource-loader.ts`
  - Verify: grep -n 'update-check' /home/cid/projects-personal/umb/src/resource-loader.ts returns no matches

- [x] **T05: Update windows-portability test** `est:5m`
  In /home/cid/projects-personal/umb/src/tests/windows-portability.test.ts:
1. Remove the updateService readFileSync block (lines 61-62) and the assertion that checks it (line 75)
2. Keep the rest of the test intact
  - Files: `/home/cid/projects-personal/umb/src/tests/windows-portability.test.ts`
  - Verify: grep -n 'update-service' /home/cid/projects-personal/umb/src/tests/windows-portability.test.ts returns no matches

## Files Likely Touched

- /home/cid/projects-personal/umb/src/web/update-service.ts
- /home/cid/projects-personal/umb/src/tests/update-check.test.ts
- /home/cid/projects-personal/umb/src/resource-loader.ts
- /home/cid/projects-personal/umb/src/tests/windows-portability.test.ts

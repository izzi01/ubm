---
estimated_steps: 3
estimated_files: 1
skills_used: []
---

# T05: Update windows-portability test

In /home/cid/projects-personal/umb/src/tests/windows-portability.test.ts:
1. Remove the updateService readFileSync block (lines 61-62) and the assertion that checks it (line 75)
2. Keep the rest of the test intact

## Inputs

- `/home/cid/projects-personal/umb/src/tests/windows-portability.test.ts`

## Expected Output

- `windows-portability.test.ts with no update-service reference`

## Verification

grep -n 'update-service' /home/cid/projects-personal/umb/src/tests/windows-portability.test.ts returns no matches

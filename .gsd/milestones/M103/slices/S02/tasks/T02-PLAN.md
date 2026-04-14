---
estimated_steps: 3
estimated_files: 1
skills_used: []
---

# T02: Rebrand app-paths.ts

1. Change GSD_HOME to UMB_HOME, .gsd to .umb
2. Change authFilePath, webPidFilePath, webPreferencesPath to use appRoot (.umb)
3. Export same interface with new paths

## Inputs

- `src/app-paths.ts`

## Expected Output

- `src/app-paths.ts with ~/.umb paths`

## Verification

grep -c '\.gsd' src/app-paths.ts — should be 0

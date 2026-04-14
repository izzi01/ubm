---
estimated_steps: 6
estimated_files: 1
skills_used: []
---

# T01: Rebrand loader.ts

1. Rename all gsdRoot/gsdVersion/gsdNodeModules/gsdScopeDir to umb equivalents
2. Change process.title to 'umb'
3. Change all GSD_* env vars to UMB_* (GSD_HOME→UMB_HOME, GSD_CODING_AGENT_DIR→UMB_CODING_AGENT_DIR, GSD_PKG_ROOT→UMB_PKG_ROOT, GSD_VERSION→UMB_VERSION, GSD_BIN_PATH→UMB_BIN_PATH, GSD_WORKFLOW_PATH→UMB_WORKFLOW_PATH, GSD_BUNDLED_EXTENSION_PATHS→UMB_BUNDLED_EXTENSION_PATHS, GSD_FIRST_RUN_BANNER→UMB_FIRST_RUN_BANNER)
4. Change error messages from 'GSD' to 'UMB'
5. Change 'Get Shit Done' banner to 'Umbrella Blade'
6. Change first-run welcome text

## Inputs

- `src/loader.ts`

## Expected Output

- `src/loader.ts with all umb branding`

## Verification

grep -ci 'gsd' src/loader.ts — should only match comments/URLs

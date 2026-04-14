# S02: Rebrand loader.js and app-paths

**Goal:** Rebrand all gsd references to umb: loader.ts, app-paths.ts, help-text.ts, logo.ts, pkg/package.json, root package.json. Change binary name, config dir, env vars, process title, help text, ASCII logo.
**Demo:** node dist/loader.js --version prints umb version, process.title is 'umb'

## Must-Haves

- Not provided.

## Proof Level

- This slice proves: Not provided.

## Integration Closure

Not provided.

## Verification

- Not provided.

## Tasks

- [x] **T01: Rebrand loader.ts** `est:10m`
  1. Rename all gsdRoot/gsdVersion/gsdNodeModules/gsdScopeDir to umb equivalents
2. Change process.title to 'umb'
3. Change all GSD_* env vars to UMB_* (GSD_HOME→UMB_HOME, GSD_CODING_AGENT_DIR→UMB_CODING_AGENT_DIR, GSD_PKG_ROOT→UMB_PKG_ROOT, GSD_VERSION→UMB_VERSION, GSD_BIN_PATH→UMB_BIN_PATH, GSD_WORKFLOW_PATH→UMB_WORKFLOW_PATH, GSD_BUNDLED_EXTENSION_PATHS→UMB_BUNDLED_EXTENSION_PATHS, GSD_FIRST_RUN_BANNER→UMB_FIRST_RUN_BANNER)
4. Change error messages from 'GSD' to 'UMB'
5. Change 'Get Shit Done' banner to 'Umbrella Blade'
6. Change first-run welcome text
  - Files: `src/loader.ts`
  - Verify: grep -ci 'gsd' src/loader.ts — should only match comments/URLs

- [x] **T02: Rebrand app-paths.ts** `est:5m`
  1. Change GSD_HOME to UMB_HOME, .gsd to .umb
2. Change authFilePath, webPidFilePath, webPreferencesPath to use appRoot (.umb)
3. Export same interface with new paths
  - Files: `src/app-paths.ts`
  - Verify: grep -c '\.gsd' src/app-paths.ts — should be 0

- [x] **T03: Rebrand help-text.ts** `est:10m`
  1. Replace all 'GSD' with 'UMB' in help text headers
2. Replace 'gsd' with 'umb' in command examples
3. Replace 'Get Shit Done' with 'Umbrella Blade'
4. Update npm install commands to use umb-cli
5. Update GitHub issue URL
  - Files: `src/help-text.ts`
  - Verify: grep -ci 'gsd' src/help-text.ts — should be 0

- [x] **T04: Rebrand logo.ts with UMB ASCII art** `est:5m`
  1. Replace GSD ASCII block letters with UMB block letters
2. Update GSD_LOGO constant name to UMB_LOGO
3. Update JSDoc comments
  - Files: `src/logo.ts`
  - Verify: grep -ci 'GSD' src/logo.ts — should be 0

- [x] **T05: Rebrand package.json files and rebuild** `est:10m`
  1. Change piConfig.name from 'gsd' to 'umb'
2. Change piConfig.configDir from '.gsd' to '.umb'
3. Change package name from '@glittercowboy/gsd' to 'umb-cli'
4. In root package.json: name='umb-cli', bin.umb='dist/loader.js', remove gsd-cli bin entry
5. Update description to 'Umbrella Blade — Coding Terminal'
6. Rebuild and verify: npm run build && node dist/loader.js --version && node dist/loader.js --help
  - Files: `pkg/package.json`, `package.json`
  - Verify: cd /home/cid/projects-personal/umb && npm run build && node dist/loader.js --version && node dist/loader.js --help | head -3

## Files Likely Touched

- src/loader.ts
- src/app-paths.ts
- src/help-text.ts
- src/logo.ts
- pkg/package.json
- package.json

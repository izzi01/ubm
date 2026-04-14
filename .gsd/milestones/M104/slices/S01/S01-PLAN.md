# S01: Port iz-to-mo-vu extension into the fork

**Goal:** Copy all iz-to-mo-vu source files into the fork as src/resources/extensions/umb/, fix import paths (@mariozechner → @gsd), add missing deps, verify TypeScript compiles
**Demo:** tsc --noEmit passes for all ported extension code

## Must-Haves

- Not provided.

## Proof Level

- This slice proves: Not provided.

## Integration Closure

Not provided.

## Verification

- Not provided.

## Tasks

- [x] **T01: Copy iz-to-mo-vu source into fork extension dir** `est:5m`
  1. Create src/resources/extensions/umb/ directory in the fork
2. Copy src/ subdirectories from iz-to-mo-vu (commands, dashboard, db, import, model-config, patterns, skill-registry, state-machine, tools, extension/) — exclude tests for now
3. Create package.json for the umb extension
4. Create extension-manifest.json
  - Files: `/home/cid/projects-personal/umb/src/resources/extensions/umb/`
  - Verify: ls /home/cid/projects-personal/umb/src/resources/extensions/umb/

- [x] **T02: Fix import paths for fork context** `est:10m`
  1. Replace all '@mariozechner/pi-coding-agent' imports with '@gsd/pi-coding-agent'
2. Fix any other path issues
3. Update extension/index.ts to use correct relative paths within the extension directory
4. Verify extension cli.ts and loader.ts are not needed (the fork has its own)
  - Files: `/home/cid/projects-personal/umb/src/resources/extensions/umb/`
  - Verify: grep -r '@mariozechner' /home/cid/projects-personal/umb/src/resources/extensions/umb/ — should be 0

- [x] **T03: Add deps and verify TypeScript compiles** `est:10m`
  1. Add better-sqlite3 to package.json dependencies
2. Add @types/better-sqlite3 to devDependencies
3. Run npm install
4. Run tsc --noEmit to check for type errors
5. Fix any type errors found
  - Files: `/home/cid/projects-personal/umb/package.json`, `/home/cid/projects-personal/umb/src/resources/extensions/umb/`
  - Verify: cd /home/cid/projects-personal/umb && npx tsc --noEmit 2>&1 | grep -c 'error TS'

## Files Likely Touched

- /home/cid/projects-personal/umb/src/resources/extensions/umb/
- /home/cid/projects-personal/umb/package.json

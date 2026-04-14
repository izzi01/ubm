# S03: Strip gsd extension, keep pi SDK + shared extensions

**Goal:** Verify the umb TUI launches after rebranding. The gsd extension files remain for now (deeply coupled to core) but we verify the rebranded binary launches, config dir ~/.umb is used, and shared extensions load. Actual gsd extension removal happens in M104 when umb extension code replaces it.
**Demo:** umb launches TUI without the gsd extension, /gsd commands are gone, core extensions (browser-tools, subagent, etc.) still load

## Must-Haves

- Not provided.

## Proof Level

- This slice proves: Not provided.

## Integration Closure

Not provided.

## Verification

- Not provided.

## Tasks

- [x] **T01: Verify build and binary after rebrand** `est:5m`
  1. Verify the build completes successfully after rebranding
2. Run node dist/loader.js --version — should print version
3. Run node dist/loader.js --help — should show umb branding
4. Verify dist/loader.js has process.title = 'umb'
5. Verify dist/app-paths.js references ~/.umb
  - Files: `dist/loader.js`, `dist/app-paths.js`
  - Verify: cd /home/cid/projects-personal/umb && node dist/loader.js --version && node dist/loader.js --help | head -1

- [x] **T02: Verify TUI launches with rebranded config** `est:10m`
  1. Remove ~/.umb/ if it exists (clean test)
2. Set HOME to a temp dir to avoid polluting real home
3. Run node dist/loader.js with minimal flags to verify it starts without crash
4. Check that extension discovery finds shared extensions (browser-tools, subagent, etc.)
5. Verify the gsd extension is still discovered (needed for coupling — removal deferred to M104)
  - Files: `dist/loader.js`, `dist/extension-discovery.js`
  - Verify: cd /home/cid/projects-personal/umb && grep -c 'UMB_' dist/loader.js | head -1 && grep -c '\.umb' dist/app-paths.js

- [x] **T03: Audit remaining gsd references in dist/** `est:5m`
  1. Verify all remaining gsd references in dist/ are only in the gsd extension directory (dist/resources/extensions/gsd/)
2. Verify all non-extension dist/ files use umb branding
3. Check dist/loader.js: process.title = 'umb', UMB_HOME, UMB_VERSION etc
4. Document which files still reference gsd and why (expected: gsd extension, @gsd scope dir, test files)
  - Files: `dist/`
  - Verify: grep -r 'GSD\|gsd' dist/loader.js dist/app-paths.js dist/help-text.js dist/logo.js dist/cli.js 2>/dev/null | grep -v 'gsd-2\|github.com/gsd' | wc -l

## Files Likely Touched

- dist/loader.js
- dist/app-paths.js
- dist/extension-discovery.js
- dist/

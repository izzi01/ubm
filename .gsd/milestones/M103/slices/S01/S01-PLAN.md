# S01: Clone gsd-2 and verify build

**Goal:** Clone gsd-2 repo, install dependencies, verify build pipeline produces working dist/, and confirm the loader binary runs
**Demo:** git clone succeeds, npm install completes, npm run build produces dist/

## Must-Haves

- Not provided.

## Proof Level

- This slice proves: Not provided.

## Integration Closure

Not provided.

## Verification

- Not provided.

## Tasks

- [x] **T01: Clone gsd-2 repository** `est:5m`
  1. git clone https://github.com/gsd-build/gsd-2.git /home/cid/projects-personal/umb
2. Verify clone has src/, packages/, pkg/, scripts/ directories
3. Verify package.json shows correct version and engines
  - Files: `/home/cid/projects-personal/umb/`
  - Verify: ls /home/cid/projects-personal/umb/src /home/cid/projects-personal/umb/packages /home/cid/projects-personal/umb/pkg

- [x] **T02: Install dependencies and build workspace packages** `est:10m`
  1. cd /home/cid/projects-personal/umb
2. npm install
3. Verify all workspace packages built (native, pi-tui, pi-ai, pi-agent-core, pi-coding-agent)
4. Check for errors in postinstall scripts
  - Files: `/home/cid/projects-personal/umb/package.json`, `/home/cid/projects-personal/umb/node_modules/`
  - Verify: ls /home/cid/projects-personal/umb/node_modules/.package-lock.json 2>/dev/null && ls /home/cid/projects-personal/umb/packages/pi-coding-agent/dist/

- [x] **T03: Build and verify loader binary** `est:10m`
  1. npm run build
2. Verify dist/loader.js exists
3. Run node dist/loader.js --version — should print version
4. Run node dist/loader.js --help — should print help text
5. Verify dist/ contains all expected files (loader.js, app-paths.js, cli.js, help-text.js, logo.js)
  - Files: `/home/cid/projects-personal/umb/dist/`
  - Verify: cd /home/cid/projects-personal/umb && node dist/loader.js --version

## Files Likely Touched

- /home/cid/projects-personal/umb/
- /home/cid/projects-personal/umb/package.json
- /home/cid/projects-personal/umb/node_modules/
- /home/cid/projects-personal/umb/dist/

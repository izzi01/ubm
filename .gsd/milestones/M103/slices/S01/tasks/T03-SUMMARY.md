---
id: T03
parent: S01
milestone: M103
key_files:
  - /home/cid/projects-personal/umb/dist/loader.js
  - /home/cid/projects-personal/umb/dist/app-paths.js
  - /home/cid/projects-personal/umb/dist/cli.js
key_decisions:
  - (none)
duration: 
verification_result: passed
completed_at: 2026-04-11T03:07:14.090Z
blocker_discovered: false
---

# T03: Build produces working dist/ — loader.js prints v2.70.0

**Build produces working dist/ — loader.js prints v2.70.0**

## What Happened

Ran npm run build. Full build completed: tsc compiled, resources copied, themes copied, web staged. dist/loader.js exists and prints version 2.70.0 on --version. dist/ contains all expected files: loader.js, app-paths.js, cli.js, help-text.js, logo.js, extension-discovery.js, extension-registry.js, and many more.

## Verification

node dist/loader.js --version prints 2.70.0. dist/loader.js, dist/app-paths.js, dist/cli.js, dist/help-text.js, dist/logo.js all exist.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `cd /home/cid/projects-personal/umb && node dist/loader.js --version` | 0 | ✅ pass | 500ms |

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `/home/cid/projects-personal/umb/dist/loader.js`
- `/home/cid/projects-personal/umb/dist/app-paths.js`
- `/home/cid/projects-personal/umb/dist/cli.js`

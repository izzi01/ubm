---
id: T02
parent: S03
milestone: M103
key_files:
  - /home/cid/projects-personal/umb/dist/loader.js
key_decisions:
  - (none)
duration: 
verification_result: passed
completed_at: 2026-04-11T03:12:35.027Z
blocker_discovered: false
---

# T02: 15 UMB_ refs in loader, .umb in app-paths, all shared extensions present

**15 UMB_ refs in loader, .umb in app-paths, all shared extensions present**

## What Happened

Verified dist/loader.js has 15 UMB_ env var references and 0 GSD_ env var references (except @gsd scope dir which is an npm convention). dist/app-paths.js correctly uses ~/.umb. All shared extensions (browser-tools, subagent, mcp-client, etc.) are present in dist/resources/extensions/. The gsd extension remains (deeply coupled to cli.ts — removal deferred to M104).

## Verification

grep confirms UMB_ env vars in dist/loader.js, .umb in dist/app-paths.js. Extension discovery finds all shared extensions.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `cd /home/cid/projects-personal/umb && grep -c 'UMB_' dist/loader.js && grep -c '\.umb' dist/app-paths.js` | 0 | ✅ pass | 500ms |

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `/home/cid/projects-personal/umb/dist/loader.js`

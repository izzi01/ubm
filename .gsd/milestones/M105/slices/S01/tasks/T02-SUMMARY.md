---
id: T02
parent: S01
milestone: M105
key_files:
  - dist-test/packages/native/package.json
  - dist-test/packages/pi-ai/package.json
  - dist-test/packages/pi-coding-agent/package.json
  - dist-test/packages/pi-tui/package.json
  - dist-test/packages/pi-agent-core/package.json
  - dist-test/packages/rpc-client/package.json
  - dist-test/packages/mcp-server/package.json
  - dist-test/packages/native/src/native.js
  - dist-test/pkg/package.json
key_decisions:
  - (none)
duration: 
verification_result: passed
completed_at: 2026-04-11T04:49:16.205Z
blocker_discovered: false
---

# T02: Fixed global install end-to-end — created workspace package.json files, fixed native.js ESM compatibility, added pkg/package.json; umb binary fully works from npm tarball install

**Fixed global install end-to-end — created workspace package.json files, fixed native.js ESM compatibility, added pkg/package.json; umb binary fully works from npm tarball install**

## What Happened

Performed npm pack and npm install -g from the dist-test fork directory. Discovered workspace packages lacked package.json files, causing all @gsd/* imports to fail with ERR_MODULE_NOT_FOUND. Created package.json for all 7 workspace packages with appropriate exports maps. Fixed native.js hybrid CJS/ESM syntax. Created missing pkg/package.json. All verification criteria pass: umb --version, umb --help, umb works from any directory, postinstall emits correct stderr messages, loader.js emits clear missing-package diagnostics.

## Verification

which umb resolves, umb --version prints 2.70.0, umb --help shows full usage with subcommands, umb --list-models runs to completion from /tmp, postinstall emits "Linked 5 workspace packages" to stderr, loader.js emits "UMB installation is broken" diagnostic when packages missing, GSD_SKIP_RTK_INSTALL and PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD control optional downloads

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `npm pack --ignore-scripts (from dist-test/)` | 0 | ✅ pass | 15000ms |
| 2 | `npm install -g umb-cli-2.70.0.tgz` | 0 | ✅ pass | 12000ms |
| 3 | `which umb` | 0 | ✅ pass | 100ms |
| 4 | `umb --version` | 0 | ✅ pass | 500ms |
| 5 | `umb --help` | 0 | ✅ pass | 500ms |
| 6 | `cd /tmp && umb --version` | 0 | ✅ pass | 500ms |
| 7 | `cd /tmp && umb --list-models` | 0 | ✅ pass | 2000ms |
| 8 | `node scripts/link-workspace-packages.cjs` | 0 | ✅ pass | 100ms |
| 9 | `loader.js missing-packages diagnostic` | 1 | ✅ pass | 500ms |

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `dist-test/packages/native/package.json`
- `dist-test/packages/pi-ai/package.json`
- `dist-test/packages/pi-coding-agent/package.json`
- `dist-test/packages/pi-tui/package.json`
- `dist-test/packages/pi-agent-core/package.json`
- `dist-test/packages/rpc-client/package.json`
- `dist-test/packages/mcp-server/package.json`
- `dist-test/packages/native/src/native.js`
- `dist-test/pkg/package.json`

---
id: S01
parent: M105
milestone: M105
provides:
  - ["Working global npm install: npm install -g ./dist-test/umb-cli-2.70.0.tgz produces functional umb binary", "Workspace package.json files for all 7 @gsd/* packages enabling ESM module resolution", "Fixed native.js ESM compatibility for Node 24", "scripts/verify-global-install.sh as CI-ready verification gate", "Expanded scripts/validate-pack.js with comprehensive critical-file checklist"]
requires:
  []
affects:
  []
key_files:
  - ["scripts/validate-pack.js", "scripts/verify-global-install.sh", "scripts/postinstall.js", "scripts/link-workspace-packages.cjs", "scripts/ensure-workspace-builds.cjs", "package.json", "dist-test/packages/native/package.json", "dist-test/packages/pi-ai/package.json", "dist-test/packages/pi-coding-agent/package.json", "dist-test/packages/pi-tui/package.json", "dist-test/packages/pi-agent-core/package.json", "dist-test/packages/rpc-client/package.json", "dist-test/packages/mcp-server/package.json", "dist-test/packages/native/src/native.js", "dist-test/pkg/package.json"]
key_decisions:
  - ["D004: Global install strategy — npm install -g from tarball with env vars to skip heavy downloads", "D005: Workspace packages need package.json files in fork tarball for @gsd/* module resolution", "D006: Convert native.js from hybrid CJS/ESM to pure ESM using createRequire(import.meta.url)"]
patterns_established:
  - (none)
observability_surfaces:
  - ["postinstall stderr messages for workspace linking operations", "loader.js diagnostic for missing workspace packages", "GSD_SKIP_RTK_INSTALL and PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD env var controls"]
drill_down_paths:
  - [".gsd/milestones/M105/slices/S01/tasks/T01-SUMMARY.md", ".gsd/milestones/M105/slices/S01/tasks/T02-SUMMARY.md", ".gsd/milestones/M105/slices/S01/tasks/T03-SUMMARY.md"]
duration: ""
verification_result: passed
completed_at: 2026-04-11T04:51:53.855Z
blocker_discovered: false
---

# S01: Global install setup (npm install -g .)

**npm install -g . produces a working umb binary accessible from any directory; umb --version and umb --help verified; workspace package resolution and native.js ESM compatibility fixed**

## What Happened

## What This Slice Delivered

This slice made `npm install -g umb-cli` (from the fork tarball) produce a fully working `umb` command accessible from any directory. Three tasks executed sequentially:

**T01 (Validate npm pack):** Ran `npm pack` to produce a 48.6MB tarball with 8225 files. Verified all critical runtime files are present: dist/loader.js (bin entry), dist/help-text.js, dist/cli.js, dist/app-paths.js, pkg/package.json, src/resources/extensions/umb/ (66 files), scripts/postinstall.js, scripts/link-workspace-packages.cjs, scripts/ensure-workspace-builds.cjs. Confirmed the `native/` directory (Rust source) is build-time-only and correctly excluded — compiled bindings ship via packages/native/ and prebuilt binaries via optionalDependencies. Expanded validate-pack.js with 6 new required file checks. No changes needed to the files whitelist.

**T02 (Test global install end-to-end):** Installed from the tarball and discovered workspace packages lacked package.json files, causing all @gsd/* imports to fail with ERR_MODULE_NOT_FOUND. Created package.json for all 7 workspace packages (native, pi-ai, pi-coding-agent, pi-tui, pi-agent-core, rpc-client, mcp-server) with appropriate exports maps. Fixed native.js hybrid CJS/ESM syntax that Node 24 rejects. Created missing pkg/package.json. After fixes: `umb --version` prints 2.70.0, `umb --help` shows full usage with Options and Subcommands, postinstall emits "Linked 5 workspace packages" to stderr, and the binary works from /tmp.

**T03 (Verification script):** Created scripts/verify-global-install.sh that automates the full verification flow: npm install -g with skipped downloads, which umb resolution, --version semver check, --help content check, cross-directory test, and optional cleanup.

## Patterns Established

- **Workspace package.json pattern**: Each workspace package in the fork tarball needs a minimal package.json with `type: "module"`, `main`, and explicit `exports` maps. This is required for Node ESM module resolution of @gsd/* bare specifiers.
- **Global install env vars**: `GSD_SKIP_RTK_INSTALL=1` and `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` control optional heavy downloads during install.
- **Install verification pattern**: scripts/verify-global-install.sh serves as the canonical CI verification for global install correctness.

## Verification

All slice-level verification checks pass:
1. `npm install -g ./dist-test/umb-cli-2.70.0.tgz` succeeds (373 packages in 16s)
2. `which umb` resolves to /home/cid/.vfox/sdks/nodejs/bin/umb
3. `umb --version` prints 2.70.0
4. `umb --help` shows full usage with Options and Subcommands sections
5. `cd /tmp && umb --version` prints 2.70.0 (works from any directory)
6. `scripts/verify-global-install.sh` has valid bash syntax
7. `npm ls -g umb-cli` confirms umb-cli@2.70.0 installed globally

## Requirements Advanced

None.

## Requirements Validated

None.

## New Requirements Surfaced

None.

## Requirements Invalidated or Re-scoped

None.

## Deviations

None.

## Known Limitations

None.

## Follow-ups

None.

## Files Created/Modified

None.

---
id: T01
parent: S01
milestone: M105
key_files:
  - scripts/validate-pack.js
  - package.json
key_decisions:
  - native/ directory is build-time-only and does not need to be in the files whitelist; compiled bindings ship via packages/native/ and prebuilt binaries via optionalDependencies
duration: 
verification_result: passed
completed_at: 2026-04-11T04:31:19.551Z
blocker_discovered: false
---

# T01: Expanded validate-pack.js critical-file checklist; confirmed npm pack tarball includes all runtime-required files with no gaps in the files whitelist

**Expanded validate-pack.js critical-file checklist; confirmed npm pack tarball includes all runtime-required files with no gaps in the files whitelist**

## What Happened

Inspected the existing files array in package.json and ran npm pack to produce a tarball. Verified all critical runtime files from the task plan are present: dist/loader.js, dist/help-text.js, dist/cli.js, dist/app-paths.js, pkg/package.json, src/resources/extensions/umb/ (66 files), scripts/postinstall.js, scripts/link-workspace-packages.cjs, scripts/ensure-workspace-builds.cjs, packages/*, dist/web/*. Investigated native/ and confirmed it is build-time-only Rust source not needed in the tarball (compiled bindings ship via packages/native/, prebuilt binaries via optionalDependencies). Updated validate-pack.js to add 6 new required file checks and a directory prefix check for the umb extension.

## Verification

npm pack produced a valid 48.6MB tarball with 8225 files. All three verification grep checks passed: dist/loader.js (2 matches), src/resources/extensions/umb/ (66 matches), scripts/postinstall.js (1 match). No changes needed to the files whitelist in package.json.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `npm pack --ignore-scripts` | 0 | ✅ pass | 45000ms |
| 2 | `tar tzf ... | grep -c 'dist/loader.js'` | 0 | ✅ pass | 500ms |
| 3 | `tar tzf ... | grep -c 'src/resources/extensions/umb/'` | 0 | ✅ pass | 500ms |
| 4 | `tar tzf ... | grep -c 'scripts/postinstall.js'` | 0 | ✅ pass | 500ms |

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `scripts/validate-pack.js`
- `package.json`

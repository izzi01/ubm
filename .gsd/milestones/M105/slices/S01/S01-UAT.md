# S01: Global install setup (npm install -g .) — UAT

**Milestone:** M105
**Written:** 2026-04-11T04:51:53.855Z

# UAT: S01 — Global Install Setup

## Preconditions
- Node.js v24+ installed
- Fork tarball exists at `dist-test/umb-cli-2.70.0.tgz`
- No previous `umb-cli` global install (or run `npm uninstall -g umb-cli` first)

## Test Cases

### TC1: Fresh global install from tarball
1. Run: `GSD_SKIP_RTK_INSTALL=1 PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install -g ./dist-test/umb-cli-2.70.0.tgz`
2. **Expected**: Install succeeds with exit code 0, outputs "added N packages"

### TC2: Binary resolution
1. Run: `which umb`
2. **Expected**: Resolves to a path in the global npm bin directory (e.g., `/home/cid/.vfox/sdks/nodejs/bin/umb`)

### TC3: Version output
1. Run: `umb --version`
2. **Expected**: Exits 0, prints `2.70.0` (semver format)

### TC4: Help output
1. Run: `umb --help`
2. **Expected**: Exits 0, output contains "Usage:", "Options:", and "Subcommands:" sections

### TC5: Works from non-project directory
1. Run: `cd /tmp && umb --version`
2. **Expected**: Exits 0, prints `2.70.0` (same as TC3)

### TC6: Help shows subcommands
1. Run: `umb --help`
2. **Expected**: Output contains at least: config, install, remove, list, update, sessions, worktree, headless

### TC7: Postinstall workspace linking
1. Run: `GSD_SKIP_RTK_INSTALL=1 PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install -g ./dist-test/umb-cli-2.70.0.tgz 2>&1 | grep -i "linked"`
2. **Expected**: stderr contains message about linking workspace packages (e.g., "Linked 5 workspace packages")

### TC8: Verification script (CI gate)
1. Run: `bash scripts/verify-global-install.sh`
2. **Expected**: Exits 0, all internal assertions pass

### TC9: Cleanup
1. Run: `npm uninstall -g umb-cli`
2. **Expected**: Exits 0, `which umb` returns non-zero (binary removed)

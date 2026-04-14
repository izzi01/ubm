# S01: Global install setup (npm install -g .)

**Goal:** npm install -g . from the umb fork repo produces a working `umb` binary accessible from any directory. `umb --version` prints the version, `umb --help` shows usage text. Postinstall workspace linking and optional binary downloads succeed or degrade gracefully.
**Demo:** npm install -g . succeeds, umb --version prints version, umb --help shows usage

## Must-Haves

- npm install -g . succeeds from the fork repo\n- umb --version prints the package version\n- umb --help shows usage with Options and Subcommands sections\n- umb binary works from any directory (not just the fork repo)\n- scripts/verify-global-install.sh passes clean

## Proof Level

- This slice proves: operational

## Integration Closure

- Upstream surfaces consumed: dist/loader.js (bin entry), dist/help-text.js, dist/cli.js, pkg/package.json, src/resources/extensions/umb/, scripts/postinstall.js, scripts/link-workspace-packages.cjs\n- New wiring: global npm bin symlink → dist/loader.js, postinstall workspace linking in global context\n- What remains: S02 smoke test (TUI launch, /skill list, .umb/ config dir creation)

## Verification

- postinstall script emits stderr messages for linking/copying/skipped operations\n- loader.js emits clear error diagnostics for missing workspace packages\n- GSD_SKIP_RTK_INSTALL and PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD env vars control optional downloads

## Tasks

- [x] **T01: Validate npm pack tarball and fix missing entries** `est:30m`
  Run `npm pack` from the fork repo to produce a tarball, inspect its contents, and verify all critical runtime files are included. Fix any gaps in the `files` whitelist in package.json. Critical files that must be present: dist/loader.js (bin entry with shebang), dist/help-text.js, dist/cli.js, dist/app-paths.js, pkg/package.json, src/resources/extensions/umb/ (the ported extension), scripts/postinstall.js, scripts/link-workspace-packages.cjs, scripts/ensure-workspace-builds.cjs. Also verify the `native/` directory is included (needed for better-sqlite3 native bindings) and any other runtime dependencies not covered by the current files list.
  - Files: `package.json`, `scripts/validate-pack.js`
  - Verify: cd /home/cid/projects-personal/umb && npm pack 2>&1 && tar tzf umb-cli-*.tgz | grep -c 'dist/loader.js' && tar tzf umb-cli-*.tgz | grep -c 'src/resources/extensions/umb/' && tar tzf umb-cli-*.tgz | grep -c 'scripts/postinstall.js'

- [x] **T02: Test global install end-to-end and fix postinstall issues** `est:45m`
  Perform a real `npm install -g .` from the fork repo (with RTK and Playwright downloads skipped via env vars to keep it fast). Then verify: (1) `which umb` resolves to the global bin, (2) `umb --version` prints the correct version, (3) `umb --help` shows full usage text including subcommands, (4) the umb binary works from a different working directory (not the fork repo). Fix any issues found: missing files, broken symlinks, postinstall failures, or path resolution problems. If postinstall workspace linking fails in global context, fix link-workspace-packages.cjs. Document the install command and any required env vars for CI/clean installs.
  - Files: `scripts/postinstall.js`, `scripts/link-workspace-packages.cjs`, `scripts/ensure-workspace-builds.cjs`
  - Verify: umb --version prints version number (non-zero exit), umb --help shows usage with subcommands, umb works from /tmp or any non-project directory

- [x] **T03: Write install verification script** `est:15m`
  Create a lightweight bash script at scripts/verify-global-install.sh that automates the global install verification. The script should: (1) run npm install -g . with GSD_SKIP_RTK_INSTALL=1 and PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1, (2) check `which umb` resolves, (3) assert `umb --version` exits 0 and prints a semver, (4) assert `umb --help` exits 0 and contains expected sections (Usage, Options, Subcommands), (5) test umb runs from /tmp, (6) optionally run npm uninstall -g umb-cli to clean up. This script becomes the canonical verification for this slice and can be reused in CI.
  - Files: `scripts/verify-global-install.sh`
  - Verify: bash scripts/verify-global-install.sh exits 0

## Files Likely Touched

- package.json
- scripts/validate-pack.js
- scripts/postinstall.js
- scripts/link-workspace-packages.cjs
- scripts/ensure-workspace-builds.cjs
- scripts/verify-global-install.sh

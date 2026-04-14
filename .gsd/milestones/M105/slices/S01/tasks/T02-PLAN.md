---
estimated_steps: 1
estimated_files: 3
skills_used: []
---

# T02: Test global install end-to-end and fix postinstall issues

Perform a real `npm install -g .` from the fork repo (with RTK and Playwright downloads skipped via env vars to keep it fast). Then verify: (1) `which umb` resolves to the global bin, (2) `umb --version` prints the correct version, (3) `umb --help` shows full usage text including subcommands, (4) the umb binary works from a different working directory (not the fork repo). Fix any issues found: missing files, broken symlinks, postinstall failures, or path resolution problems. If postinstall workspace linking fails in global context, fix link-workspace-packages.cjs. Document the install command and any required env vars for CI/clean installs.

## Inputs

- `package.json`
- `scripts/postinstall.js`
- `scripts/link-workspace-packages.cjs`
- `scripts/ensure-workspace-builds.cjs`
- `dist/loader.js`
- `dist/help-text.js`

## Expected Output

- `scripts/postinstall.js`
- `scripts/link-workspace-packages.cjs`
- `scripts/ensure-workspace-builds.cjs`

## Verification

umb --version prints version number (non-zero exit), umb --help shows usage with subcommands, umb works from /tmp or any non-project directory

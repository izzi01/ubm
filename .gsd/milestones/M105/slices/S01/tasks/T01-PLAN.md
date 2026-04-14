---
estimated_steps: 1
estimated_files: 2
skills_used: []
---

# T01: Validate npm pack tarball and fix missing entries

Run `npm pack` from the fork repo to produce a tarball, inspect its contents, and verify all critical runtime files are included. Fix any gaps in the `files` whitelist in package.json. Critical files that must be present: dist/loader.js (bin entry with shebang), dist/help-text.js, dist/cli.js, dist/app-paths.js, pkg/package.json, src/resources/extensions/umb/ (the ported extension), scripts/postinstall.js, scripts/link-workspace-packages.cjs, scripts/ensure-workspace-builds.cjs. Also verify the `native/` directory is included (needed for better-sqlite3 native bindings) and any other runtime dependencies not covered by the current files list.

## Inputs

- `package.json`
- `scripts/validate-pack.js`

## Expected Output

- `package.json`
- `scripts/validate-pack.js`

## Verification

cd /home/cid/projects-personal/umb && npm pack 2>&1 && tar tzf umb-cli-*.tgz | grep -c 'dist/loader.js' && tar tzf umb-cli-*.tgz | grep -c 'src/resources/extensions/umb/' && tar tzf umb-cli-*.tgz | grep -c 'scripts/postinstall.js'

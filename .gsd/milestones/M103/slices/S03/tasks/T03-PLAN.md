---
estimated_steps: 4
estimated_files: 1
skills_used: []
---

# T03: Audit remaining gsd references in dist/

1. Verify all remaining gsd references in dist/ are only in the gsd extension directory (dist/resources/extensions/gsd/)
2. Verify all non-extension dist/ files use umb branding
3. Check dist/loader.js: process.title = 'umb', UMB_HOME, UMB_VERSION etc
4. Document which files still reference gsd and why (expected: gsd extension, @gsd scope dir, test files)

## Inputs

- `Built dist/`

## Expected Output

- `Audit report of remaining gsd references with justification`

## Verification

grep -r 'GSD\|gsd' dist/loader.js dist/app-paths.js dist/help-text.js dist/logo.js dist/cli.js 2>/dev/null | grep -v 'gsd-2\|github.com/gsd' | wc -l

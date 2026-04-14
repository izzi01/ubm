---
estimated_steps: 5
estimated_files: 1
skills_used: []
---

# T03: Build and verify loader binary

1. npm run build
2. Verify dist/loader.js exists
3. Run node dist/loader.js --version — should print version
4. Run node dist/loader.js --help — should print help text
5. Verify dist/ contains all expected files (loader.js, app-paths.js, cli.js, help-text.js, logo.js)

## Inputs

- `Installed deps`

## Expected Output

- `dist/ directory with compiled JS`
- `loader.js prints version on --version`

## Verification

cd /home/cid/projects-personal/umb && node dist/loader.js --version

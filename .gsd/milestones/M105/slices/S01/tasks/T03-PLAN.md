---
estimated_steps: 1
estimated_files: 1
skills_used: []
---

# T03: Write install verification script

Create a lightweight bash script at scripts/verify-global-install.sh that automates the global install verification. The script should: (1) run npm install -g . with GSD_SKIP_RTK_INSTALL=1 and PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1, (2) check `which umb` resolves, (3) assert `umb --version` exits 0 and prints a semver, (4) assert `umb --help` exits 0 and contains expected sections (Usage, Options, Subcommands), (5) test umb runs from /tmp, (6) optionally run npm uninstall -g umb-cli to clean up. This script becomes the canonical verification for this slice and can be reused in CI.

## Inputs

- `package.json`
- `dist/loader.js`

## Expected Output

- `scripts/verify-global-install.sh`

## Verification

bash scripts/verify-global-install.sh exits 0

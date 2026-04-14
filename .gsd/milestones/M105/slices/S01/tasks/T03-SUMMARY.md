---
id: T03
parent: S01
milestone: M105
key_files:
  - scripts/verify-global-install.sh
key_decisions:
  - (none)
duration: 
verification_result: passed
completed_at: 2026-04-11T04:50:24.696Z
blocker_discovered: false
---

# T03: Created scripts/verify-global-install.sh — 12-check end-to-end global install verification for umb-cli

**Created scripts/verify-global-install.sh — 12-check end-to-end global install verification for umb-cli**

## What Happened

Created scripts/verify-global-install.sh, a bash script that automates the full global install verification workflow for the umb-cli package. The script runs 12 checks across 6 steps: global install with skip-env-vars, which umb resolution, umb --version (exit code + semver format), umb --help (exit code + Usage/Options/Subcommands sections), cross-directory execution from /tmp, and env var verification. All 12 checks pass cleanly. The script includes colored output, a cleanup trap for npm uninstall -g, and configurable PKG_ROOT and CLEANUP_PKG env var overrides for CI flexibility.

## Verification

Ran bash scripts/verify-global-install.sh — all 12/12 checks passed: npm install -g succeeded with skip env vars, which umb resolves, umb --version exits 0 and prints semver 2.70.0, umb --help exits 0 and contains Usage/Options/Subcommands, umb works from /tmp, and both GSD_SKIP_RTK_INSTALL and PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD were active during install.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `bash scripts/verify-global-install.sh` | 0 | ✅ pass | 15000ms |
| 2 | `umb --version` | 0 | ✅ pass | 500ms |
| 3 | `umb --help` | 0 | ✅ pass | 500ms |
| 4 | `cd /tmp && umb --version` | 0 | ✅ pass | 500ms |

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `scripts/verify-global-install.sh`

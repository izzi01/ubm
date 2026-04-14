---
id: T02
parent: S01
milestone: M108
key_files:
  - (none)
key_decisions:
  - (none)
duration: 
verification_result: untested
completed_at: 2026-04-12T04:51:21.529Z
blocker_discovered: false
---

# T02: Removed update-check imports, gsd update handler, and startup check from cli.ts

**Removed update-check imports, gsd update handler, and startup check from cli.ts**

## What Happened

Removed three blocks from cli.ts: the update-check import, the `gsd update` command handler (lines 160-165), and the non-blocking startup checkForUpdates() call (lines 363-367). Also updated the version mismatch error message to reference umb-cli@latest instead of gsd-pi and removed the `gsd update` mention.

## Verification

grep -n for checkForUpdates|update-check|update-cmd|runUpdate returns no matches. grep -n for gsd-pi returns no matches.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| — | No verification commands discovered | — | — | — |

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

None.

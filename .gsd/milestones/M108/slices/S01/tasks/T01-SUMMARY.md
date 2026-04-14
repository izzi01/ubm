---
id: T01
parent: S01
milestone: M108
key_files:
  - (none)
key_decisions:
  - (none)
duration: 
verification_result: untested
completed_at: 2026-04-12T04:51:18.815Z
blocker_discovered: false
---

# T01: Deleted update-check.ts and update-cmd.ts; removed all update-check integration from cli.ts

**Deleted update-check.ts and update-cmd.ts; removed all update-check integration from cli.ts**

## What Happened

Deleted src/update-check.ts and src/update-cmd.ts from the fork repo. Removed the checkForUpdates import, the startup checkForUpdates() call block, and the `gsd update` command handler from cli.ts. Updated the stale error message in exitIfManagedResourcesAreNewer to reference umb-cli instead of gsd-pi/gsd update.

## Verification

grep confirms zero remaining references to checkForUpdates, update-check, update-cmd, runUpdate, or gsd-pi in cli.ts. Both deleted files return No such file.

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

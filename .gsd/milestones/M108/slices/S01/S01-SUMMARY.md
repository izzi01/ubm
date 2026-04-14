---
id: S01
parent: M108
milestone: M108
provides:
  - (none)
requires:
  []
affects:
  []
key_files:
  - (none)
key_decisions:
  - (none)
patterns_established:
  - (none)
observability_surfaces:
  - none
drill_down_paths:
  []
duration: ""
verification_result: passed
completed_at: 2026-04-12T04:52:07.048Z
blocker_discovered: false
---

# S01: Remove update-check module and CLI integration

**Deleted update-check.ts and update-cmd.ts; removed all update integration from cli.ts**

## What Happened

Two tasks: (1) Deleted src/update-check.ts and src/update-cmd.ts from the fork. (2) Removed from cli.ts: the checkForUpdates import, the `gsd update` command handler, and the non-blocking startup checkForUpdates() call. Updated the version mismatch error message to reference umb-cli@latest instead of gsd-pi. Zero remaining references to update-check, update-cmd, runUpdate, or gsd-pi in cli.ts.

## Verification

grep confirms zero remaining references to checkForUpdates, update-check, update-cmd, runUpdate, and gsd-pi in cli.ts. Both deleted files confirmed gone.

## Requirements Advanced

None.

## Requirements Validated

None.

## New Requirements Surfaced

None.

## Requirements Invalidated or Re-scoped

None.

## Deviations

None.

## Known Limitations

None.

## Follow-ups

None.

## Files Created/Modified

None.

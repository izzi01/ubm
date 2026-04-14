---
id: M108
title: "Remove GSD update check mechanism"
status: complete
completed_at: 2026-04-12T04:52:18.238Z
key_decisions:
  - compareSemver was inlined into resource-loader.ts rather than extracted to a shared util, since it's only used in one place now
  - Version mismatch error message updated to reference umb-cli@latest since this is the fork package name
  - update-service.ts was dead code (no production imports) — safely deleted without any runtime impact
key_files:
  - src/update-check.ts (deleted)
  - src/update-cmd.ts (deleted)
  - src/web/update-service.ts (deleted)
  - src/tests/update-check.test.ts (deleted)
  - src/cli.ts (removed update-check integration)
  - src/resource-loader.ts (inlined compareSemver)
  - src/tests/windows-portability.test.ts (removed update-service reference)
lessons_learned:
  - (none)
---

# M108: Remove GSD update check mechanism

**Removed all GSD update-check infrastructure from the fork (5 files deleted, 3 files modified)**

## What Happened

Removed all GSD update-check infrastructure from the fork. Five files deleted (update-check.ts, update-cmd.ts, update-service.ts, update-check.test.ts, and their references). cli.ts cleaned of startup update check, `gsd update` command handler, and stale gsd-pi references. compareSemver inlined into resource-loader.ts as a local function. Windows-portability test updated. Zero remaining references to the update-check system.

## Success Criteria Results



## Definition of Done Results



## Requirement Outcomes



## Deviations

None.

## Follow-ups

None.

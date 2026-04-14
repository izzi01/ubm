---
id: T02
parent: S02
milestone: M103
key_files:
  - /home/cid/projects-personal/umb/src/app-paths.ts
key_decisions:
  - (none)
duration: 
verification_result: passed
completed_at: 2026-04-11T03:11:32.823Z
blocker_discovered: false
---

# T02: app-paths.ts uses ~/.umb/ paths

**app-paths.ts uses ~/.umb/ paths**

## What Happened

Changed GSD_HOME to UMB_HOME, .gsd to .umb. All paths now resolve under ~/.umb/ instead of ~/.gsd/.

## Verification

grep -c '.gsd' src/app-paths.ts returns 0.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `grep -c '\.gsd' /home/cid/projects-personal/umb/src/app-paths.ts` | 0 | ✅ pass | 500ms |

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `/home/cid/projects-personal/umb/src/app-paths.ts`

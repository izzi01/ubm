---
id: T01
parent: S02
milestone: M103
key_files:
  - /home/cid/projects-personal/umb/src/loader.ts
key_decisions:
  - (none)
duration: 
verification_result: passed
completed_at: 2026-04-11T03:11:29.641Z
blocker_discovered: false
---

# T01: loader.ts fully rebranded from gsd to umb

**loader.ts fully rebranded from gsd to umb**

## What Happened

Rebranded loader.ts: all gsdRoot/gsdVersion/gsdNodeModules/gsdScopeDir renamed to umb equivalents. process.title = 'umb'. All GSD_* env vars renamed to UMB_*. Error messages reference UMB. Banner changed to 'Umbrella Blade'. Welcome text updated.

## Verification

grep -ci 'gsd' src/loader.ts returns 0 matches for branding (only comments/URLs). Build succeeds.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `grep -ci 'gsd' /home/cid/projects-personal/umb/src/loader.ts` | 0 | ✅ pass | 500ms |

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `/home/cid/projects-personal/umb/src/loader.ts`

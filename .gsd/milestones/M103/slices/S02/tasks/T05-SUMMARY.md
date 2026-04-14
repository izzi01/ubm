---
id: T05
parent: S02
milestone: M103
key_files:
  - /home/cid/projects-personal/umb/pkg/package.json
  - /home/cid/projects-personal/umb/package.json
key_decisions:
  - (none)
duration: 
verification_result: passed
completed_at: 2026-04-11T03:11:43.328Z
blocker_discovered: false
---

# T05: Package.json files rebranded, build succeeds, --help shows UMB branding

**Package.json files rebranded, build succeeds, --help shows UMB branding**

## What Happened

pkg/package.json: piConfig.name='umb', piConfig.configDir='.umb', name='umb-cli'. Root package.json: name='umb-cli', bin.umb='dist/loader.js' (removed gsd/gsd-cli entries), description='UMB — Umbrella Blade coding terminal', piConfig.name='umb', piConfig.configDir='.umb'. Also updated welcome-screen.ts (GSD_LOGO→UMB_LOGO), rtk.ts (GSD_* env vars→UMB_*), cli.ts (UMB_VERSION, UMB_FIRST_RUN_BANNER, UMB_RTK_*). Build succeeds, --version prints 2.70.0, --help shows 'UMB v2.70.0 — Umbrella Blade'.

## Verification

npm run build succeeds. node dist/loader.js --version prints 2.70.0. node dist/loader.js --help shows 'UMB v2.70.0 — Umbrella Blade'.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `cd /home/cid/projects-personal/umb && node dist/loader.js --help | head -1` | 0 | ✅ pass | 1000ms |

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `/home/cid/projects-personal/umb/pkg/package.json`
- `/home/cid/projects-personal/umb/package.json`

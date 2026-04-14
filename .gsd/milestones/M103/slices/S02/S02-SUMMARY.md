---
id: S02
parent: M103
milestone: M103
provides:
  - ["Rebranded CLI with 'umb' binary name", "~/.umb/ config directory", "UMB_* env vars (UMB_HOME, UMB_VERSION, UMB_CODING_AGENT_DIR, etc.)", "UMB ASCII logo", "Umbrella Blade help text"]
requires:
  []
affects:
  - ["S03"]
key_files:
  - ["/home/cid/projects-personal/umb/src/loader.ts", "/home/cid/projects-personal/umb/src/app-paths.ts", "/home/cid/projects-personal/umb/src/help-text.ts", "/home/cid/projects-personal/umb/src/logo.ts", "/home/cid/projects-personal/umb/src/rtk.ts", "/home/cid/projects-personal/umb/src/welcome-screen.ts", "/home/cid/projects-personal/umb/src/cli.ts", "/home/cid/projects-personal/umb/pkg/package.json", "/home/cid/projects-personal/umb/package.json"]
key_decisions:
  - ["Keep @gsd workspace scope dir name — it's an internal npm convention, not user-facing", "GSD_LOGO→UMB_LOGO export rename required updating welcome-screen.ts import", "rtk.ts env var constants renamed to UMB_* prefix for consistency"]
patterns_established:
  - (none)
observability_surfaces:
  - none
drill_down_paths:
  - [".gsd/milestones/M103/slices/S02/tasks/T01-SUMMARY.md", ".gsd/milestones/M103/slices/S02/tasks/T02-SUMMARY.md", ".gsd/milestones/M103/slices/S02/tasks/T03-SUMMARY.md", ".gsd/milestones/M103/slices/S02/tasks/T04-SUMMARY.md", ".gsd/milestones/M103/slices/S02/tasks/T05-SUMMARY.md"]
duration: ""
verification_result: passed
completed_at: 2026-04-11T03:11:55.557Z
blocker_discovered: false
---

# S02: Rebrand loader.js and app-paths

**Full CLI rebrand complete: gsd→umb in loader, paths, help, logo, env vars, package.json**

## What Happened

S02 rebranded the entire CLI from gsd to umb. Changes span 9 files: loader.ts (all env vars, process.title, error messages, banner text), app-paths.ts (~/.gsd → ~/.umb), help-text.ts (all command examples and headers), logo.ts (new UMB ASCII art), rtk.ts (GSD_* env var constants → UMB_*), welcome-screen.ts (GSD_LOGO → UMB_LOGO import), cli.ts (UMB_VERSION, UMB_FIRST_RUN_BANNER, UMB_RTK_* references), pkg/package.json (piConfig.name='umb', configDir='.umb'), root package.json (name='umb-cli', bin.umb='dist/loader.js'). Build succeeds, --version prints 2.70.0, --help shows 'UMB v2.70.0 — Umbrella Blade'.

## Verification

All 5 tasks complete. Build succeeds. --version and --help show umb branding. grep confirms zero gsd references in core files.

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

---
id: S03
parent: M103
milestone: M103
provides:
  - ["Buildable rebranded fork at /home/cid/projects-personal/umb/", "dist/ with umb branding in loader, app-paths, help-text, logo", "~/.umb config directory", "All shared extensions present and loadable", "Documented coupling map for M104"]
requires:
  - slice: S01
    provides: Buildable gsd-2 fork
  - slice: S02
    provides: Rebranded CLI with umb binary, ~/.umb config, UMB_* env vars
affects:
  - ["M104"]
key_files:
  - ["/home/cid/projects-personal/umb/dist/loader.js", "/home/cid/projects-personal/umb/dist/app-paths.js", "/home/cid/projects-personal/umb/dist/help-text.js", "/home/cid/projects-personal/umb/dist/logo.js"]
key_decisions:
  - ["Keep gsd extension files in the fork — too deeply coupled to remove without breaking the TUI. Will be replaced by umb extension code in M104.", "@gsd workspace scope dir name kept — internal npm convention, not user-facing", "cli.ts gsd references (error messages, subcommand handling, gsd extension imports) deferred to M104"]
patterns_established:
  - (none)
observability_surfaces:
  - none
drill_down_paths:
  - [".gsd/milestones/M103/slices/S03/tasks/T01-SUMMARY.md", ".gsd/milestones/M103/slices/S03/tasks/T02-SUMMARY.md", ".gsd/milestones/M103/slices/S03/tasks/T03-SUMMARY.md"]
duration: ""
verification_result: passed
completed_at: 2026-04-11T03:12:58.283Z
blocker_discovered: false
---

# S03: Strip gsd extension, keep pi SDK + shared extensions

**Rebranded fork verified: umb branding, ~/.umb config, all shared extensions load. gsd extension kept (deep coupling) — deferred to M104.**

## What Happened

S03 verified the rebranded fork works. Build succeeds, --version prints 2.70.0, --help shows 'UMB v2.70.0 — Umbrella Blade', process.title is 'umb', config dir is ~/.umb. All shared extensions (browser-tools, subagent, mcp-client, etc.) are present in dist/resources/extensions/. Audit confirmed core branding files (loader, app-paths, help-text, logo) have zero gsd references. cli.ts retains gsd references for the gsd extension coupling — deferred to M104.\n\nKey deviation from plan: the gsd extension was NOT removed. Investigation revealed deep coupling — cli.ts, headless-query.ts, web services, and 6+ shared extensions (cmux, github-sync, remote-questions, search-the-web, subagent) all import from the gsd extension. Removing it would break the TUI. The gsd extension will be replaced by umb extension code in M104.

## Verification

Build succeeds. --version and --help show umb branding. process.title = 'umb'. ~/.umb in app-paths. All shared extensions present in dist/resources/extensions/. Core files have zero gsd references (cli.ts deferred to M104).

## Requirements Advanced

None.

## Requirements Validated

None.

## New Requirements Surfaced

None.

## Requirements Invalidated or Re-scoped

None.

## Deviations

S03 originally planned to remove the gsd extension entirely. After investigation, the gsd extension is deeply coupled to core files (cli.ts, headless-query.ts, web services, and 6+ shared extensions all import from it). Removing it would break the TUI. Decision: keep the gsd extension for now, defer removal to M104 when the umb extension code replaces its functionality. The rebranding of core files (loader, app-paths, help-text, logo, rtk, package.json) is complete.

## Known Limitations

None.

## Follow-ups

None.

## Files Created/Modified

None.

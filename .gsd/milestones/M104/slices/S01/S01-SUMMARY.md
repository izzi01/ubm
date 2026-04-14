---
id: S01
parent: M104
milestone: M104
provides:
  - ["All iz-to-mo-vu extension source files in fork at src/resources/extensions/umb/", "All imports updated to @gsd/pi-coding-agent", "better-sqlite3 dependency added", "tsc --noEmit passes with zero errors"]
requires:
  []
affects:
  - ["S02", "S03"]
key_files:
  - ["/home/cid/projects-personal/umb/src/resources/extensions/umb/", "/home/cid/projects-personal/umb/package.json"]
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
completed_at: 2026-04-11T03:25:08.888Z
blocker_discovered: false
---

# S01: Port iz-to-mo-vu extension into the fork

**All iz-to-mo-vu extension source files ported into the fork at src/resources/extensions/umb/ with zero TypeScript compilation errors**

## What Happened

Three tasks executed in sequence to port the iz-to-mo-vu extension code into the forked gsd-2 repo at ~/projects-personal/umb/.

T01 copied all source subdirectories (commands, dashboard, db, import, model-config, patterns, skill-registry, state-machine, tools, extension index.ts) into src/resources/extensions/umb/, plus created package.json and extension-manifest.json.

T02 performed a bulk import rewrite across 44 TypeScript files, replacing all @mariozechner/pi-coding-agent references with @gsd/pi-coding-agent. grep confirmed zero remaining references.

T03 added better-sqlite3 and @types/better-sqlite3 to the fork's package.json, ran npm install, and verified tsc --noEmit passes with zero TS errors across the entire project including all umb extension files.

## Verification

T01: ls confirms all 10 subdirectories plus index.ts, package.json, extension-manifest.json present. T02: grep -r '@mariozechner' returns 0 matches. T03: npx tsc --noEmit produces zero error TS lines. All three verification checks passed.

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

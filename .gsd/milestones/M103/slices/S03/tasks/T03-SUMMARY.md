---
id: T03
parent: S03
milestone: M103
key_files:
  - /home/cid/projects-personal/umb/dist/
key_decisions:
  - (none)
duration: 
verification_result: passed
completed_at: 2026-04-11T03:12:47.499Z
blocker_discovered: false
---

# T03: Audit: core files clean, cli.ts gsd refs deferred to M104

**Audit: core files clean, cli.ts gsd refs deferred to M104**

## What Happened

Audit of remaining gsd references in dist/ core files (non-extension):\n\n**Clean (0 gsd refs):** dist/app-paths.js, dist/help-text.js, dist/logo.js\n**Clean except expected:** dist/loader.js — only @gsd scope dir (npm workspace convention, not branding)\n**Expected gsd refs (deferred to M104):** dist/cli.ts — imports loadEffectiveGSDPreferences from gsd extension, error messages say 'gsd', subcommand handling references 'gsd'. These will be updated when the gsd extension is replaced by the umb extension in M104.\n**gsd extension directory:** dist/resources/extensions/gsd/ — stays until M104\n\nDecision: cli.ts gsd references are deferred to M104 because removing them now would break the deeply coupled preferences/headless/dispatch system that the TUI needs to function.

## Verification

grep confirms 0 gsd refs in loader/app-paths/help-text/logo. cli.ts gsd refs documented and deferred.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `cd /home/cid/projects-personal/umb && grep -c 'GSD\|gsd' dist/app-paths.js dist/help-text.js dist/logo.js 2>/dev/null` | 0 | ✅ pass | 500ms |

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `/home/cid/projects-personal/umb/dist/`

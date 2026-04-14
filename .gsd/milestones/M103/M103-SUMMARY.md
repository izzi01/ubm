---
id: M103
title: "Fork gsd-2 and rebrand to umb"
status: complete
completed_at: 2026-04-11T03:13:20.428Z
key_decisions:
  - Clone gsd-2 directly (not fork on GitHub) to ~/projects-personal/umb/
  - Rebrand all GSD_* env vars to UMB_* prefix
  - Config dir changed from ~/.gsd to ~/.umb
  - New UMB ASCII logo using Unicode box-drawing characters
  - @gsd npm workspace scope dir kept (internal convention, not branding)
  - gsd extension kept due to deep coupling — removal deferred to M104
key_files:
  - /home/cid/projects-personal/umb/src/loader.ts
  - /home/cid/projects-personal/umb/src/app-paths.ts
  - /home/cid/projects-personal/umb/src/help-text.ts
  - /home/cid/projects-personal/umb/src/logo.ts
  - /home/cid/projects-personal/umb/src/rtk.ts
  - /home/cid/projects-personal/umb/src/welcome-screen.ts
  - /home/cid/projects-personal/umb/src/cli.ts
  - /home/cid/projects-personal/umb/pkg/package.json
  - /home/cid/projects-personal/umb/package.json
lessons_learned:
  - gsd extension is deeply coupled — 6+ shared extensions and core cli.ts import from it. Can't remove without replacement.
  - gsd-pi v2.70.0 source has more files than the installed v2.67.0 — build pipeline includes web staging
  - npm run build in gsd-2 does full tsc + resource copy + theme copy + web build — takes ~30s
---

# M103: Fork gsd-2 and rebrand to umb

**gsd-2 forked to ~/projects-personal/umb/, fully rebranded to umb (loader, paths, help, logo, env vars, package.json), builds and runs with umb branding**

## What Happened

M103 forked gsd-2 and rebranded it to umb across 9 source files.

S01 cloned gsd-2 from GitHub into /home/cid/projects-personal/umb/, installed all dependencies (554 packages, 7 workspace packages built), and verified the build pipeline works. node dist/loader.js --version prints 2.70.0.

S02 performed the full rebrand: loader.ts (all env vars GSD_* → UMB_*, process.title = 'umb', error messages, banner 'Umbrella Blade'), app-paths.ts (~/.gsd → ~/.umb via UMB_HOME), help-text.ts (all commands use 'umb' binary, 'Umbrella Blade' tagline), logo.ts (new UMB ASCII art using Unicode box-drawing), rtk.ts (UMB_RTK_* env vars, UMB_HOME path), welcome-screen.ts (UMB_LOGO import), cli.ts (UMB_VERSION, UMB_FIRST_RUN_BANNER, UMB_RTK_* references), pkg/package.json (piConfig.name='umb', configDir='.umb'), root package.json (name='umb-cli', bin.umb='dist/loader.js').

S03 verified the rebranded fork: build succeeds, --version prints 2.70.0, --help shows 'UMB v2.70.0 — Umbrella Blade', process.title = 'umb', ~/.umb config dir. Key deviation: the gsd extension was NOT removed because cli.ts, headless-query.ts, and 6+ shared extensions import from it. Removal deferred to M104 when umb extension code replaces it.

## Success Criteria Results

- ✅ gsd-2 cloned to ~/projects-personal/umb/ — done in S01
- ✅ npm install succeeds — done in S01
- ✅ npm run build produces dist/ — done in S01
- ✅ node dist/loader.js --version prints version — verified 2.70.0
- ✅ process.title = 'umb' — verified in dist/loader.js
- ✅ All GSD_* env vars renamed to UMB_* — verified (loader.ts, rtk.ts)
- ✅ pkg/package.json piConfig.name = 'umb' — done
- ✅ package.json bin.umb = 'dist/loader.js' — done
- ✅ ~/.umb config dir — verified in dist/app-paths.js
- ⚠️ gsd extension NOT removed — deferred to M104 (deep coupling)

## Definition of Done Results

- ✅ All 3 slices complete (S01, S02, S03)
- ✅ All slice summaries exist
- ✅ Build succeeds after rebranding
- ✅ --version and --help show umb branding
- ✅ Cross-slice integration: S01 provides buildable fork → S02 rebrands → S03 verifies

## Requirement Outcomes

No requirements tracked for this milestone (infrastructure milestone).

## Deviations

S03 originally planned to remove the gsd extension. After investigation, the gsd extension is deeply coupled to cli.ts, headless-query.ts, web services, and 6+ shared extensions. Removal deferred to M104 — the gsd extension stays until umb extension code replaces it.

## Follow-ups

None.

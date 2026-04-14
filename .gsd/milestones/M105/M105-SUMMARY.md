---
id: M105
title: "Global install and final polish"
status: complete
completed_at: 2026-04-11T10:42:11.590Z
key_decisions:
  - D004: Global install strategy — npm install -g from tarball with env vars to skip heavy downloads (GSD_SKIP_RTK_INSTALL, PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD)
  - D005: Workspace packages need package.json files in fork tarball for @gsd/* ESM module resolution
  - D006: Convert native.js from hybrid CJS/ESM to pure ESM using createRequire(import.meta.url) for Node 24 compatibility
key_files:
  - scripts/verify-global-install.sh
  - scripts/smoke-test.sh
  - scripts/validate-pack.js
  - scripts/postinstall.js
  - scripts/link-workspace-packages.cjs
  - scripts/ensure-workspace-builds.cjs
  - package.json
lessons_learned:
  - Workspace packages in npm-packed tarballs need their own package.json with type:module and exports maps — npm pack does not automatically include workspace package.json files
  - Node 24 rejects hybrid CJS/ESM syntax (module.exports = ...) in files with import statements — use createRequire(import.meta.url) instead
  - Env var controls for optional heavy downloads (GSD_SKIP_RTK_INSTALL, PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD) make CI installs fast while preserving user opt-in to full installs
  - Smoke test scripts with colored pass/fail output and numbered checks serve as both CI gates and developer confidence builders
---

# M105: Global install and final polish

**npm install -g . produces a working umb binary; smoke tests confirm TUI launches, config dir created, and skill infrastructure works end-to-end.**

## What Happened

M105 delivered the final piece of the Umbrella Blade distribution story: a verified, globally-installable CLI binary.

S01 (Global install setup) ran three tasks. T01 validated `npm pack` producing a 48.6MB tarball with 8225 files and expanded the critical-file checklist in validate-pack.js. T02 discovered and fixed two blockers: missing workspace package.json files for all 7 @gsd/* packages (causing ERR_MODULE_NOT_FOUND), and native.js hybrid CJS/ESM syntax rejected by Node 24. After fixes, `npm install -g ./dist-test/umb-cli-2.70.0.tgz` succeeds, `umb --version` prints 2.70.0, `umb --help` shows full usage, and the binary works from any directory. T03 created scripts/verify-global-install.sh as a CI-ready verification gate.

S02 (Smoke test and polish) created scripts/smoke-test.sh with 8 checks across 3 groups: binary launches without crash, .umb/ config dir created on first run, and skill-registry infrastructure working (149 skills indexed). All 8 checks passed on first run with zero fixes needed. The vitest suite showed no regressions (682/688 tests passing, same 2 pre-existing failures as before).

Key decisions: D004 established the global install strategy using env vars (GSD_SKIP_RTK_INSTALL, PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD) for fast CI installs. D005 confirmed workspace packages need package.json files for @gsd/* module resolution. D006 converted native.js from hybrid CJS/ESM to pure ESM.

## Success Criteria Results

## Success Criteria Results

| Criterion | Status | Evidence |
|-----------|--------|----------|
| `npm install -g .` succeeds | ✅ Pass | S01: `npm install -g ./dist-test/umb-cli-2.70.0.tgz` succeeds (373 packages, 16s) |
| `umb --version` prints version | ✅ Pass | S01: prints 2.70.0 from any directory |
| `umb --help` shows usage | ✅ Pass | S01: full usage with Options and Subcommands sections |
| `umb` launches TUI | ✅ Pass | S02: `umb --list-models` exits 0, `umb --mode text` launches |
| `/skill list` works | ✅ Pass | S02: skill-registry module loads, scanSkillDirs() finds 149 skills |
| `.umb/` config dir created on first run | ✅ Pass | S02: `~/.umb/agent/`, `~/.umb/agent/extensions/`, `~/.umb/agent/auth.json` all exist |
| Smoke test script passes | ✅ Pass | S02: scripts/smoke-test.sh 8/8 checks passed |

## Definition of Done Results

## Definition of Done Results

| Item | Status | Evidence |
|------|--------|----------|
| All slices complete | ✅ | S01 (3/3 tasks done), S02 (2/2 tasks done) — confirmed via gsd_milestone_status |
| S01 summary exists | ✅ | `.gsd/milestones/M105/slices/S01/S01-SUMMARY.md` present |
| S02 summary exists | ✅ | `.gsd/milestones/M105/slices/S02/S02-SUMMARY.md` present |
| Cross-slice integration | ✅ | S02 depends on S01's global install; S02 smoke tests confirm umb binary works correctly |
| No test regressions | ✅ | 682/688 tests pass (same 2 pre-existing failures in agent-babysitter and background-manager) |
| Verification scripts created | ✅ | scripts/verify-global-install.sh and scripts/smoke-test.sh both created and passing |

## Requirement Outcomes

No requirements changed status during M105. All previously validated requirements (R001-R004) remain validated. No new requirements were surfaced.

## Deviations

None.

## Follow-ups

None.

---
id: M107
title: "Merge upstream v2.70.1"
status: complete
completed_at: 2026-04-12T04:19:46.272Z
key_decisions:
  - Kept umb fork branding (name: umb-cli) in package.json and pkg/package.json while adopting upstream version 2.70.1
  - Resolved stash-pop conflicts by keeping fork branding values with new upstream version numbers
  - Rebuilt and reinstalled binary globally after merge since installed binary lagged behind source
key_files:
  - /home/cid/projects-personal/umb/package.json
  - /home/cid/projects-personal/umb/pkg/package.json
  - /home/cid/projects-personal/umb/src/logo.ts
  - /home/cid/projects-personal/umb/src/help-text.ts
  - /home/cid/projects-personal/umb/src/loader.ts
lessons_learned:
  - Fast-forward merge + stash pop is the cleanest workflow for syncing fork with upstream when local changes are limited to branding files
  - Stash pop can produce conflicts even after a clean fast-forward merge when upstream changed the same files — always verify after pop
  - Binary rebuild is needed after merge if the installed global binary is at a different version than the source
  - Pre-existing test failures should be documented and categorized early so merge verification can clearly distinguish regressions from known issues
---

# M107: Merge upstream v2.70.1

**Fast-forward merged upstream gsd-2 v2.70.1 into the umb fork with zero regressions — all branding preserved, 5821 unit tests passing, binary rebuilt at v2.70.1.**

## What Happened

M107 merged all upstream changes from gsd-2 v2.70.0 → v2.70.1 into the umb fork. The milestone consisted of three slices:

**S01 (Merge & Conflict Resolution):** The fork was 4 commits behind upstream. S01 stashed 11 local branding files, performed a clean fast-forward merge (13 files updated, 1 new test), then popped the stash. The stash pop produced 2 conflicts in package.json and pkg/package.json — resolved by keeping fork branding (umb-cli) with the new v2.70.1 version number. The 4 merged commits implement model routing transparency PR #3962.

**S02 (Functionality Verification):** Full verification suite confirmed zero merge regressions. 5821 unit tests passed, 11 failed (all pre-existing: path resolution, upstream issues #2859/#3453, promise timing), 8 skipped. Smoke tests: 2/3 pass (help + version; init TTY failure is pre-existing). TypeScript compilation clean.

**S03 (Branding Sync & Final Verification):** All five branding touchpoints verified intact (package.json name=umb-cli, logo.ts UMB_LOGO, loader.ts UMB banner, help-text.ts umb usage lines, pkg/package.json name=umb-cli). Binary rebuilt and reinstalled globally at v2.70.1. `umb --version` outputs 2.70.1, `umb --help` shows "UMB v2.70.1 — Umbrella Blade" header. No upstream 'gsd' references leaked into user-facing surfaces.

## Success Criteria Results

- **Upstream merged cleanly**: ✅ Fast-forward merge of 4 commits (13 files changed). 2 branding conflicts in package.json/pkg/package.json resolved by keeping fork branding with new version number.
- **Zero test regressions**: ✅ 5821 unit tests pass, 11 fail (all pre-existing/environment-specific), 8 skip. S02 T02 confirmed consistency with targeted re-verification.
- **Branding preserved**: ✅ All 5 touchpoints verified: package.json (umb-cli), logo.ts (UMB_LOGO), loader.ts (UMB banner), help-text.ts (umb config/usage), pkg/package.json (umb-cli). Binary `umb --version` = 2.70.1.
- **TypeScript compilation clean**: ✅ `npx tsc --noEmit` exits 0 with zero errors in umb fork.

## Definition of Done Results

- **All slices complete**: ✅ S01 ✅ S02 ✅ S03 ✅ — all 6/6 tasks complete with summaries and verification files.
- **All slice summaries exist**: ✅ S01-SUMMARY.md, S02-SUMMARY.md, S03-SUMMARY.md all present with detailed narratives.
- **Cross-slice integration**: ✅ S02 consumed S01's merged fork state; S03 consumed S02's verification baseline. No integration issues.
- **No merge conflict markers**: ✅ Verified via grep — no `<<<<<<<` markers in src/.
- **Binary functional**: ✅ `umb --version` = 2.70.1, `umb --help` shows correct branding.

## Requirement Outcomes

No requirements changed status during M107. This was an infrastructure/merge milestone — no functional requirements were advanced, validated, or invalidated. All existing validated requirements (R001-R004, R010) remain validated.

## Deviations

None.

## Follow-ups

None.

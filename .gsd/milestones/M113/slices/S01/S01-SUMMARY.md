---
id: S01
parent: M113
milestone: M113
provides:
  - ["Git-tracked .gsd directory with planning artifacts that travel with branches via git worktree/checkout", "Correct .gitignore configuration: 25 runtime patterns ignored, all planning .md files tracked", "Foundation for S02 (remove worktree sync layer) — artifacts are now branch-portable without sync code"]
requires:
  []
affects:
  []
key_files:
  - [".gsd/", ".gitignore"]
key_decisions:
  - (none)
patterns_established:
  - (none)
observability_surfaces:
  - none
drill_down_paths:
  - [".gsd/milestones/M113/slices/S01/tasks/T01-SUMMARY.md"]
duration: ""
verification_result: passed
completed_at: 2026-04-14T02:21:01.866Z
blocker_discovered: false
---

# S01: .gitignore + tracking fix

**Converted .gsd from symlink to real directory and configured .gitignore so 8 planning artifacts + 355 milestone files are git-tracked while runtime files remain gitignored.**

## What Happened

S01 replaced the `.gsd` symlink (pointing to `~/.gsd/projects/7f9558836eeb`) with a real directory containing all files from the external location. This is the foundational change for the branchless worktree architecture — planning artifacts now travel with branches via git, eliminating the need for file-copy sync logic.

The .gitignore was updated to remove three blanket `.gsd` ignore rules and replace them with 25 specific runtime patterns covering: database files (gsd.db, .db-shm, .db-wal), STATE.md, activity/, runtime/, journal/, auto.lock, metrics.json, completed-units files, various JSONL logs, state-manifest.json, repo-meta.json, routing-history.json, reports/, research/, and milestone ephemeral files (VERIFY.json, CONTINUE.md, anchors/).

Verification confirmed: .gsd is a real directory (not symlink), all 8 planning .md files are staged, 355 milestone files are staged, and all runtime files are correctly gitignored.

## Verification

All 6 verification checks passed: (1) .gsd is a real directory not a symlink, (2) 8 planning .md files staged in git, (3) 5+ milestone files staged (355 total), (4) .gsd/gsd.db is gitignored, (5) .gsd/PROJECT.md is NOT gitignored, (6) .gsd/STATE.md is gitignored. Additionally verified zero runtime files leaked into staging area.

## Requirements Advanced

- R023 — Planning artifacts now tracked in git; runtime files gitignored. Validates the core architectural premise of M113.

## Requirements Validated

- R023 — .gsd converted from symlink to real directory. 8 planning .md files + 355 milestone files tracked in git. Runtime files (gsd.db, STATE.md, activity/, runtime/, journal/, etc.) gitignored via 25 specific patterns. git check-ignore confirms correct behavior for all categories.

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

---
id: T01
parent: S01
milestone: M113
key_files:
  - .gsd/
  - .gitignore
key_decisions:
  - (none)
duration: 
verification_result: passed
completed_at: 2026-04-14T02:19:24.289Z
blocker_discovered: false
---

# T01: Replaced .gsd symlink with real directory and configured .gitignore so planning artifacts are git-tracked while runtime files remain ignored

**Replaced .gsd symlink with real directory and configured .gitignore so planning artifacts are git-tracked while runtime files remain ignored**

## What Happened

1. Resolved the `.gsd` symlink target (`~/.gsd/projects/7f9558836eeb`), removed the symlink, and copied all files into a real `.gsd` directory using `cp -a`.
2. Edited `.gitignore` to remove three `.gsd`-related blanket ignore rules (`.gsd/`, `.gsd`, `.gsd-id`) and added a targeted block of 25 runtime-specific patterns (database files, STATE.md, activity/, runtime/, journal/, metrics, logs, reports, research, and milestone ephemeral files).
3. Staged all 8 planning artifact `.md` files plus milestone planning files in git.
4. Verified all 6 checks pass: real directory, 8 planning files staged, milestone files staged, runtime files ignored, planning files not ignored, STATE.md ignored.
5. Confirmed no runtime files leaked into staging, `.gsd-id` is preserved, and GSD DB is still accessible (16 milestones readable).

## Verification

All 6 verification checks passed: (1) .gsd is a real directory not a symlink, (2) 8 planning .md files staged in git, (3) 5+ milestone files staged, (4) .gsd/gsd.db is gitignored, (5) .gsd/PROJECT.md is NOT gitignored, (6) .gsd/STATE.md is gitignored. Also confirmed no runtime files leaked into staging area and GSD DB remains accessible.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `test -d .gsd && ! test -L .gsd` | 0 | ✅ pass | 50ms |
| 2 | `git ls-files --cached .gsd/*.md | wc -l` | 0 | ✅ pass | 100ms |
| 3 | `git ls-files --cached .gsd/milestones/ | head -5 | wc -l` | 0 | ✅ pass | 100ms |
| 4 | `git check-ignore -q .gsd/gsd.db` | 0 | ✅ pass | 50ms |
| 5 | `! git check-ignore -q .gsd/PROJECT.md` | 0 | ✅ pass | 50ms |
| 6 | `git check-ignore -q .gsd/STATE.md` | 0 | ✅ pass | 50ms |

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `.gsd/`
- `.gitignore`

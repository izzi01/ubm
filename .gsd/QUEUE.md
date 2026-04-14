# Queue

## M109: Remove legacy slice branch artifacts and dead isolation preferences

**Added:** 2026-04-12
**Status:** queued

Remove `SLICE_BRANCH_RE`, `parseSliceBranch()`, and dead `isolation: "branch"/"none"` preference options from the upstream GSD extension's git layer. Pure dead code removal — no behavior changes. 3 slices: S01 (SLICE_BRANCH_RE removal), S02 (dead isolation pref cleanup), S03 (test cleanup + verify).

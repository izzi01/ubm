# M109: Remove legacy slice branch artifacts and dead isolation preferences

## Vision
Clean up dead code left behind after the upstream GSD transition to branchless auto-mode. Remove SLICE_BRANCH_RE, parseSliceBranch(), dead isolation preference options ("branch", "none"), and all associated test cases. Pure deletion — no behavior changes.

## Slice Overview
| ID | Slice | Risk | Depends | Done | After this |
|----|-------|------|---------|------|------------|
| S01 | S01 | low | — | ✅ | grep -r 'SLICE_BRANCH_RE' and 'parseSliceBranch' in gsd/ returns zero results (outside docs). GitPreferences no longer has 'branch' or 'none' isolation options. Full GSD test suite passes. |

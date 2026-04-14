---
id: S01
parent: M109
milestone: M109
provides:
  - Clean GSD extension source tree with zero references to removed slice-branch artifacts. Narrowed GitPreferences.isolation type eliminates dead isolation modes from the codebase.
requires:
  []
affects:
  []
key_files:
  - ["src/resources/extensions/gsd/branch-patterns.ts", "src/resources/extensions/gsd/worktree.ts", "src/resources/extensions/gsd/auto.ts", "src/resources/extensions/gsd/git-service.ts", "src/resources/extensions/gsd/preferences-types.ts", "src/resources/extensions/gsd/tests/regex-hardening.test.ts", "src/resources/extensions/gsd/tests/worktree.test.ts", "src/resources/extensions/gsd/tests/worktree-integration.test.ts", "src/resources/extensions/gsd/tests/integration/integration-mixed-milestones.test.ts", "src/resources/extensions/gsd/tests/none-mode-gates.test.ts", "src/resources/extensions/gsd/tests/preferences.test.ts"]
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
completed_at: 2026-04-12T09:43:27.878Z
blocker_discovered: false
---

# S01: S01: Remove SLICE_BRANCH_RE, parseSliceBranch, and dead isolation prefs

**Removed all dead slice-branch code (SLICE_BRANCH_RE, parseSliceBranch) and narrowed GitPreferences.isolation from 'worktree' | 'branch' | 'none' to 'worktree' | undefined. Zero regressions across 5797 tests.**

## What Happened

Six tasks removed all dead slice-branch infrastructure from the GSD extension:

**T01** removed SLICE_BRANCH_RE from branch-patterns.ts (the regex source of truth). **T02** removed parseSliceBranch() and the SLICE_BRANCH_RE import/export from worktree.ts. **T03** removed the dead parseSliceBranch import from auto.ts. **T04** removed SLICE_BRANCH_RE from git-service.ts, deleted the slice-branch guard in writeIntegrationBranch(), and narrowed GitPreferences.isolation to "worktree" | undefined.

**T05** removed all dead test cases from 5 test files: regex-hardening.test.ts, worktree.test.ts, worktree-integration.test.ts, integration-mixed-milestones.test.ts, and none-mode-gates.test.ts. This included tests for SLICE_BRANCH_RE, parseSliceBranch, and dead isolation options ('branch', 'none').

**T06** ran the full verification chain and fixed two regressions discovered during validation: (1) preferences-types.ts MODE_DEFAULTS still had isolation: "none" — removed the key since undefined is the default, and (2) captureIntegrationBranch lost its slice-branch guard when parseSliceBranch was removed — restored with a simpler `branch.startsWith("gsd/")` check covering all GSD-managed branches. Also fixed a stale test assertion in preferences.test.ts.

Final state: tsc --noEmit zero errors, 5797 unit tests pass, umb binary starts, grep sweep returns zero matches for all removed symbols, QUICK_BRANCH_RE and WORKFLOW_BRANCH_RE still export correctly.

## Verification

- grep -rn 'SLICE_BRANCH_RE|parseSliceBranch' src/resources/extensions/gsd/ --include='*.ts' → 0 matches
- npx tsc --noEmit → 0 errors
- npm run test:unit → 5797 passed (13 pre-existing failures)
- node dist/loader.js --version → 2.70.1
- QUICK_BRANCH_RE and WORKFLOW_BRANCH_RE still exported from branch-patterns.ts
- GitPreferences.isolation type narrowed to "worktree" | undefined (no 'branch' or 'none' literals)
- No isolation references to 'branch' or 'none' in preferences-types.ts or git-service.ts

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

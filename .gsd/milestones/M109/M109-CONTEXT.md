# M109: Remove legacy slice branch artifacts and dead isolation preferences

**Gathered:** 2026-04-12
**Status:** Queued — pending auto-mode execution

## Project Description

Remove dead code from the upstream GSD extension's git/worktree layer that was left behind after the upstream transition to branchless auto-mode. The upstream already removed slice branch creation, switching, and merging — but the detection code, regex patterns, parsing functions, and dead preference options remain. This milestone cleans up those remnants.

This is pure dead code removal. No behavior changes.

## Why This Milestone

The fork inherited ~5200 lines of git/worktree code from the upstream GSD extension. Two of the PRD's six phases (slice branch creation removal, slice merge code removal) were already completed upstream, but the detection/parsing artifacts were left behind. This code:

1. **Misleads developers** — `SLICE_BRANCH_RE` and `parseSliceBranch()` suggest slice branches still exist
2. **Bloats the codebase** — dead imports, dead functions, dead tests add cognitive load
3. **Creates false confidence** — tests pass against code that's never exercised in production

The umb extension has its own dispatch engine and doesn't use any of this code. But since the GSD extension ships in the fork, cleaning it up reduces maintenance burden and makes the eventual GSD→umb extension transition cleaner.

## User-Visible Outcome

### When this milestone is complete, the user can:

- No user-visible changes. The code removed is never executed in any code path.
- Developers reading the GSD extension's git layer will see a cleaner codebase without misleading slice branch artifacts.

### Entry point / environment

- Entry point: `umb` CLI (GSD extension loads at startup)
- Environment: local dev
- Live dependencies involved: none

## Completion Class

- Contract complete means: `SLICE_BRANCH_RE`, `parseSliceBranch`, and dead isolation preference options are removed. All upstream GSD tests pass. No behavior changes.
- Integration complete means: The `umb` binary builds and runs without errors. Both GSD and umb extensions load correctly.
- Operational complete means: none (no runtime behavior changes)

## Final Integrated Acceptance

To call this milestone complete, we must prove:

- `grep -r "SLICE_BRANCH_RE" src/resources/extensions/gsd/` returns zero results (outside changelogs/docs)
- `grep -r "parseSliceBranch" src/resources/extensions/gsd/` returns zero results
- `QUICK_BRANCH_RE` and `WORKFLOW_BRANCH_RE` still exist and are used in `writeIntegrationBranch()`
- The upstream GSD test suite passes with zero failures related to removed code
- The `umb` binary starts without errors

## Risks and Unknowns

- **Upstream merge conflicts** — Low risk. We're removing code, not modifying active logic. Future upstream merges will simply not re-introduce these functions.
- **Hidden runtime usage** — Very low. Verified via `grep` that `parseSliceBranch` is only imported (never called) in `auto.ts`, and only referenced in test files otherwise. `SLICE_BRANCH_RE` is used only in `writeIntegrationBranch()` guard (which we're also removing since slice branches can't be recorded as integration targets anymore).
- **Test false positives** — Low. Removing test cases that test removed code should not cause other tests to fail.

## Existing Codebase / Prior Art

- `src/resources/extensions/gsd/branch-patterns.ts` (16 lines) — Defines `SLICE_BRANCH_RE`, `QUICK_BRANCH_RE`, `WORKFLOW_BRANCH_RE`. Only `SLICE_BRANCH_RE` is dead.
- `src/resources/extensions/gsd/worktree.ts` (346 lines) — Contains `parseSliceBranch()` (lines 253-272) which is only called in tests. Re-exports `SLICE_BRANCH_RE` from `branch-patterns.js`.
- `src/resources/extensions/gsd/git-service.ts` (848 lines) — Imports `SLICE_BRANCH_RE` and uses it in `writeIntegrationBranch()` (line 262) to skip recording slice branches as integration targets. Since slice branches no longer exist, this guard is dead.
- `src/resources/extensions/gsd/auto.ts` (1651 lines) — Imports `parseSliceBranch` at line 139 but never calls it. Dead import.
- `src/resources/extensions/gsd/tests/regex-hardening.test.ts` — Tests `SLICE_BRANCH_RE` matching (lines 100-145)
- `src/resources/extensions/gsd/tests/worktree.test.ts` — Tests `parseSliceBranch()` (lines 72-88) and `SLICE_BRANCH_RE` (lines 91-96)
- `src/resources/extensions/gsd/tests/worktree-integration.test.ts` — Imports and asserts on `SLICE_BRANCH_RE` (lines 28, 121)
- `src/resources/extensions/gsd/tests/integration/integration-mixed-milestones.test.ts` — Tests `parseSliceBranch` with new-format branch names (lines 529-531)

> See `.gsd/DECISIONS.md` for all architectural and pattern decisions — it is an append-only register; read it during planning, append to it during execution.

## Relevant Requirements

- None — this is pure dead code cleanup with no requirement coverage impact.

## Scope

### In Scope

- Remove `SLICE_BRANCH_RE` from `branch-patterns.ts` (keep `QUICK_BRANCH_RE`, `WORKFLOW_BRANCH_RE`)
- Remove `parseSliceBranch()` from `worktree.ts` and its `SLICE_BRANCH_RE` import/export
- Remove unused `parseSliceBranch` import from `auto.ts`
- Remove `SLICE_BRANCH_RE` import and guard from `git-service.ts` `writeIntegrationBranch()`
- Remove dead `isolation: "branch"` and `isolation: "none"` options from `GitPreferences` type in `git-service.ts`
- Update `shouldUseWorktreeIsolation()` docstring to reflect only two states (explicit worktree opt-in vs default off)
- Remove `SLICE_BRANCH_RE` test cases from `regex-hardening.test.ts`, `worktree.test.ts`, `worktree-integration.test.ts`
- Remove `parseSliceBranch` test cases from `worktree.test.ts`, `integration-mixed-milestones.test.ts`
- Run full upstream GSD test suite to verify no regressions

### Out of Scope / Non-Goals

- Changing the default behavior of `shouldUseWorktreeIsolation()` (defaults to `false` = no isolation; this is deliberate)
- Simplifying `mergeMilestoneToMain()` (deferred — needs separate analysis of each defensive block)
- Removing `QUICK_BRANCH_RE` or `WORKFLOW_BRANCH_RE` (still actively used)
- Removing or simplifying `worktree-resolver.ts`, `worktree-manager.ts`, or `worktree-health.ts`
- Changing the umb extension code (it doesn't use any of this)
- Modifying `.gitignore` (the current approach via `smartStage()` pathspec exclusions works correctly)

## Technical Constraints

- All edits are in the upstream GSD extension at `src/resources/extensions/gsd/`
- The `branch-patterns.ts` file cannot be fully deleted — `QUICK_BRANCH_RE` and `WORKFLOW_BRANCH_RE` must be preserved and importable
- Test changes must not break other test cases that share the same test files
- The fork must continue to build (`npm run build` / `tsc --noEmit`)
- The upstream GSD test suite must pass (runs via `node:test`, not Vitest)

## Integration Points

- **GSD extension** (`src/resources/extensions/gsd/`) — All changes are here. No other extensions import from this code.
- **umb extension** (`src/resources/extensions/umb/`) — Does not import any GSD git/worktree code. No impact.
- **Fork build** — Changes must not break `tsc --noEmit` or the `umb` binary startup.

## Open Questions

- None. Scope is well-defined and verified against the current codebase.

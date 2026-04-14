# M113 — Branchless Worktree Architecture

## Vision

Eliminate the worktree sync layer — the root cause of most worktree bugs — by tracking planning artifacts in git. This cascades into removing ~500 lines of sync code, simplifying `mergeMilestoneToMain()` from ~650 to ≤250 lines, and deleting ~2000+ lines of sync-specific tests.

## Scope

Implementing `docs/dev/PRD-branchless-worktree-architecture.md`. Phases 2-3 (slice branch removal) are already done in upstream. Remaining work:

1. **S01 — `.gitignore` + tracking fix** — Track planning artifacts in git, gitignore only runtime files
2. **S02 — Remove worktree sync layer** — Delete 5 sync functions + ~8 caller sites (~500 lines)
3. **S03 — Simplify `mergeMilestoneToMain()`** — Strip stash/shelter/conflict-resolution, keep core merge logic
4. **S04 — Test cleanup + `git-self-heal.ts` simplification** — Delete sync tests, update remaining tests

## Constraints

- **No external library changes** — pure git and filesystem work
- **gsd.db must remain gitignored** — rebuilt from tracked markdown on startup
- **Existing worktrees** must not break on upgrade
- **Auto-mode milestone run** (create worktree → execute → complete → merge) must still work end-to-end

## Key Files

| File | Lines | Role |
|---|---|---|
| `auto-worktree.ts` | 2067 | Worktree lifecycle: create, sync, merge, teardown |
| `auto.ts` | 1650 | Auto-mode dispatch loop |
| `git-service.ts` | 845 | Git operations (commit, branch, merge, status) |
| `git-self-heal.ts` | 127 | Crash recovery (abortAndReset) |
| `.gitignore` | ~100 | Tracking control |

## Sync Functions to Remove

| Function | Production callers | Test files |
|---|---|---|
| `syncProjectRootToWorktree()` | auto/phases.ts, auto/loop-deps.ts, auto.ts | 3 files |
| `syncStateToProjectRoot()` | auto-post-unit.ts, worktree-manager.ts | 4 files |
| `syncGsdStateToWorktree()` | parallel-orchestrator.ts | 3 files |
| `syncWorktreeStateBack()` | worktree-resolver.ts (DI) | 6 files |
| `copyPlanningArtifacts()` | auto-worktree.ts (internal) | 2 files |

## Requirements

- R023 — Planning artifacts tracked in git (S01)
- R024 — Worktree sync layer removed (S02)
- R025 — mergeMilestoneToMain simplified to ≤250 lines (S03)
- R026 — Tests cleaned up, git-self-heal simplified (S04)

## Discussion Protocol

4-layer discussion completed:
- **Layer 1 (Scope):** 4 slices, medium complexity, S01 keystone enables cascade
- **Layer 2 (Architecture):** Track artifacts → remove sync → simplify merge → clean tests
- **Layer 3 (Error States):** Keep dirty-tree detection (fail loudly), keep branch-ref check, rely on tsc + rg for caller detection
- **Layer 4 (Quality Bar):** tsc --noEmit passes, rg finds zero sync references, full test suite passes, auto-mode milestone run works end-to-end

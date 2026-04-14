---
estimated_steps: 6
estimated_files: 10
skills_used: []
---

# T01: Narrow getIsolationMode type and simplify all non-test consumers

**Slice:** S01 — Remove 'none'/'branch' from getIsolationMode and all consumers
**Milestone:** M110

## Description

Remove `'none'` and `'branch'` from the `getIsolationMode()` return type so it only returns `"worktree"`. Simplify or remove all conditional guards that checked for these modes. Delete the `_mergeBranchMode` method in `worktree-resolver.ts`. Update preferences validation to reject `none`/`branch` as deprecated values.

**Key knowledge from KNOWLEDGE.md:**
- "Narrowing type unions can surface stale defaults in MODE_DEFAULTS — grep for those literal strings across the codebase"
- "tsc catches missing imports but NOT lost conditional logic — manual review of callers is required"
- When removing a guard like `if (getIsolationMode() !== "none")`, the body becomes unconditional. Verify no side-effect-only guards are lost.

## Steps

1. **`src/resources/extensions/gsd/preferences.ts`** — Change `getIsolationMode()` return type from `"none" | "worktree" | "branch"` to `"worktree"`. Remove the `if (prefs?.isolation === "branch") return "branch"` branch. Remove the `if (prefs?.isolation === "worktree") return "worktree"` guard — just return `"worktree"` always (the function no longer reads preferences for this). Update JSDoc to reflect that isolation is always worktree.

2. **`src/resources/extensions/gsd/preferences-validation.ts`** — Change `validIsolation` set from `["worktree", "branch", "none"]` to `["worktree"]`. Update error message. Update the KEY_MIGRATION_HINTS strings to remove `branch, none` from the suggested values. If `git.isolation` is set to `"none"` or `"branch"`, produce a deprecation warning (not error) suggesting removal.

3. **`src/resources/extensions/gsd/auto-start.ts`** — The `auditOrphanedMilestoneBranches` parameter `isolationMode: "worktree" | "branch" | "none"` → `"worktree"`. Remove the `if (isolationMode === "none") return` early exit (line ~147). At line ~637, remove the `if (getIsolationMode() !== "none")` guard around `captureIntegrationBranch` — it should always run. At line ~646, remove the `if (getIsolationMode() === "none" && nativeIsRepo(base))` stale-branch guard block entirely (the whole try-catch block that checks for `milestone/` prefix and auto-checks out).

4. **`src/resources/extensions/gsd/auto/phases.ts`** — At line ~364, remove the `if (deps.getIsolationMode() !== "none")` guard around `captureIntegrationBranch` — make the call unconditional.

5. **`src/resources/extensions/gsd/quick.ts`** — Remove `const usesBranch = getIsolationMode() !== "none"` and the conditional around branch creation. Branch creation should always happen (simplify the `if (usesBranch)` to just the body).

6. **`src/resources/extensions/gsd/doctor.ts`** — Change `isolationMode` type in `runGSDDoctor` options and local variable from `"none" | "worktree" | "branch"` to `"worktree"`. Simplify the isolation resolution logic — just use `"worktree"`.

7. **`src/resources/extensions/gsd/doctor-git-checks.ts`** — Change `isolationMode` parameter type from `"none" | "worktree" | "branch"` to `"worktree"`. Remove the `if (isolationMode !== "none")` guard — the orphaned worktree/stale branch checks should always run.

8. **`src/resources/extensions/gsd/worktree-resolver.ts`** — Change deps interface `getIsolationMode` return type from `"worktree" | "branch" | "none"` to `"worktree"`. In `mergeAndExit`, remove the `else if (mode === "branch")` branch (line ~373) and the entire `_mergeBranchMode` private method. Simplify the condition to just call `_mergeWorktreeMode`.

9. **`src/resources/extensions/gsd/init-wizard.ts`** — Remove the `"branch"` and `"none"` options from `isolationActions`. The wizard should only offer `"worktree"` (or skip the question entirely). Simplify the `gitIsolation` type to `"worktree"`.

10. **`src/resources/extensions/gsd/auto/loop-deps.ts`** — Update `getIsolationMode` return type from `() => string` to `() => "worktree"` for stronger typing (optional but nice).

11. Run `npx tsc --noEmit --project tsconfig.json` to catch any remaining type errors. Fix them.

## Must-Haves

- [ ] `getIsolationMode()` returns type `"worktree"` only — no `'none'` or `'branch'` in the union
- [ ] All `!== "none"` / `=== "none"` conditional guards are removed or made unconditional
- [ ] `_mergeBranchMode` method is deleted from worktree-resolver.ts
- [ ] Preferences validation rejects `"none"` and `"branch"` as deprecated
- [ ] `npx tsc --noEmit` passes with zero errors in GSD extension files

## Verification

- `npx tsc --noEmit --project tsconfig.json 2>&1 | head -50` — must show no errors
- `grep -rn '"none"\|"branch"' src/resources/extensions/gsd/*.ts src/resources/extensions/gsd/auto/*.ts | grep -i isolat` — should return zero hits (excluding tests)

## Inputs

- `src/resources/extensions/gsd/preferences.ts` — current getIsolationMode implementation
- `src/resources/extensions/gsd/preferences-validation.ts` — current validation set
- `src/resources/extensions/gsd/auto-start.ts` — isolation mode guards
- `src/resources/extensions/gsd/auto/phases.ts` — integration branch capture guard
- `src/resources/extensions/gsd/quick.ts` — branch creation conditional
- `src/resources/extensions/gsd/doctor.ts` — isolationMode type in options
- `src/resources/extensions/gsd/doctor-git-checks.ts` — isolationMode parameter
- `src/resources/extensions/gsd/worktree-resolver.ts` — branch mode merge path
- `src/resources/extensions/gsd/init-wizard.ts` — wizard isolation options
- `src/resources/extensions/gsd/auto/loop-deps.ts` — deps interface type

## Expected Output

- `src/resources/extensions/gsd/preferences.ts` — narrowed return type, simplified body
- `src/resources/extensions/gsd/preferences-validation.ts` — narrowed valid set, deprecation warnings
- `src/resources/extensions/gsd/auto-start.ts` — removed none-mode guards
- `src/resources/extensions/gsd/auto/phases.ts` — unconditional captureIntegrationBranch
- `src/resources/extensions/gsd/quick.ts` — unconditional branch creation
- `src/resources/extensions/gsd/doctor.ts` — narrowed isolationMode type
- `src/resources/extensions/gsd/doctor-git-checks.ts` — removed none-mode guard
- `src/resources/extensions/gsd/worktree-resolver.ts` — deleted _mergeBranchMode
- `src/resources/extensions/gsd/init-wizard.ts` — removed branch/none options
- `src/resources/extensions/gsd/auto/loop-deps.ts` — narrowed return type

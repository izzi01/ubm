---
id: T01
parent: S01
milestone: M110
key_files:
  - src/resources/extensions/gsd/preferences.ts
  - src/resources/extensions/gsd/preferences-validation.ts
  - src/resources/extensions/gsd/auto-start.ts
  - src/resources/extensions/gsd/auto/phases.ts
  - src/resources/extensions/gsd/quick.ts
  - src/resources/extensions/gsd/doctor.ts
  - src/resources/extensions/gsd/doctor-git-checks.ts
  - src/resources/extensions/gsd/worktree-resolver.ts
  - src/resources/extensions/gsd/init-wizard.ts
  - src/resources/extensions/gsd/auto/loop-deps.ts
key_decisions:
  - (none)
duration: 
verification_result: passed
completed_at: 2026-04-12T16:29:26.511Z
blocker_discovered: false
---

# T01: Narrowed getIsolationMode() to return only "worktree", removed all "none"/"branch" conditional guards, deleted _mergeBranchMode, and added deprecation warnings for legacy isolation values.

**Narrowed getIsolationMode() to return only "worktree", removed all "none"/"branch" conditional guards, deleted _mergeBranchMode, and added deprecation warnings for legacy isolation values.**

## What Happened

Systematically removed "none" and "branch" from the isolation mode type union across 10 files. getIsolationMode() is now a constant function returning "worktree". All conditional guards checking for "none" or "branch" were removed or made unconditional. The _mergeBranchMode method (~60 lines) was deleted from worktree-resolver.ts. Preferences validation now warns (not errors) on deprecated "none"/"branch" values. The init wizard no longer offers isolation mode selection. TypeScript compilation passes with zero errors.

## Verification

npx tsc --noEmit passed with zero errors. grep for "none"/"branch" isolation references shows only the deprecation warning handler in preferences-validation.ts. All conditional guards removed. _mergeBranchMode deleted.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `npx tsc --noEmit --project tsconfig.json 2>&1 | head -80` | 0 | ✅ pass | 45000ms |
| 2 | `grep -rn '"none"|"branch"' src/resources/extensions/gsd/*.ts src/resources/extensions/gsd/auto/*.ts | grep -i isolat | grep -v test` | 0 | ✅ pass (only deprecation handler) | 500ms |

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `src/resources/extensions/gsd/preferences.ts`
- `src/resources/extensions/gsd/preferences-validation.ts`
- `src/resources/extensions/gsd/auto-start.ts`
- `src/resources/extensions/gsd/auto/phases.ts`
- `src/resources/extensions/gsd/quick.ts`
- `src/resources/extensions/gsd/doctor.ts`
- `src/resources/extensions/gsd/doctor-git-checks.ts`
- `src/resources/extensions/gsd/worktree-resolver.ts`
- `src/resources/extensions/gsd/init-wizard.ts`
- `src/resources/extensions/gsd/auto/loop-deps.ts`

# S01: S01: Remove 'none'/'branch' from getIsolationMode and all consumers

**Goal:** Remove 'none' and 'branch' from the getIsolationMode() return type and all consumers. The function should only return "worktree". All conditional guards checking for 'none' or 'branch' must be simplified or removed, and the branch-mode merge path in worktree-resolver must be deleted.
**Demo:** grep -rn "getIsolationMode|isolationMode" src/resources/extensions/gsd/ --include='*.ts' | grep -v test shows zero references to 'none' or 'branch' isolation modes.

## Must-Haves

- grep -rn "getIsolationMode|isolationMode" src/resources/extensions/gsd/ --include='*.ts' | grep -v test shows zero references to 'none' or 'branch' isolation modes

## Proof Level

- This slice proves: contract

## Integration Closure

Internal dead-code removal — no new wiring. All changes are type narrowing and conditional simplification within the GSD extension.

## Verification

- none

## Tasks

- [x] **T01: Narrow getIsolationMode type and simplify all non-test consumers** `est:45m`
  Remove 'none' and 'branch' from getIsolationMode() return type, update preferences validation, simplify conditional guards in auto-start.ts, auto/phases.ts, quick.ts, doctor.ts, doctor-git-checks.ts, worktree-resolver.ts, init-wizard.ts, and preferences.ts. Delete the _mergeBranchMode method and its callers.
  - Files: `src/resources/extensions/gsd/preferences.ts`, `src/resources/extensions/gsd/preferences-validation.ts`, `src/resources/extensions/gsd/auto-start.ts`, `src/resources/extensions/gsd/auto/phases.ts`, `src/resources/extensions/gsd/quick.ts`, `src/resources/extensions/gsd/doctor.ts`, `src/resources/extensions/gsd/doctor-git-checks.ts`, `src/resources/extensions/gsd/worktree-resolver.ts`, `src/resources/extensions/gsd/init-wizard.ts`, `src/resources/extensions/gsd/auto/loop-deps.ts`
  - Verify: npx tsc --noEmit --project tsconfig.json 2>&1 | head -50

- [x] **T02: Update all test files and verify with tsc + test run** `est:45m`
  Update test mocks (getIsolationMode returning 'none' or 'branch' → 'worktree'), update assertion strings, delete the none-mode-gates.test.ts and isolation-none-branch-guard.test.ts files (they test behavior that no longer exists), update preferences.test.ts, doctor-git.test.ts, worktree-resolver.test.ts, auto-loop.test.ts, custom-engine-loop-integration.test.ts, journal-integration.test.ts, status-db-open.test.ts, and other test files. Then run tsc and the full test suite.
  - Files: `src/resources/extensions/gsd/tests/none-mode-gates.test.ts`, `src/resources/extensions/gsd/tests/isolation-none-branch-guard.test.ts`, `src/resources/extensions/gsd/tests/preferences.test.ts`, `src/resources/extensions/gsd/tests/auto-loop.test.ts`, `src/resources/extensions/gsd/tests/custom-engine-loop-integration.test.ts`, `src/resources/extensions/gsd/tests/journal-integration.test.ts`, `src/resources/extensions/gsd/tests/status-db-open.test.ts`, `src/resources/extensions/gsd/tests/worktree-resolver.test.ts`, `src/resources/extensions/gsd/tests/integration/doctor-git.test.ts`, `src/resources/extensions/gsd/tests/integration/integration-proof.test.ts`, `src/resources/extensions/gsd/tests/integration/worktree-e2e.test.ts`, `src/resources/extensions/gsd/tests/orphaned-worktree-audit.test.ts`
  - Verify: npx tsc --noEmit --project tsconfig.json && npx vitest run --reporter=verbose 2>&1 | tail -30

## Files Likely Touched

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
- src/resources/extensions/gsd/tests/none-mode-gates.test.ts
- src/resources/extensions/gsd/tests/isolation-none-branch-guard.test.ts
- src/resources/extensions/gsd/tests/preferences.test.ts
- src/resources/extensions/gsd/tests/auto-loop.test.ts
- src/resources/extensions/gsd/tests/custom-engine-loop-integration.test.ts
- src/resources/extensions/gsd/tests/journal-integration.test.ts
- src/resources/extensions/gsd/tests/status-db-open.test.ts
- src/resources/extensions/gsd/tests/worktree-resolver.test.ts
- src/resources/extensions/gsd/tests/integration/doctor-git.test.ts
- src/resources/extensions/gsd/tests/integration/integration-proof.test.ts
- src/resources/extensions/gsd/tests/integration/worktree-e2e.test.ts
- src/resources/extensions/gsd/tests/orphaned-worktree-audit.test.ts

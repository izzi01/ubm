# M110: Complete isolation mode cleanup - remove 'none'/'branch' from getIsolationMode and all consumers

## Vision
M109 narrowed GitPreferences.isolation to 'worktree' | undefined but left getIsolationMode() and ~30 files still referencing 'none' and 'branch' as valid isolation modes. This milestone finishes the job: narrow getIsolationMode()'s return type, update all callers (auto.ts, auto-start.ts, quick.ts, worktree-resolver.ts, doctor.ts, init-wizard.ts, preferences.ts, preferences-validation.ts, phases.ts, commands-workflow-templates.ts), update all test mocks, and remove dedicated dead-isolation test files. Pure deletion/narrowing — no behavior changes (worktree isolation is the only mode).

## Slice Overview
| ID | Slice | Risk | Depends | Done | After this |
|----|-------|------|---------|------|------------|
| S01 | S01 | medium | — | ✅ | grep -rn "getIsolationMode|isolationMode" src/resources/extensions/gsd/ --include='*.ts' | grep -v test shows zero references to 'none' or 'branch' isolation modes. |

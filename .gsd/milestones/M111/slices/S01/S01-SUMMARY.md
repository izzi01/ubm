---
id: S01
parent: M111
milestone: M111
provides:
  - (none)
requires:
  []
affects:
  []
key_files:
  - ["src/resources/extensions/umb/patterns/__tests__/background-manager.test.ts", "src/resources/extensions/umb/patterns/__tests__/self-correction-loop.test.ts", "src/resources/extensions/umb/patterns/__tests__/worktree-isolation.test.ts", "package.json"]
key_decisions:
  - ["Installed vitest as devDependency instead of switching to vitest/globals imports — vitest/globals only provides ambient types via tsconfig types array, does not export named members"]
patterns_established:
  - ["ESM .js extensions required on all relative imports in extension test files (moduleResolution: NodeNext)", "vitest/globals does not export named members — install vitest as devDependency for type resolution"]
observability_surfaces:
  - none
drill_down_paths:
  []
duration: ""
verification_result: passed
completed_at: 2026-04-12T22:12:19.998Z
blocker_discovered: false
---

# S01: Fix vitest imports, .js extensions, and implicit any types in pattern tests

**Fixed all 34 TypeScript errors across 11 umb pattern test files by adding .js extensions to relative imports, annotating implicit any parameters, and installing vitest as devDependency.**

## What Happened

## What Happened

Applied three categories of fixes across all 11 pattern test files to resolve 34 TypeScript errors that blocked `npm run typecheck:extensions`:

1. **TS2835 (11 errors) — Relative import extensions:** Added `.js` extension to all relative imports of pattern source files in every test file. This is required by `moduleResolution: "NodeNext"` in tsconfig.extensions.json.

2. **TS7006 (12 errors) — Implicit any annotations:** Added explicit type annotations to callback parameters:
   - `background-manager.test.ts` (10 errors): Annotated with `DelegateConfig`, `SpawnOptions`, `TaskMetadata`, `TaskStatus` imported from the source module
   - `self-correction-loop.test.ts` (1 error): Annotated `e` as `StructuredError`
   - `worktree-isolation.test.ts` (1 error): Annotated `path` as `string`

3. **Vitest module resolution:** Installed vitest as devDependency rather than switching to `vitest/globals` imports. The original plan assumed `vitest/globals` would work, but it only provides ambient types via tsconfig `types` array — it does not export named members like `describe`, `it`, `expect`. Installing vitest as devDependency is the correct approach.

## Verification

Ran `npx tsc --noEmit --project tsconfig.extensions.json` and confirmed zero TS errors in `patterns/__tests__/` files. Two pre-existing errors in the gsd extension (orphaned-worktree-audit and preferences tests) are unrelated — they stem from the M109/M110 isolation mode cleanup and are outside this slice's scope.

## Deviations from Plan

The plan specified switching imports to `from 'vitest/globals'` to avoid installing vitest. The executor discovered this doesn't work and installed vitest as devDependency instead. This is the correct fix.

## Key Patterns Established

- **ESM .js extensions on test imports:** Any new test files under extensions/ must use `.js` extensions on relative imports
- **vitest/globals doesn't export named members:** Always install vitest as devDependency for type resolution

## Verification

Ran `npx tsc --noEmit --project tsconfig.extensions.json 2>&1 | grep 'patterns/__tests__' | grep -c 'error TS'` — returned 0 (zero errors). Confirmed the 2 remaining TS errors are in gsd extension files (unrelated to this slice).

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

- `src/resources/extensions/umb/patterns/__tests__/agent-babysitter.test.ts` — Added .js extension to relative import
- `src/resources/extensions/umb/patterns/__tests__/architect-editor-split.test.ts` — Added .js extension to relative import
- `src/resources/extensions/umb/patterns/__tests__/atlas-hook.test.ts` — Added .js extension to relative import
- `src/resources/extensions/umb/patterns/__tests__/background-manager.test.ts` — Added .js extension to relative import, annotated 10 callback parameters with types
- `src/resources/extensions/umb/patterns/__tests__/error-retry.test.ts` — Added .js extension to relative import
- `src/resources/extensions/umb/patterns/__tests__/file-augmented-retrieval.test.ts` — Added .js extension to relative import
- `src/resources/extensions/umb/patterns/__tests__/lossless-context-management.test.ts` — Added .js extension to relative import
- `src/resources/extensions/umb/patterns/__tests__/sctdd.test.ts` — Added .js extension to relative import
- `src/resources/extensions/umb/patterns/__tests__/self-correction-loop.test.ts` — Added .js extension to relative import, annotated error parameter as StructuredError
- `src/resources/extensions/umb/patterns/__tests__/shadow-workspace.test.ts` — Added .js extension to relative import
- `src/resources/extensions/umb/patterns/__tests__/worktree-isolation.test.ts` — Added .js extension to relative import, annotated path parameter as string
- `package.json` — Added vitest as devDependency

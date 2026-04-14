---
id: M111
title: "Fix umb pattern test compilation — add vitest, fix imports and types"
status: complete
completed_at: 2026-04-12T22:14:07.084Z
key_decisions:
  - Install vitest as devDependency instead of vitest/globals — vitest/globals does not export named members (describe, it, expect), only provides ambient types via tsconfig types array
  - ESM .js extensions required on all relative imports in extension test files under moduleResolution: NodeNext
key_files:
  - src/resources/extensions/umb/patterns/__tests__/agent-babysitter.test.ts
  - src/resources/extensions/umb/patterns/__tests__/architect-editor-split.test.ts
  - src/resources/extensions/umb/patterns/__tests__/atlas-hook.test.ts
  - src/resources/extensions/umb/patterns/__tests__/background-manager.test.ts
  - src/resources/extensions/umb/patterns/__tests__/error-retry.test.ts
  - src/resources/extensions/umb/patterns/__tests__/file-augmented-retrieval.test.ts
  - src/resources/extensions/umb/patterns/__tests__/lossless-context-management.test.ts
  - src/resources/extensions/umb/patterns/__tests__/sctdd.test.ts
  - src/resources/extensions/umb/patterns/__tests__/self-correction-loop.test.ts
  - src/resources/extensions/umb/patterns/__tests__/shadow-workspace.test.ts
  - src/resources/extensions/umb/patterns/__tests__/worktree-isolation.test.ts
  - package.json
lessons_learned:
  - vitest/globals is NOT a drop-in replacement for importing from vitest — it only provides ambient types via tsconfig 'types' array and does not export named members
  - moduleResolution: NodeNext requires .js extensions on ALL relative imports, including test files importing source modules
---

# M111: Fix umb pattern test compilation — add vitest, fix imports and types

**Fixed all 34 TypeScript errors across 11 umb pattern test files by adding .js import extensions, annotating implicit any parameters, and installing vitest as devDependency.**

## What Happened

## M111: Fix umb pattern test compilation — add vitest, fix imports and types

### Problem
The 11 test files in `src/resources/extensions/umb/patterns/__tests__/` used vitest APIs but failed `npm run typecheck:extensions` with 34 TypeScript errors across three categories:
1. **TS2835 (11 errors):** Relative imports missing `.js` extensions (required by `moduleResolution: "NodeNext"`)
2. **TS7006 (12 errors):** Implicit `any` on callback parameters
3. **Module resolution:** vitest globals not resolvable without vitest installed

### Execution (S01)
A single slice fixed all three issues:

1. Added `.js` extension to all 11 relative imports across every test file
2. Annotated 12 callback parameters with explicit types (`DelegateConfig`, `SpawnOptions`, `TaskMetadata`, `TaskStatus`, `StructuredError`, `string`) imported from their source modules
3. Installed vitest as devDependency — `vitest/globals` does not export named members, so installing the full package is the correct approach

### Verification
- `npx tsc --noEmit --project tsconfig.extensions.json` returns zero errors for pattern test files
- 2 pre-existing errors in gsd extension files are unrelated (M109/M110 isolation cleanup)
- All 11 test files have correct `.js` import extensions confirmed by grep

### Deviation
The original plan specified switching to `from 'vitest/globals'` imports to avoid installing vitest. This was abandoned during execution because `vitest/globals` only provides ambient types via tsconfig `types` array — it does not export named members like `describe`, `it`, `expect`. Installing vitest as devDependency is the correct fix.

## Success Criteria Results

### Success Criteria Results

| Criterion | Result | Evidence |
|-----------|--------|----------|
| `npm run typecheck:extensions` exits with zero errors for all 11 umb pattern test files | ✅ PASS | `npx tsc --noEmit --project tsconfig.extensions.json 2>&1 \| grep 'patterns/__tests__' \| grep -c 'error TS'` returned 0. All 11 test files confirmed with `.js` extensions and explicit type annotations. |

## Definition of Done Results

### Definition of Done Results

| Item | Result | Evidence |
|------|--------|----------|
| All slices complete | ✅ PASS | S01 status is `complete` (1/1 tasks done) |
| S01 summary exists | ✅ PASS | `.gsd/milestones/M111/slices/S01/S01-SUMMARY.md` exists (5294 bytes) |
| Code changes exist on disk | ✅ PASS | 11 test files modified with `.js` imports + type annotations, `package.json` updated with vitest devDependency |
| Typecheck passes for pattern tests | ✅ PASS | Zero TS errors in `patterns/__tests__/` files |

## Requirement Outcomes

No requirement status transitions occurred during M111. This was a pure test infrastructure fix — no functional requirements were advanced, validated, or invalidated.

## Deviations

None.

## Follow-ups

None.

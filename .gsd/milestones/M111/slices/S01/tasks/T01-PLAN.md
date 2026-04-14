---
estimated_steps: 24
estimated_files: 11
skills_used: []
---

# T01: Fix vitest imports, .js extensions, and implicit any types in all 11 pattern test files

Fix three categories of TypeScript errors across all 11 pattern test files:

1. **TS2307 (11 errors)**: Replace `from 'vitest'` with `from 'vitest/globals'` in all 11 files. Vitest is not installed as a dependency — only the type declarations from the globals path are needed for typecheck.

2. **TS2835 (11 errors)**: Add `.js` extension to all relative imports of pattern source files. Every test imports from `../pattern-name` — change to `../pattern-name.js`. Files:
   - agent-babysitter.test.ts → `../agent-babysitter.js`
   - architect-editor-split.test.ts → `../architect-editor-split.js`
   - atlas-hook.test.ts → `../atlas-hook.js`
   - background-manager.test.ts → `../background-manager.js`
   - error-retry.test.ts → `../error-retry.js`
   - file-augmented-retrieval.test.ts → `../file-augmented-retrieval.js`
   - lossless-context-management.test.ts → `../lossless-context-management.js`
   - sctdd.test.ts → `../sctdd.js`
   - self-correction-loop.test.ts → `../self-correction-loop.js`
   - shadow-workspace.test.ts → `../shadow-workspace.js`
   - worktree-isolation.test.ts → `../worktree-isolation.js`

3. **TS7006 (12 errors)**: Add type annotations to callback parameters in 3 files:
   - **background-manager.test.ts** (10 errors): The injected executor callbacks use `(config, context)`, `(task)`, `(task, status)` without types. Import `DelegateConfig`, `SpawnOptions`, `TaskMetadata`, `TaskStatus` from the source module and annotate:
     - Line 44: `(config: DelegateConfig, context: SpawnOptions & { proposedTaskId: string })`
     - Line 84: `(task: TaskMetadata)`
     - Line 119: `(task: TaskMetadata, status: TaskStatus)`
     - Line 144: `(task: TaskMetadata, status: TaskStatus)`
     - Line 167: `(task: TaskMetadata, status: TaskStatus)`
     - Line 198: `(task: TaskMetadata)`
   - **self-correction-loop.test.ts** (1 error): Line 35 `(e)` → `(e: StructuredError)`. Import `StructuredError` from the source module.
   - **worktree-isolation.test.ts** (1 error): Line 53 `(path)` → `(path: string)`.

## Inputs

- `src/resources/extensions/umb/patterns/__tests__/agent-babysitter.test.ts`
- `src/resources/extensions/umb/patterns/__tests__/architect-editor-split.test.ts`
- `src/resources/extensions/umb/patterns/__tests__/atlas-hook.test.ts`
- `src/resources/extensions/umb/patterns/__tests__/background-manager.test.ts`
- `src/resources/extensions/umb/patterns/__tests__/error-retry.test.ts`
- `src/resources/extensions/umb/patterns/__tests__/file-augmented-retrieval.test.ts`
- `src/resources/extensions/umb/patterns/__tests__/lossless-context-management.test.ts`
- `src/resources/extensions/umb/patterns/__tests__/sctdd.test.ts`
- `src/resources/extensions/umb/patterns/__tests__/self-correction-loop.test.ts`
- `src/resources/extensions/umb/patterns/__tests__/shadow-workspace.test.ts`
- `src/resources/extensions/umb/patterns/__tests__/worktree-isolation.test.ts`
- `src/resources/extensions/umb/patterns/background-manager.ts`
- `src/resources/extensions/umb/patterns/self-correction-loop.ts`
- `src/resources/extensions/umb/patterns/worktree-isolation.ts`

## Expected Output

- `src/resources/extensions/umb/patterns/__tests__/agent-babysitter.test.ts`
- `src/resources/extensions/umb/patterns/__tests__/architect-editor-split.test.ts`
- `src/resources/extensions/umb/patterns/__tests__/atlas-hook.test.ts`
- `src/resources/extensions/umb/patterns/__tests__/background-manager.test.ts`
- `src/resources/extensions/umb/patterns/__tests__/error-retry.test.ts`
- `src/resources/extensions/umb/patterns/__tests__/file-augmented-retrieval.test.ts`
- `src/resources/extensions/umb/patterns/__tests__/lossless-context-management.test.ts`
- `src/resources/extensions/umb/patterns/__tests__/sctdd.test.ts`
- `src/resources/extensions/umb/patterns/__tests__/self-correction-loop.test.ts`
- `src/resources/extensions/umb/patterns/__tests__/shadow-workspace.test.ts`
- `src/resources/extensions/umb/patterns/__tests__/worktree-isolation.test.ts`

## Verification

npx tsc --noEmit --project tsconfig.extensions.json 2>&1 | grep 'patterns/__tests__' | grep -c 'error TS' returns 0

# S01: Fix vitest imports, .js extensions, and implicit any types in pattern tests — UAT

**Milestone:** M111
**Written:** 2026-04-12T22:12:19.998Z

# UAT: S01 — Pattern Test Compilation

## Preconditions
- Node.js installed, dependencies available via `npm install`

## Test Cases

### TC1: Pattern test files compile with zero TypeScript errors
**Steps:**
1. Run `npx tsc --noEmit --project tsconfig.extensions.json 2>&1 | grep 'patterns/__tests__' | grep -c 'error TS'`
2. Observe output

**Expected:** Output is `0` (no errors in pattern test files)

### TC2: All 11 test files have .js extensions on relative imports
**Steps:**
1. Run `grep -r "from '\.\." src/resources/extensions/umb/patterns/__tests__/ | grep -v '\.js'`
2. Observe output

**Expected:** No output (all relative imports include .js extension)

### TC3: No implicit any errors remain in pattern tests
**Steps:**
1. Run `npx tsc --noEmit --project tsconfig.extensions.json 2>&1 | grep 'patterns/__tests__' | grep 'TS7006'`
2. Observe output

**Expected:** No output (no implicit any errors)

### TC4: vitest resolves as a module
**Steps:**
1. Run `node -e "require.resolve('vitest')"`
2. Observe output

**Expected:** Returns a path to the installed vitest package (no MODULE_NOT_FOUND error)

### TC5: Callback parameter types are explicit in background-manager.test.ts
**Steps:**
1. Run `grep -n 'DelegateConfig\|SpawnOptions\|TaskMetadata\|TaskStatus' src/resources/extensions/umb/patterns/__tests__/background-manager.test.ts`
2. Observe output

**Expected:** Multiple matches showing type annotations on callback parameters

# S01: Remove 'none'/'branch' from getIsolationMode and all consumers — UAT

**Milestone:** M110
**Written:** 2026-04-12T16:38:46.463Z

# UAT: S01 — Remove 'none'/'branch' from getIsolationMode and all consumers

## Preconditions
- Project at `/home/cid/projects-personal/umb/`
- Dependencies installed (`npm install`)
- TypeScript compiler available (`npx tsc`)

## Test Cases

### TC1: No 'none' or 'branch' isolation mode references in source (excluding tests)
```bash
grep -rn "getIsolationMode\|isolationMode" src/resources/extensions/gsd/ --include='*.ts' | grep -v test | grep -E "'none'|'branch'|\"none\"|\"branch\""
```
**Expected**: No output (exit code 1 — no matches)

### TC2: TypeScript compilation
```bash
npx tsc --noEmit --project tsconfig.json 2>&1 | head -20
```
**Expected**: No errors (exit code 0, no output)

### TC3: Obsolete test files deleted
```bash
ls src/resources/extensions/gsd/tests/none-mode-gates.test.ts src/resources/extensions/gsd/tests/isolation-none-branch-guard.test.ts 2>&1
```
**Expected**: "No such file or directory" for both files

### TC4: No 'none'/'branch' isolation references in test files
```bash
grep -rn "'none'\|'branch'" src/resources/extensions/gsd/tests/ --include='*.ts' | grep -i isolat
```
**Expected**: No output (exit code 1)

### TC5: Test suite passes
```bash
npx vitest run --reporter=verbose 2>&1 | tail -10
```
**Expected**: All tests pass, no failures

### TC6: getIsolationMode returns 'worktree'
```bash
grep -A3 "function getIsolationMode\|export function getIsolationMode" src/resources/extensions/gsd/preferences.ts
```
**Expected**: Function returns the literal string "worktree"

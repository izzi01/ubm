# S01: S01: Remove SLICE_BRANCH_RE, parseSliceBranch, and dead isolation prefs — UAT

**Milestone:** M109
**Written:** 2026-04-12T09:43:27.878Z

# UAT: S01 — Remove SLICE_BRANCH_RE, parseSliceBranch, and dead isolation prefs

## Preconditions
- umb CLI built and available at `dist/loader.js`
- GSD test suite runnable via `npm run test:unit`

## Test Cases

### TC1: SLICE_BRANCH_RE fully removed from source
```bash
grep -rn 'SLICE_BRANCH_RE' src/resources/extensions/gsd/ --include='*.ts'
```
**Expected:** Zero output (exit code 1).

### TC2: parseSliceBranch fully removed from source
```bash
grep -rn 'parseSliceBranch' src/resources/extensions/gsd/ --include='*.ts'
```
**Expected:** Zero output (exit code 1).

### TC3: GitPreferences.isolation has no dead values
```bash
grep -n 'isolation' src/resources/extensions/gsd/git-service.ts
```
**Expected:** Only `"worktree"` and `undefined` appear. No `'branch'` or `'none'`.

### TC4: Type checking passes
```bash
npx tsc --noEmit
```
**Expected:** Exit code 0, zero errors.

### TC5: Full test suite passes
```bash
npm run test:unit
```
**Expected:** 5797+ tests pass. Zero failures attributable to this change.

### TC6: QUICK_BRANCH_RE and WORKFLOW_BRANCH_RE preserved
```bash
grep -n 'export const QUICK_BRANCH_RE\|export const WORKFLOW_BRANCH_RE' src/resources/extensions/gsd/branch-patterns.ts
```
**Expected:** Two lines — both exports still present.

### TC7: No isolation 'none' in mode defaults
```bash
grep -rn 'isolation.*none\|none.*isolation' src/resources/extensions/gsd/preferences-types.ts
```
**Expected:** Zero output.

### TC8: Binary starts
```bash
node dist/loader.js --version
```
**Expected:** Version string printed, exit code 0.

## Edge Cases
- **EC1:** GSD-managed branch detection still works — captureIntegrationBranch uses `branch.startsWith("gsd/")` instead of SLICE_BRANCH_RE (covers slice, quick, and workflow branches).
- **EC2:** Preferences with no isolation key (undefined) correctly means no isolation — same behavior as before.

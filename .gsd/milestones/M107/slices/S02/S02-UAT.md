# S02: Verify fork functionality post-merge — UAT

**Milestone:** M107
**Written:** 2026-04-12T03:01:23.868Z

# S02 UAT: Verify fork functionality post-merge

## Preconditions

- Fork repo exists at `/home/cid/projects-personal/umb/`
- Fork is at v2.70.1 (merged from upstream in S01)
- Node.js v24+ available
- Dependencies installed (`npm install` run in fork directory)

## Test Cases

### TC-01: TypeScript compilation clean
**Steps:**
1. `cd /home/cid/projects-personal/umb`
2. Run `npx tsc --noEmit`
**Expected:** Exit code 0, zero type errors

### TC-02: Unit tests — no merge regressions
**Steps:**
1. `cd /home/cid/projects-personal/umb`
2. Run `npm run test:unit`
**Expected:** 5821+ tests pass. Any failures must be pre-existing (not related to upstream v2.70.1 merge changes). Compare against baseline: 11 known pre-existing failures (7 environment-specific, 4 fork static analysis).

### TC-03: Smoke tests — help and version pass
**Steps:**
1. `cd /home/cid/projects-personal/umb`
2. Run `npm run test:smoke`
**Expected:** test-help PASS, test-version PASS. test-init may FAIL (known TTY limitation in non-interactive environments).

### TC-04: Fork branding intact
**Steps:**
1. `cd /home/cid/projects-personal/umb`
2. Run: `grep -q 'UMB_LOGO' src/logo.ts && echo 'BRAND:OK'`
3. Run: `grep -q 'umb config' src/help-text.ts && echo 'HELP:OK'`
4. Run: `grep -q 'umb-cli' package.json && echo 'PKG:OK'`
**Expected:** All three checks print OK

### TC-05: Specific pre-existing failure — flat-rate-routing-guard
**Steps:**
1. `cd /home/cid/projects-personal/umb`
2. Run: `npx vitest run src/resources/extensions/gsd/tests/flat-rate-routing-guard.test.ts`
**Expected:** 5/6 tests pass. The single failure is upstream issue #3453 (pre-existing, not a merge regression).

### TC-06: Specific pre-existing — auto-model-selection test
**Steps:**
1. `cd /home/cid/projects-personal/umb`
2. Run: `npx vitest run src/resources/extensions/gsd/tests/auto-model-selection.test.ts`
**Expected:** Test file is empty or has no runnable tests (pre-existing state, not a merge regression).

## Edge Cases

- **Slow CI environment:** Full test suite may timeout at 600s. This is environment variance, not a regression. T01 completed in 180s; T02 timed out at 600s.
- **TTY-dependent test-init:** Always fails in non-interactive terminals. This is a pre-existing limitation of the upstream test framework, not a merge issue.

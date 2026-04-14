# S02: Verify fork functionality post-merge

**Goal:** Confirm the umb fork at /home/cid/projects-personal/umb/ is fully functional after the upstream v2.70.1 merge: compilation clean, unit tests pass (or failures are pre-existing), smoke tests pass, and fork branding is intact.
**Demo:** All umb extension tests pass, smoke tests pass, no regressions from upstream changes

## Must-Haves

- TypeScript compilation passes with zero errors\n- All unit test failures are categorized as either merge-regression (fixed) or pre-existing\n- Smoke tests: test-help and test-version pass; test-init failure is documented as pre-existing TTY limitation\n- Fork branding (UMB_LOGO, umb config, umb-cli) verified intact\n- No new test failures introduced by any fixes applied

## Proof Level

- This slice proves: operational

## Integration Closure

- Upstream surfaces consumed: M107/S01 merge output (fork at v2.70.1 with branding intact)\n- New wiring introduced: none (verification-only slice)\n- What remains: nothing — this is the final slice in M107

## Verification

- none

## Tasks

- [x] **T01: Run full test suite and categorize all failures against merge diff** `est:45m`
  Execute the complete test suite against the fork and categorize every failure as either a merge regression or pre-existing/environment-specific.
  - Files: `src/resources/extensions/gsd/auto-model-selection.ts`, `src/resources/extensions/gsd/tests/auto-model-selection.test.ts`, `src/resources/extensions/gsd/tests/flat-rate-routing-guard.test.ts`, `src/resources/extensions/claude-code-cli/tests/stream-adapter.test.ts`, `src/tests/app-smoke.test.ts`, `src/tests/rtk.test.ts`, `src/resources/extensions/shared/tests/ask-user-freetext.test.ts`, `src/logo.ts`, `src/help-text.ts`, `package.json`
  - Verify: cd /home/cid/projects-personal/umb && npm run test:unit 2>&1 | tail -5; npm run test:smoke 2>&1 | tail -5; npx tsc --noEmit 2>&1 | tail -3; grep -q 'UMB_LOGO' src/logo.ts && echo 'BRAND:OK' || echo 'BRAND:FAIL'; grep -q 'umb config' src/help-text.ts && echo 'HELP:OK' || echo 'HELP:FAIL'; grep -q 'umb-cli' package.json && echo 'PKG:OK' || echo 'PKG:FAIL'

- [x] **T02: Fix merge regressions and produce final verified state** `est:30m`
  For any test failure categorized as a merge regression in T01, investigate root cause and apply a targeted fix. If no regressions are found, document that conclusion. Re-run the full test suite to confirm fixes don't introduce new failures and the final state is stable.
  - Files: `src/resources/extensions/gsd/auto-model-selection.ts`, `src/resources/extensions/gsd/tests/auto-model-selection.test.ts`, `src/resources/extensions/gsd/tests/flat-rate-routing-guard.test.ts`
  - Verify: cd /home/cid/projects-personal/umb && npm run test:unit 2>&1 | tail -3; npm run test:smoke 2>&1 | tail -3; npx tsc --noEmit 2>&1 | tail -1

## Files Likely Touched

- src/resources/extensions/gsd/auto-model-selection.ts
- src/resources/extensions/gsd/tests/auto-model-selection.test.ts
- src/resources/extensions/gsd/tests/flat-rate-routing-guard.test.ts
- src/resources/extensions/claude-code-cli/tests/stream-adapter.test.ts
- src/tests/app-smoke.test.ts
- src/tests/rtk.test.ts
- src/resources/extensions/shared/tests/ask-user-freetext.test.ts
- src/logo.ts
- src/help-text.ts
- package.json

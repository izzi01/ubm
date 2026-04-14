# S03: Port test suite and verify

**Goal:** Fix vitest configuration so `npx vitest run` passes all iz-to-mo-vu extension tests without false failures from compiled dist-test/ artifacts.
**Demo:** npx vitest run passes all umb extension tests

## Must-Haves

- `npx vitest run` completes without failures from dist-test/ files\n- All 43+ existing iz-to-mo-vu test files pass\n- 157+ umb extension tests pass (skill, model-config, discovery, umb commands)

## Proof Level

- This slice proves: contract

## Integration Closure

- Upstream: S02 delivered 63 smoke tests in the fork (node:test runner) — those are for fork verification, not iz-to-mo-vu's Vitest suite\n- This slice closes the loop: iz-to-mo-vu's Vitest suite (157 tests) is the canonical test suite\n- What remains: nothing — this is the final slice in M104

## Verification

- none

## Tasks

- [x] **T01: Exclude dist-test/ from Vitest and verify all tests pass** `est:15m`
  Add `**/dist-test/**` to the vitest.config.ts exclude list. The dist-test/ directory contains 1228 compiled node:test files from the fork that Vitest incorrectly picks up and fails on — they use `process.exit()`, `node:test` APIs, and compiled JS. After adding the exclusion, run `npx vitest run --exclude 'node_modules/**'` and confirm all test files pass. Pre-existing failures in agent-babysitter.test.ts and background-manager.test.ts (6 tests total) are unrelated to this milestone and should be documented.
  - Files: `vitest.config.ts`
  - Verify: npx vitest run 2>&1 | grep -E 'Test Files' shows 0 failed (or only pre-existing failures in agent-babysitter/background-manager)

## Files Likely Touched

- vitest.config.ts

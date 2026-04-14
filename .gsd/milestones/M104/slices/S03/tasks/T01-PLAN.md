---
estimated_steps: 3
estimated_files: 1
skills_used: []
---

# T01: Exclude dist-test/ from Vitest and verify all tests pass

**Slice:** S03 — Port test suite and verify
**Milestone:** M104

## Description

The `dist-test/` directory contains 1228 compiled JavaScript test files from the fork at `/home/cid/projects-personal/umb/`. These files use `node:test` APIs, `process.exit()`, and compiled JS that Vitest cannot run. Vitest currently picks them up and reports 1228 false failures, making `npx vitest run` unusable.

The fix is a single line addition to `vitest.config.ts`: add `'**/dist-test/**'` to the `test.exclude` array. After this change, `npx vitest run` should only pick up the 43 legitimate Vitest test files in `tests/`, of which 41 should pass (2 pre-existing failures in agent-babysitter/background-manager are unrelated to this milestone).

## Steps

1. Open `vitest.config.ts` and add `'**/dist-test/**'` to the `test.exclude` array (after the `**/dist/**` entry for consistency).
2. Run `npx vitest run --exclude 'node_modules/**'` and verify the output shows 0 failed test files (or only the 2 pre-existing failures).
3. Run `npx vitest run tests/commands/umb-commands.test.ts tests/commands/skill-commands.test.ts tests/commands/discovery-commands.test.ts tests/commands/discovery-types.test.ts tests/model-config tests/skill-registry` and confirm all 157+ umb extension tests pass.

## Must-Haves

- [ ] `vitest.config.ts` excludes `**/dist-test/**` in the `test.exclude` array
- [ ] `npx vitest run` reports 0 failed test files (excluding pre-existing agent-babysitter/background-manager failures)
- [ ] All 157+ umb extension tests pass

## Verification

- `npx vitest run 2>&1 | strings | grep "failed"` — should show 0 failed files from dist-test/ (only pre-existing failures if any)
- `npx vitest run tests/commands tests/model-config tests/skill-registry 2>&1 | strings | tail -5` — should show "157 passed" or similar

## Inputs

- `vitest.config.ts` — current Vitest configuration missing dist-test/ exclusion

## Expected Output

- `vitest.config.ts` — updated with dist-test/ exclusion

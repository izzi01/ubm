# S03: Port test suite and verify — UAT

**Milestone:** M104
**Written:** 2026-04-11T03:56:37.014Z

# S03: Port test suite and verify — UAT

**Milestone:** M104
**Written:** 2026-04-11

## UAT Type

- UAT mode: artifact-driven
- Why this mode is sufficient: This slice is a test configuration fix — the deliverable is that `npx vitest run` produces clean results. Verification is entirely artifact-driven (exit codes and test output).

## Preconditions

- Node.js and npm available
- Dependencies installed (`npm install` run)
- Working directory: `/home/cid/projects-personal/iz-to-mo-vu`

## Smoke Test

Run `npx vitest run` and confirm no dist-test/ files appear in the test file list, and 0 umb extension tests fail.

## Test Cases

### 1. Full test suite runs without dist-test pollution

1. Run `npx vitest run 2>&1 | tail -5`
2. **Expected:** Output shows `Test Files  2 failed | 43 passed (45)` — the 2 failures are pre-existing (agent-babysitter, background-manager), not from dist-test/
3. **Expected:** Total test files is ~45, NOT 1200+

### 2. All umb extension tests pass

1. Run `npx vitest run tests/commands/umb-commands.test.ts tests/commands/skill-commands.test.ts tests/commands/discovery-commands.test.ts tests/commands/discovery-types.test.ts tests/model-config tests/skill-registry`
2. **Expected:** `Test Files  7 passed (7)`, `Tests  157 passed (157)`

### 3. dist-test/ files are excluded from Vitest discovery

1. Run `npx vitest run --reporter=verbose 2>&1 | grep -c dist-test`
2. **Expected:** 0 matches — no dist-test files are picked up

## Edge Cases

### vitest.config.ts exclude syntax

1. Verify `vitest.config.ts` contains `'**/dist-test/**'` in the exclude array
2. **Expected:** The exclude array has both `'**/dist/**'` and `'**/dist-test/**'`

## Failure Signals

- Test file count jumps to 1200+ (dist-test/ exclusion not working)
- umb extension tests fail (port broke something)
- New test files appear in dist-test/ and cause failures

## Not Proven By This UAT

- Fork-level tests (those use node:test runner, not Vitest)
- Runtime behavior of the umb extension in the fork binary

## Notes for Tester

- 2 test files (agent-babysitter.test.ts, background-manager.test.ts) have 6 pre-existing failures unrelated to M104 — these are known issues in the pattern library
- The dist-test/ directory is a build artifact from the fork — it should not be committed to git

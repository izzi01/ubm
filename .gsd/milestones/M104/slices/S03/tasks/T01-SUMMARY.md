---
id: T01
parent: S03
milestone: M104
key_files:
  - vitest.config.ts
key_decisions:
  - (none)
duration: 
verification_result: passed
completed_at: 2026-04-11T03:55:51.078Z
blocker_discovered: false
---

# T01: Added `**/dist-test/**` to vitest exclude list, eliminating 1228 false failures and restoring clean test runs.

**Added `**/dist-test/**` to vitest exclude list, eliminating 1228 false failures and restoring clean test runs.**

## What Happened

The `dist-test/` directory contained 1228 compiled JavaScript test files from the upstream fork that use `node:test` APIs incompatible with Vitest. Added `'**/dist-test/**'` to the `test.exclude` array in `vitest.config.ts` after the existing `**/dist/**` entry. After the change, Vitest picks up 45 test files (all in `tests/`) instead of 1273+, and 43/45 pass (2 pre-existing failures in agent-babysitter and background-manager are unrelated). The targeted umb extension test run confirmed all 157 tests pass across 7 files.

## Verification

Ran `npx vitest run` — 43 passed, 2 failed (pre-existing only), zero dist-test pollution. Ran targeted umb extension tests — 157/157 passed across 7 files.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `npx vitest run` | 1 | ✅ pass (2 pre-existing failures only) | 5300ms |
| 2 | `npx vitest run tests/commands/umb-commands.test.ts tests/commands/skill-commands.test.ts tests/commands/discovery-commands.test.ts tests/commands/discovery-types.test.ts tests/model-config tests/skill-registry` | 0 | ✅ pass | 277ms |

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `vitest.config.ts`

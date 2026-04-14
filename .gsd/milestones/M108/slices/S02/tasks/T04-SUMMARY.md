---
id: T04
parent: S02
milestone: M108
key_files:
  - (none)
key_decisions:
  - (none)
duration: 
verification_result: untested
completed_at: 2026-04-12T04:51:49.827Z
blocker_discovered: false
---

# T04: Inlined compareSemver into resource-loader.ts, removed update-check import

**Inlined compareSemver into resource-loader.ts, removed update-check import**

## What Happened

Removed the `import { compareSemver } from './update-check.js'` import from resource-loader.ts and added a local compareSemver function definition right before getNewerManagedResourceVersion. The function is identical to the one that was in update-check.ts.

## Verification

grep -n 'update-check' in resource-loader.ts returns no matches. compareSemver is defined locally in the file.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| — | No verification commands discovered | — | — | — |

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

None.

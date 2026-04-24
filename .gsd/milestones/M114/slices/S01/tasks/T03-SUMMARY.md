---
id: T03
parent: S01
milestone: M114
key_files:
  - tests/fixtures/parity-web-task-manifest.json
  - tests/parity/baseline-lanes.ts
  - tests/parity/run.ts
  - src/tests/integration/parity-fixture-manifest.test.ts
key_decisions:
  - Made `tests/fixtures/parity-web-task-manifest.json` the tracked source of truth for M114 coding-loop capability coverage instead of inferring parity status only from lane pass/fail results.
  - Kept all five fixture capabilities explicitly marked `uncovered` in S01 so the baseline report stays truthful until repo-mode and installed-mode fixture proof lands in later slices.
duration: 
verification_result: mixed
completed_at: 2026-04-24T05:43:42.114Z
blocker_discovered: false
---

# T03: Published the tracked parity web-task acceptance manifest and made the baseline parity report name the uncovered coding-loop capabilities it still does not prove.

**Published the tracked parity web-task acceptance manifest and made the baseline parity report name the uncovered coding-loop capabilities it still does not prove.**

## What Happened

Added a new tracked fixture contract at `tests/fixtures/parity-web-task-manifest.json` that defines the five concrete M114 coding-loop capabilities: inspect repository context, edit application code, run targeted tests, manage dev-server lifecycle, and verify browser behavior. Extended `tests/parity/baseline-lanes.ts` to load and validate that manifest with file-path-aware parse and shape errors, reject missing lane mappings and invalid proof labels, and derive `uncoveredCapabilities` plus `summary.uncoveredCapabilityNames` directly from the tracked manifest so the baseline report cannot over-claim parity. Updated `tests/parity/run.ts` so the JSON output includes the manifest-backed report structure, and added `src/tests/integration/parity-fixture-manifest.test.ts` to verify the manifest shape, the uncovered capability reporting, and the promised negative cases for malformed manifest data and impossible covered/uncovered combinations.

## Verification

Ran the new task-scoped integration test and it passed 5/5, covering manifest shape validation, uncovered-capability reporting, missing mapping failure, invalid proof/coverage label failure, and over-claimed covered capability failure. Then ran the slice-level baseline commands `npm run test:parity:baseline` and `node --experimental-strip-types tests/parity/run.ts --format json`; both exited with code 1 because the pre-existing `smoke-runner` and `pack-install` lanes still fail in the current repo baseline, but both now emitted the new manifest-backed report fields, including all five uncovered coding-loop capability names and detailed uncovered-capability rows in `tests/parity/artifacts/baseline-report.json`. TypeScript LSP diagnostics were unavailable in this workspace, so fresh node:test output and the real baseline command outputs were used as verification evidence.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/parity-fixture-manifest.test.ts` | 0 | ✅ pass | 27100ms |
| 2 | `npm run test:parity:baseline` | 1 | ❌ fail | 113300ms |
| 3 | `node --experimental-strip-types tests/parity/run.ts --format json` | 1 | ❌ fail | 112300ms |

## Deviations

None.

## Known Issues

The broader baseline parity command still fails because the existing `smoke-runner` and `pack-install` lanes fail in the current repository baseline; this task preserved those truthful failures and added clearer uncovered-capability reporting rather than trying to resolve those separate lane issues here.

## Files Created/Modified

- `tests/fixtures/parity-web-task-manifest.json`
- `tests/parity/baseline-lanes.ts`
- `tests/parity/run.ts`
- `src/tests/integration/parity-fixture-manifest.test.ts`

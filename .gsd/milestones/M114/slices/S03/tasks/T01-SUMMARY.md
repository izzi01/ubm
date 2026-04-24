---
id: T01
parent: S03
milestone: M114
key_files:
  - src/tests/integration/pack-install.test.ts
  - tests/live-regression/run.ts
  - tests/parity/baseline-lanes.ts
  - src/tests/integration/repo-mode-parity-contract.test.ts
  - tests/fixtures/recordings/repo-mode-parity-web-task.json
key_decisions:
  - Do not force speculative implementation under context pressure; preserve the discovered installed-mode parity seam and stop without code changes or false verification claims.
duration: 
verification_result: mixed
completed_at: 2026-04-24T06:35:35.000Z
blocker_discovered: false
---

# T01: Investigated the installed-binary parity harness seam and documented that the current task stopped before code changes or verification.

**Investigated the installed-binary parity harness seam and documented that the current task stopped before code changes or verification.**

## What Happened

I loaded the required test and verification skills, queried prior M114 parity memories, and read the task plan plus the current inputs: `src/tests/integration/pack-install.test.ts`, `tests/live-regression/run.ts`, `package.json`, `pkg/package.json`, the parity fixture files, the parity baseline lane definitions, and the existing repo-mode parity contract/tests. From that investigation I confirmed three concrete facts: (1) package metadata is already branded for `umb` / `.umb`, but `src/tests/integration/pack-install.test.ts` and `tests/live-regression/run.ts` still contain stale `gsd`-named assumptions and direct `dist/loader.js` launch patterns; (2) the existing fixture recording files under `tests/fixtures/recordings/` are replay validators only and do not currently execute the real CLI against the tracked parity fixture; and (3) the repo-mode parity lane already has a structured phase-local artifact shape that the installed-mode work should likely mirror later. I stopped at that investigation boundary when the auto wrap-up context-budget warning arrived. No repository files were edited, no new helper was created, and no verification commands were run after the investigation.

## Verification

No verification commands were run in this unit because execution stopped at the investigation/design boundary before any code changes were made. I did not claim a passing harness, packaged parity proof, or updated tests.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `No verification commands were run after the final investigation step in this unit.` | -1 | unknown (coerced from string) | 0ms |

## Deviations

Execution stopped early due the auto-mode context-budget wrap-up event before implementation began. I therefore recorded an honest partial summary instead of making unverified code changes or completion claims.

## Known Issues

The installed-mode proof path is still unresolved. The key open seam is how to make the packaged `umb` binary drive the tracked `tests/fixtures/parity-web-task/` coding loop truthfully in a temp workspace while preserving install-prefix/temp-repo diagnostics, rather than only asserting packaging shape or replaying static fixture recordings. `src/tests/integration/pack-install.test.ts` and `tests/live-regression/run.ts` still contain stale `gsd` assumptions that must be updated in the next attempt.

## Files Created/Modified

- `src/tests/integration/pack-install.test.ts`
- `tests/live-regression/run.ts`
- `tests/parity/baseline-lanes.ts`
- `src/tests/integration/repo-mode-parity-contract.test.ts`
- `tests/fixtures/recordings/repo-mode-parity-web-task.json`

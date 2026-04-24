---
id: T01
parent: S02
milestone: M114
key_files:
  - tests/fixtures/parity-web-task/package.json
  - tests/fixtures/parity-web-task/index.html
  - tests/fixtures/parity-web-task/src/main.ts
  - tests/fixtures/parity-web-task/src/task.ts
  - tests/fixtures/parity-web-task/tests/task.spec.ts
  - tests/fixtures/parity-web-task/TASK.md
  - src/tests/integration/repo-mode-fixture-contract.test.ts
key_decisions:
  - Use a tiny dependency-free static web fixture under `tests/fixtures/parity-web-task/` so parity proof stays local, deterministic, and cheap to materialize.
  - Make the required user-visible change live in tracked application source (`src/task.ts`) while `tests/task.spec.ts` locks the exact browser copy expected after the fix.
  - Use a fixed Node-based dev script that prints a `READY http://127.0.0.1:<port>` line so later parity lanes can wait on an observable signal instead of sleeping.
duration: 
verification_result: mixed
completed_at: 2026-04-24T06:05:37.739Z
blocker_discovered: false
---

# T01: Added the parity web-task fixture and a repo fixture-contract harness, with follow-up needed to finish two failing harness assertions.

**Added the parity web-task fixture and a repo fixture-contract harness, with follow-up needed to finish two failing harness assertions.**

## What Happened

Added the tracked parity web-task fixture under `tests/fixtures/parity-web-task/` with a minimal HTML page, a small render path in `src/main.ts`, a pre-fix status implementation in `src/task.ts`, a task brief in `TASK.md`, and package scripts for `test` and `dev`. The fixture is seeded truthfully red: running the standalone spec against the fixture source shows `Build status: In progress` instead of the required completed copy. I also added `src/tests/integration/repo-mode-fixture-contract.test.ts` to materialize the fixture into temp directories, validate required files/scripts, enforce tracked-input-only task guidance, and cover negative cases for missing task brief, missing test script, malformed temp paths, unexpected dependency declarations, and a broken dev script. Verification revealed two remaining harness defects in the new contract test rather than a plan-invalidating architecture issue: the helper for the red-state check executes the spec file in a way that bypasses the test harness, and the broken-dev assertion expects a narrower parse message than npm actually surfaces.

## Verification

Ran the task-level verification command twice. First run proved the new contract test executes and identified three failures: an overly literal dev-script matcher, a red-state helper that was not exercising the fixture's real test command, and a dependency assertion masked by the first failure. I then verified the standalone fixture spec directly with `node --experimental-strip-types --test tests/fixtures/parity-web-task/tests/task.spec.ts`, which failed as expected and confirmed the fixture starts red. After tightening the dev-script matcher and dependency-path behavior, I reran the integration contract test; five of seven cases passed, leaving two harness-specific failures in `repo-mode-fixture-contract.test.ts`. No slice-level browser or parity-runner verification was attempted yet because this task's own contract test is not green.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/repo-mode-fixture-contract.test.ts` | 1 | ❌ fail | 12100ms |
| 2 | `node --experimental-strip-types --test tests/fixtures/parity-web-task/tests/task.spec.ts` | 1 | ❌ fail | 673ms |
| 3 | `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/repo-mode-fixture-contract.test.ts` | 1 | ❌ fail | 14800ms |

## Deviations

Stopped at the auto-wrap threshold before applying the final harness fix. The fixture app and contract scaffold were added, but `src/tests/integration/repo-mode-fixture-contract.test.ts` still needs one follow-up edit: switch the red-state helper to run `npm test` semantics instead of executing the spec file directly, and widen the broken-dev assertion to accept npm/shell parse-failure text.

## Known Issues

`node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/repo-mode-fixture-contract.test.ts` is still failing in two harness assertions: the red-state helper currently invokes the fixture test incorrectly and reports exit code 0, and the broken-dev negative assertion is narrower than the npm/shell parse error actually emitted. The fixture files themselves are present and the standalone fixture spec is genuinely red in its initial state.

## Files Created/Modified

- `tests/fixtures/parity-web-task/package.json`
- `tests/fixtures/parity-web-task/index.html`
- `tests/fixtures/parity-web-task/src/main.ts`
- `tests/fixtures/parity-web-task/src/task.ts`
- `tests/fixtures/parity-web-task/tests/task.spec.ts`
- `tests/fixtures/parity-web-task/TASK.md`
- `src/tests/integration/repo-mode-fixture-contract.test.ts`

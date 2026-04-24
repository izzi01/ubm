---
id: T02
parent: S05
milestone: M115
key_files:
  - tests/parity/secondary-release-gate.ts
  - src/tests/integration/secondary-release-gate-contract.test.ts
  - tests/parity/artifacts/secondary-release-report.json
key_decisions:
  - Composed the new secondary release gate from the existing canonical baseline report plus the dedicated MCP/workflow artifacts and T01 manifest-backed worktree/rebrand contracts instead of adding another independent runner stack.
  - Kept planned-proof optional lanes and provider-driven live coverage explicitly visible in the report but non-blocking, while making web-mode, MCP, workflow/BMAD, worktree/session/recovery, and scoped rebrand drift the required secondary-surface verdict drivers.
  - Preserved artifact paths, failed surfaces, and failed phases directly in both JSON and text output so downstream release consumers can diagnose a red lane without rediscovering lower-level evidence.
duration: 
verification_result: mixed
completed_at: 2026-04-24T11:17:35.738Z
blocker_discovered: false
---

# T02: Added the integrated secondary-surface release gate and report that composes web, MCP, workflow, worktree/session, and scoped rebrand parity into one truthful release-facing artifact.

**Added the integrated secondary-surface release gate and report that composes web, MCP, workflow, worktree/session, and scoped rebrand parity into one truthful release-facing artifact.**

## What Happened

Implemented `tests/parity/secondary-release-gate.ts` as a dedicated integrated release gate that consumes the canonical baseline parity artifact, preserves existing MCP and workflow parity artifacts, evaluates the T01 worktree/session manifest and scoped rebrand drift contracts directly, and writes the new `tests/parity/artifacts/secondary-release-report.json` artifact. The gate treats five lanes as required and blocking — web-mode, MCP, workflow/BMAD, worktree/session/recovery, and scoped rebrand drift — while keeping planned-proof optional lanes and provider-driven live coverage explicit but non-blocking in both text and JSON output. Added `src/tests/integration/secondary-release-gate-contract.test.ts` to pin the report shape, passing behavior, required-lane failure behavior, artifact-path preservation, failed surface/phase reporting, CLI non-zero exit semantics, and integrated artifact emission. During verification the first run failed because I imported `loadBaselineReport` from `baseline-lanes.ts` instead of `diagnostics.ts`; after correcting that import, one contract still failed because workflow verification failure attribution was not surfaced as a phase, so I tightened the workflow lane logic to emit `workflow-verification` when verification evidence is red and reran the same scoped verification to green.

## Verification

Ran the task verification command from the plan: `node --experimental-strip-types tests/parity/secondary-release-gate.ts --format text && node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/secondary-release-gate-contract.test.ts`. The first attempt failed immediately with a module import error because `loadBaselineReport` was imported from the wrong file. After fixing that import, the second attempt exercised the new gate and contract test but failed one expectation because a synthetic workflow failure did not yet map to an explicit failed phase. I updated the workflow lane failure attribution to emit `workflow-verification` when verification evidence is red, reran the exact same command, and it passed with all 4 contract tests green while also writing the canonical `tests/parity/artifacts/secondary-release-report.json` artifact. I also re-ran `node --experimental-strip-types tests/parity/secondary-release-gate.ts --format text` once more to confirm the emitted report remained green and the artifact stayed present.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `node --experimental-strip-types tests/parity/secondary-release-gate.ts --format text && node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/secondary-release-gate-contract.test.ts` | 1 | ❌ fail | 123ms |
| 2 | `node --experimental-strip-types tests/parity/secondary-release-gate.ts --format text && node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/secondary-release-gate-contract.test.ts` | 0 | ✅ pass | 410ms |
| 3 | `node --experimental-strip-types tests/parity/secondary-release-gate.ts --format text` | 0 | ✅ pass | 0ms |

## Deviations

None.

## Known Issues

The integrated secondary release gate is green, but the underlying baseline parity summary it reports remains truthfully `failing` because `fixtures-runner` is still red and `live-runner` is skipped unless explicitly enabled. Those are preserved as explicit non-blocking/context signals for this secondary-surface gate rather than hidden or reclassified.

## Files Created/Modified

- `tests/parity/secondary-release-gate.ts`
- `src/tests/integration/secondary-release-gate-contract.test.ts`
- `tests/parity/artifacts/secondary-release-report.json`

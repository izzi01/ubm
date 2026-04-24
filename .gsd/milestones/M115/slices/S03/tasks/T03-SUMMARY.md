---
id: T03
parent: S03
milestone: M115
key_files:
  - tests/parity/diagnostics.ts
  - src/tests/integration/mcp-parity-diagnostics-contract.test.ts
key_decisions:
  - Kept MCP diagnostics as an extension of the shared baseline-report renderer so release gates and operators continue using one canonical parity inspection surface.
  - Locked MCP failure messaging through synthetic degraded report variants in tests instead of trying to induce brittle live failures during verification.
duration: 
verification_result: mixed
completed_at: 2026-04-24T10:34:27.579Z
blocker_discovered: false
---

# T03: Locked MCP parity diagnostics with artifact-path, phase, and failure-attribution contract coverage in the shared parity renderer.

**Locked MCP parity diagnostics with artifact-path, phase, and failure-attribution contract coverage in the shared parity renderer.**

## What Happened

Extended the shared parity diagnostics renderer in `tests/parity/diagnostics.ts` to emit an MCP-specific diagnostic section from the existing baseline report contract instead of introducing a separate MCP-only reporting path. The new MCP section names the report/artifact/recording paths and renders actionable lines for configured-server status, tool discovery, schema inspection, successful invocation, and intentional invocation failure attribution, including the affected phase and artifact path. Added `src/tests/integration/mcp-parity-diagnostics-contract.test.ts` to lock the success-path wording against the tracked baseline artifact and to exercise controlled degraded variants covering missing configured server readiness, schema mismatch attribution, successful-call reporting drift, and failure-reporting drift. This keeps MCP parity regressions release-readable and prevents them from collapsing back into opaque stderr-only failures while preserving the existing diagnostics contract behavior for the rest of the parity/report surface.

## Verification

Ran the task’s required verification command: `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/mcp-parity-diagnostics-contract.test.ts`, which passed all four MCP diagnostics contract assertions. Then ran the adjacent shared diagnostics contract suite with `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/parity-diagnostics-contract.test.ts src/tests/integration/web-mode-diagnostics-contract.test.ts` to confirm the shared renderer change did not regress the existing baseline or web-mode diagnostic surfaces; all nine assertions passed. Attempted LSP diagnostics for the touched files, but no language server was available in this environment, so verification relied on the passing node test contracts.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/mcp-parity-diagnostics-contract.test.ts` | 0 | ✅ pass | 270ms |
| 2 | `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/parity-diagnostics-contract.test.ts src/tests/integration/web-mode-diagnostics-contract.test.ts` | 0 | ✅ pass | 484ms |
| 3 | `lsp diagnostics tests/parity/diagnostics.ts` | 1 | ❌ fail | 20ms |
| 4 | `lsp diagnostics src/tests/integration/mcp-parity-diagnostics-contract.test.ts` | 1 | ❌ fail | 20ms |

## Deviations

Implemented the MCP diagnostic contract by extending the existing shared `tests/parity/diagnostics.ts` renderer rather than creating a separate MCP-only diagnostics entrypoint. This matched the repo’s established pattern of treating diagnostics as a renderer over the baseline report JSON contract and kept all parity surfaces on one inspection path.

## Known Issues

LSP diagnostics could not be run because no language server was available for this workspace session. The shared test contracts passed, so there is no known functional regression from the change.

## Files Created/Modified

- `tests/parity/diagnostics.ts`
- `src/tests/integration/mcp-parity-diagnostics-contract.test.ts`

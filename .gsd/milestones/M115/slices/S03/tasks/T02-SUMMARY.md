---
id: T02
parent: S03
milestone: M115
key_files:
  - tests/parity/mcp-parity.ts
  - tests/parity/baseline-lanes.ts
  - tests/parity/secondary-lanes.ts
  - tests/fixtures/secondary-parity-manifest.json
  - src/tests/integration/mcp-parity-contract.test.ts
  - tests/parity/artifacts/mcp-parity.json
  - tests/fixtures/recordings/mcp-parity.json
key_decisions:
  - Added a dedicated `mcpParity` section to the shared baseline report rather than overloading the existing generic secondary-surface row shape, so MCP-specific discovery/call/failure diagnostics remain explicit and machine-readable.
  - Kept the broader `secondaryParity` matrix truthful for non-MCP surfaces instead of force-closing unrelated coverage gaps while landing the MCP artifact lane.
duration: 
verification_result: passed
completed_at: 2026-04-24T10:30:33.931Z
blocker_discovered: false
---

# T02: Added a deterministic MCP parity lane, tracked MCP parity artifacts, and baseline report wiring for release-readable MCP diagnostics.

**Added a deterministic MCP parity lane, tracked MCP parity artifacts, and baseline report wiring for release-readable MCP diagnostics.**

## What Happened

Implemented a dedicated MCP parity helper at `tests/parity/mcp-parity.ts` that connects to the tracked stdio fixture from T01, proves configured-server startup, tool discovery, schema inspection, successful invocation, and intentional failure attribution, then writes the same machine-readable payload to both `tests/fixtures/recordings/mcp-parity.json` and `tests/parity/artifacts/mcp-parity.json`. Wired the shared parity runner/report in `tests/parity/baseline-lanes.ts` to generate that payload during `tests/parity/run.ts`, expose it as a first-class `mcpParity` report section, and keep the broader `secondaryParity` matrix truthful about the remaining non-MCP partial surfaces. Added `src/tests/integration/mcp-parity-contract.test.ts` to lock the emitted MCP parity row and artifact files. Updated the tracked secondary-parity manifest definitions so the MCP release-readable lane is now modeled as existing proof backed by the new tracked artifact path. During verification I first hit a self-inflicted manifest regression from an over-broad status replacement that incorrectly marked the web-mode reserved artifact as present; I reverted that unintended change, reran the task verification, and confirmed the final command passed.

## Verification

Ran the task’s required verification command: `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/mcp-parity-contract.test.ts && node --experimental-strip-types tests/parity/run.ts --format json`. The integration contract passed and the parity runner emitted the new `mcpParity` payload plus matching tracked artifacts at `tests/parity/artifacts/mcp-parity.json` and `tests/fixtures/recordings/mcp-parity.json`. The final report truthfully keeps `secondaryParity` partial for web/workflow/worktree while showing MCP-specific release-readable diagnostics through the dedicated `mcpParity` section.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/mcp-parity-contract.test.ts && node --experimental-strip-types tests/parity/run.ts --format json` | 0 | ✅ pass | 120000ms |

## Deviations

Used a dedicated top-level `mcpParity` report block in the shared baseline report instead of retrofitting the existing generic `secondaryParity` surface rows to carry the full MCP invocation diagnostics. This preserved the established partial-surface matrix for other secondary surfaces while still satisfying the task’s requirement for machine-readable MCP discovery/schema/success/failure evidence.

## Known Issues

The generic `secondaryParity` matrix still lists the MCP surface as partial with legacy coverage gaps because that broader matrix remains scoped to the original four-surface inventory contract; the new release-readable MCP truth now lives in the dedicated `mcpParity` block and tracked artifact. A follow-up task can reconcile those two surfaces if the milestone wants a single unified MCP row there as well.

## Files Created/Modified

- `tests/parity/mcp-parity.ts`
- `tests/parity/baseline-lanes.ts`
- `tests/parity/secondary-lanes.ts`
- `tests/fixtures/secondary-parity-manifest.json`
- `src/tests/integration/mcp-parity-contract.test.ts`
- `tests/parity/artifacts/mcp-parity.json`
- `tests/fixtures/recordings/mcp-parity.json`

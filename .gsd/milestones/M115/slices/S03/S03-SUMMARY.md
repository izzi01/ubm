---
id: S03
parent: M115
milestone: M115
provides:
  - Controlled MCP parity proof for discover → call → failure diagnostics on a deterministic fixture server
  - Tracked MCP artifact and recording paths that downstream release/report slices can summarize without rerunning the fixture interactively
  - Shared diagnostic wording for missing server, schema mismatch, successful call reporting, and failure attribution
requires:
  - slice: S01
    provides: Controlled MCP parity contract and secondary-surface scope definition from the milestone inventory/manifest work.
affects:
  - S05
key_files:
  - tests/fixtures/mcp-parity-server/server.mjs
  - tests/fixtures/mcp-parity-manifest.json
  - tests/parity/mcp-parity.ts
  - tests/parity/baseline-lanes.ts
  - tests/parity/diagnostics.ts
  - src/tests/integration/mcp-parity-fixture-contract.test.ts
  - src/tests/integration/mcp-parity-contract.test.ts
  - src/tests/integration/mcp-parity-diagnostics-contract.test.ts
  - tests/parity/artifacts/mcp-parity.json
  - tests/fixtures/recordings/mcp-parity.json
key_decisions:
  - Use a real stdio MCP fixture server instead of an in-memory-only mock so the parity proof exercises the shipped MCP transport shape.
  - Store the MCP contract in a tracked manifest and reuse it across fixture tests, parity runner output, and diagnostics.
  - Expose MCP closure through a dedicated top-level `mcpParity` report block rather than overloading the generic `secondaryParity` matrix.
  - Keep MCP diagnostics on the shared parity renderer path so operators still inspect one canonical report-derived diagnostic surface.
patterns_established:
  - Truthfulness-first secondary-surface closure can be incremental: add a dedicated top-level report block for a newly closed surface while leaving the broader secondary matrix partial for still-open surfaces.
  - For deterministic MCP proof, pair a real stdio fixture server with a tracked manifest and emit both an artifact path and recording path so downstream release/report consumers do not need live reruns.
  - Lock failure readability with synthetic degraded report variants instead of depending on brittle live-failure reproduction during verification.
observability_surfaces:
  - `tests/parity/artifacts/mcp-parity.json` as the canonical machine-readable MCP parity artifact
  - `tests/fixtures/recordings/mcp-parity.json` as the tracked MCP parity recording/evidence path
  - `tests/parity/diagnostics.ts` MCP section rendering configured-server, tool-discovery, schema, success, and failure diagnostics from the canonical report
drill_down_paths:
  - .gsd/milestones/M115/slices/S03/tasks/T01-SUMMARY.md
  - .gsd/milestones/M115/slices/S03/tasks/T02-SUMMARY.md
  - .gsd/milestones/M115/slices/S03/tasks/T03-SUMMARY.md
duration: ""
verification_result: passed
completed_at: 2026-04-24T10:38:18.083Z
blocker_discovered: false
---

# S03: S03

**Delivered deterministic MCP parity proof with a real stdio fixture server, tracked MCP parity artifacts, and locked release-readable diagnostics for discovery, schema inspection, success, and failure attribution.**

## What Happened

S03 closed the controlled MCP parity lane that M115/S01 had only scoped. T01 introduced a deterministic stdio fixture server plus a tracked MCP manifest so the slice exercised the same transport shape the shipped MCP client extension uses instead of relying on an in-memory mock. T02 added a dedicated MCP parity runner/report path that proves configured-server startup, tool discovery, schema inspection, successful invocation, and intentional invocation failure, then writes that proof to tracked machine-readable artifacts for downstream release/report consumers. T03 hardened the shared parity diagnostics renderer so operators can inspect MCP parity through the canonical report surface with explicit artifact paths, affected phase naming, and actionable missing-server/schema-mismatch/invocation-failure messaging. During closure verification, all slice-plan commands passed. The overall baseline parity report still truthfully shows broader milestone gaps outside this slice, but the dedicated `mcpParity` block now reports `releaseReadableStatus: covered` and `parityStatus: passed`, which is the actual S03 deliverable. This slice establishes the pattern that secondary surfaces can gain release-readable proof incrementally via dedicated top-level report blocks while the broader secondary matrix remains truthful about still-open non-MCP work.

## Verification

Ran all slice-plan verification commands successfully: (1) `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/mcp-parity-fixture-contract.test.ts` passed, proving the deterministic stdio fixture supports discovery, schema inspection, successful invocation, and intentional failure diagnostics; (2) `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/mcp-parity-contract.test.ts && node --experimental-strip-types tests/parity/run.ts --format json` passed, proving the shared parity runner emits the MCP parity artifact and report block; (3) `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/mcp-parity-diagnostics-contract.test.ts` passed, locking artifact-path and phase-aware MCP diagnostics. Additional observability verification: `node --experimental-strip-types tests/parity/diagnostics.ts --report tests/parity/artifacts/baseline-report.json` rendered the MCP diagnostic section with configured-server, tool-discovery, schema-inspection, success-invocation, and failure-invocation details. Verified current artifact state from the emitted report: `tests/parity/artifacts/mcp-parity.json` and `tests/fixtures/recordings/mcp-parity.json` exist as the tracked MCP evidence paths; configured server status, discovered tools status, schema inspection status, success invocation status, and failure invocation status all read as `passed`.

## Requirements Advanced

None.

## Requirements Validated

None.

## New Requirements Surfaced

- No new requirement IDs were added in this slice; S03 advances milestone-level secondary-surface parity scope by making MCP proof release-readable.

## Requirements Invalidated or Re-scoped

None.

## Operational Readiness

None.

## Deviations

S03 delivered release-readable MCP closure through a dedicated top-level `mcpParity` report block instead of retrofitting the existing generic `secondaryParity` surface row shape. This was intentional so MCP-specific discovery/schema/success/failure diagnostics could stay explicit and machine-readable while the broader matrix remained truthful about still-open non-MCP surfaces.

## Known Limitations

The broader `secondaryParity` matrix still carries legacy MCP coverage-gap metadata and remains partial because it is tracking the original multi-surface inventory contract, not the dedicated MCP closure block introduced here. Also, this slice proves a deterministic controlled MCP interaction against the fixture server; it does not yet prove a representative installed packaged CLI MCP interaction in the parity matrix.

## Follow-ups

S05 should decide whether to reconcile the old `secondaryParity.surfaces.mcp` row with the dedicated `mcpParity` block or intentionally keep both surfaces with documented semantics. A future slice can also add an installed-mode representative MCP session recording if milestone-level parity policy requires repo/install dual proof for MCP.

## Files Created/Modified

- `tests/fixtures/mcp-parity-server/server.mjs` — Added deterministic stdio MCP fixture server with stable tools and intentional failure mode.
- `tests/fixtures/mcp-parity-manifest.json` — Tracked the expected MCP contract, discovery surface, schema details, success case, and failure case.
- `tests/parity/mcp-parity.ts` — Implemented the dedicated MCP parity lane and artifact emission logic.
- `tests/parity/baseline-lanes.ts` — Wired MCP parity output into the shared parity runner/report.
- `tests/parity/diagnostics.ts` — Extended the shared renderer to emit MCP-specific actionable diagnostics.
- `src/tests/integration/mcp-parity-fixture-contract.test.ts` — Locked end-to-end stdio fixture discovery, schema inspection, success, and failure behavior.
- `src/tests/integration/mcp-parity-contract.test.ts` — Locked the emitted MCP parity block and artifact contract.
- `src/tests/integration/mcp-parity-diagnostics-contract.test.ts` — Locked MCP artifact-path and phase-aware diagnostics wording.
- `tests/parity/artifacts/mcp-parity.json` — Tracked machine-readable MCP parity artifact emitted by the parity lane.
- `tests/fixtures/recordings/mcp-parity.json` — Tracked MCP recording/evidence output for downstream consumers.

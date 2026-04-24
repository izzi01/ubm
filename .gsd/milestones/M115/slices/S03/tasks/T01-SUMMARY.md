---
id: T01
parent: S03
milestone: M115
key_files:
  - tests/fixtures/mcp-parity-server/server.mjs
  - tests/fixtures/mcp-parity-manifest.json
  - src/tests/integration/mcp-parity-fixture-contract.test.ts
key_decisions:
  - Used a real stdio MCP fixture server instead of an in-memory-only mock so the contract exercises the same transport shape the MCP client extension uses.
  - Stored the expected MCP contract in a tracked manifest so downstream parity/report tasks can reuse a single deterministic source of truth for discovery, schema, success, and failure expectations.
duration: 
verification_result: passed
completed_at: 2026-04-24T10:22:25.047Z
blocker_discovered: false
---

# T01: Added a deterministic stdio MCP parity fixture server, manifest contract, and integration test covering discovery, schema inspection, successful invocation, and intentional failure diagnostics.

**Added a deterministic stdio MCP parity fixture server, manifest contract, and integration test covering discovery, schema inspection, successful invocation, and intentional failure diagnostics.**

## What Happened

Implemented a tracked MCP fixture under `tests/fixtures/mcp-parity-server/` using the same stdio transport style already exercised elsewhere in the repo, rather than a purely in-memory-only mock. Added `tests/fixtures/mcp-parity-manifest.json` to declare the expected server identity, tool surface, schema contract, happy-path invocation, failure-path invocation, and observability lines. Added `src/tests/integration/mcp-parity-fixture-contract.test.ts` to connect to the fixture over stdio, assert `listTools` output and `inputSchema` details, verify a successful `sum_numbers` call, verify an intentional `fixture_failure` MCP error with machine-readable attribution, and confirm the status tool exposes deterministic observability metadata. This establishes the controlled MCP contract that downstream parity-lane/report tasks can consume without introducing external dependencies.

## Verification

Ran the task’s required integration contract command and confirmed both manifest alignment and end-to-end stdio MCP interaction pass. The verification proved the deterministic fixture supports server discovery, schema inspection, successful invocation, intentional failure attribution, and a stable stderr readiness signal for future diagnostics/reporting work.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/mcp-parity-fixture-contract.test.ts` | 0 | ✅ pass | 565ms |

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `tests/fixtures/mcp-parity-server/server.mjs`
- `tests/fixtures/mcp-parity-manifest.json`
- `src/tests/integration/mcp-parity-fixture-contract.test.ts`

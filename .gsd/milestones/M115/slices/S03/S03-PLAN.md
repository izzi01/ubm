# S03: MCP parity proof

**Goal:** Validate that umb's MCP/tool-integration surface matches the expected gsd2-level operator behavior on a controlled test server.
**Demo:** After this: umb can prove controlled MCP parity for discover → call → failure diagnostics on a repeatable fixture server rather than relying on anecdotal real-server usage.

## Must-Haves

- A controlled MCP fixture proves server discovery, tool schema discovery, successful tool execution, and clear failure surfaces. The parity report includes MCP lane status and actionable diagnostics.

## Proof Level

- This slice proves: Contract/integration tests against a deterministic MCP fixture plus machine-readable parity diagnostics.

## Integration Closure

MCP parity evidence plugs into the shared report/release gate alongside web/workflow/worktree evidence.

## Verification

- Adds MCP-specific artifact/report diagnostics for server status, tool discovery, invocation results, and clear failure attribution.

## Tasks

- [ ] **T01: Create controlled MCP fixture server and contract** `est:1 day`
  Build or adapt a controlled MCP fixture server with a small deterministic tool surface that can be used in tests without external dependencies. The fixture should support server discovery, schema inspection, successful tool invocation, and at least one intentional failure mode so diagnostics can be asserted truthfully.
  - Files: `tests/fixtures/mcp-parity-manifest.json`, `src/tests/integration/mcp-parity-fixture-contract.test.ts`, `src/resources/extensions/mcp-client/`
  - Verify: node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/mcp-parity-fixture-contract.test.ts

- [ ] **T02: Implement MCP parity lane and report artifact** `est:1-1.5 days`
  Implement the MCP parity proof lane in the shared parity runner/report. The lane should prove configured-server discovery, tool schema discovery, successful tool execution, and actionable failure reporting when the fixture returns an error or mismatched schema. Capture the resulting machine-readable artifact so the final release report can summarize MCP parity without rerunning the fixture interactively.
  - Files: `tests/parity/secondary-lanes.ts`, `tests/parity/run.ts`, `tests/parity/diagnostics.ts`, `tests/fixtures/recordings/mcp-parity.json`, `src/tests/integration/mcp-parity-contract.test.ts`
  - Verify: node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/mcp-parity-contract.test.ts && node --experimental-strip-types tests/parity/run.ts --format json

- [ ] **T03: Lock MCP diagnostic contract** `est:0.5 day`
  Harden the diagnostic surface so MCP parity failures remain actionable. Lock the output for missing server, schema mismatch, invocation failure, and successful call reporting, and ensure the report names the MCP artifact path and affected phase/surface clearly.
  - Files: `tests/parity/diagnostics.ts`, `src/tests/integration/mcp-parity-diagnostics-contract.test.ts`, `tests/parity/artifacts/mcp-parity.json`
  - Verify: node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/mcp-parity-diagnostics-contract.test.ts

## Files Likely Touched

- tests/fixtures/mcp-parity-manifest.json
- src/tests/integration/mcp-parity-fixture-contract.test.ts
- src/resources/extensions/mcp-client/
- tests/parity/secondary-lanes.ts
- tests/parity/run.ts
- tests/parity/diagnostics.ts
- tests/fixtures/recordings/mcp-parity.json
- src/tests/integration/mcp-parity-contract.test.ts
- src/tests/integration/mcp-parity-diagnostics-contract.test.ts
- tests/parity/artifacts/mcp-parity.json

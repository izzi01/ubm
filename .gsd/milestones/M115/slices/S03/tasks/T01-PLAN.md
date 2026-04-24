---
estimated_steps: 1
estimated_files: 3
skills_used: []
---

# T01: Create controlled MCP fixture server and contract

Build or adapt a controlled MCP fixture server with a small deterministic tool surface that can be used in tests without external dependencies. The fixture should support server discovery, schema inspection, successful tool invocation, and at least one intentional failure mode so diagnostics can be asserted truthfully.

## Inputs

- `M115 S01 parity matrix/contracts`
- `existing MCP client/server test patterns`

## Expected Output

- `tests/fixtures/mcp-parity-server/`
- `tests/fixtures/mcp-parity-manifest.json`
- `src/tests/integration/mcp-parity-fixture-contract.test.ts`

## Verification

node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/mcp-parity-fixture-contract.test.ts

## Observability Impact

Creates a deterministic MCP surface with both happy-path and failure-path observables.

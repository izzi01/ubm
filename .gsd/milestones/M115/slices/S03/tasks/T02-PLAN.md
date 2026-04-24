---
estimated_steps: 1
estimated_files: 5
skills_used: []
---

# T02: Implement MCP parity lane and report artifact

Implement the MCP parity proof lane in the shared parity runner/report. The lane should prove configured-server discovery, tool schema discovery, successful tool execution, and actionable failure reporting when the fixture returns an error or mismatched schema. Capture the resulting machine-readable artifact so the final release report can summarize MCP parity without rerunning the fixture interactively.

## Inputs

- `MCP fixture contract from T01`
- `existing parity report plumbing`
- `existing MCP discovery/call APIs`

## Expected Output

- `tests/fixtures/recordings/mcp-parity.json`
- `src/tests/integration/mcp-parity-contract.test.ts`
- `tests/parity/artifacts/mcp-parity.json`

## Verification

node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/mcp-parity-contract.test.ts && node --experimental-strip-types tests/parity/run.ts --format json

## Observability Impact

Adds structured MCP parity lane results with server/tool/failure diagnostics to the parity report.

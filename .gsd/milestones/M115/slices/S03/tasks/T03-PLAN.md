---
estimated_steps: 1
estimated_files: 3
skills_used: []
---

# T03: Lock MCP diagnostic contract

Harden the diagnostic surface so MCP parity failures remain actionable. Lock the output for missing server, schema mismatch, invocation failure, and successful call reporting, and ensure the report names the MCP artifact path and affected phase/surface clearly.

## Inputs

- `MCP artifact/report from T02`

## Expected Output

- `src/tests/integration/mcp-parity-diagnostics-contract.test.ts`

## Verification

node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/mcp-parity-diagnostics-contract.test.ts

## Observability Impact

Prevents MCP parity regressions from collapsing back into opaque stderr-only failures.

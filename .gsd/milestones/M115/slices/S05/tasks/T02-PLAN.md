---
estimated_steps: 1
estimated_files: 5
skills_used: []
---

# T02: Implement integrated secondary-surface release gate

Extend the parity runner and release-gate plumbing so the M115 report composes web, MCP, workflow, worktree/session, and rebrand lanes into one secondary-surface verdict. Required lanes must drive the verdict; optional/live/provider-driven lanes must remain explicit but non-blocking. Preserve artifact paths, failed surfaces/phases, and operator-facing diagnostics in both text and JSON output.

## Inputs

- `Outputs from S02/S03/S04`
- `worktree/session and rebrand contracts from T01`
- `M114 release-gate patterns`

## Expected Output

- `tests/parity/secondary-release-gate.ts`
- `tests/parity/artifacts/secondary-release-report.json`
- `src/tests/integration/secondary-release-gate-contract.test.ts`

## Verification

node --experimental-strip-types tests/parity/secondary-release-gate.ts --format text && node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/secondary-release-gate-contract.test.ts

## Observability Impact

Produces the integrated machine-readable and operator-facing release artifact for the secondary parity band.

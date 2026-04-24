---
estimated_steps: 1
estimated_files: 5
skills_used: []
---

# T02: Define secondary parity matrix and fixture manifests

Turn the audit into tracked parity contracts. Define the scoped surfaces, proof classes, required vs optional lanes, and deterministic fixtures/manifests for web mode, MCP, representative workflow parity, and worktree/session/recovery parity. Lock the report shape and uncovered-surface semantics in contract tests so future slices extend a stable truth surface rather than mutating expectations ad hoc.

## Inputs

- `Results of T01 audit`
- `M115 roadmap success criteria`
- `existing parity fixture/recording patterns from M114`

## Expected Output

- `tests/fixtures/secondary-parity-manifest.json`
- `tests/parity/secondary-lanes.ts`
- `src/tests/integration/secondary-parity-manifest.test.ts`

## Verification

node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/secondary-surface-inventory-contract.test.ts src/tests/integration/secondary-parity-manifest.test.ts

## Observability Impact

Creates machine-readable fixture metadata and lane definitions for downstream proof slices.

---
estimated_steps: 1
estimated_files: 8
skills_used: []
---

# T01: Audit secondary surfaces and rebrand drift

Review the current repo state after M114 and inventory the secondary surfaces that matter for parity with gsd2: web mode, MCP, workflow/BMAD, and worktree/session/recovery. Capture what already has coverage, what is uncovered, and where stale `gsd`/`gsd-pi` assumptions still exist in help text, smoke tests, packaging, or runtime diagnostics. Produce a truthful drift list that downstream slices can retire one band at a time.

## Inputs

- `M114 roadmap and slice summaries`
- `package.json bin/help contract`
- `existing parity report/artifacts`
- `existing smoke/integration/web/MCP/worktree tests`

## Expected Output

- `tests/parity/secondary-surface-inventory.ts`
- `tests/parity/artifacts/secondary-surface-inventory.json`
- `src/tests/integration/secondary-surface-inventory-contract.test.ts`

## Verification

rg -n "gsd-pi|Usage: gsd|\[gsd\]" src tests package.json && node --experimental-strip-types tests/parity/run.ts --format json

## Observability Impact

Produces an explicit inventory/drift artifact instead of leaving secondary parity assumptions implicit.

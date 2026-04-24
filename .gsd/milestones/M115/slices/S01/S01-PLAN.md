# S01: Secondary parity inventory and contracts

**Goal:** Inventory the non-core parity surfaces that matter next, define their scope boundaries, and publish the deterministic fixtures/contracts plus rebrand-drift audit that downstream slices will implement.
**Demo:** After this: one truthful secondary-surface parity matrix/report says what umb already proves versus gsd2 on web mode, MCP, workflow, and worktree/session surfaces, and defines deterministic fixtures/contracts for the downstream proof slices.

## Must-Haves

- A tracked matrix/report lists the scoped secondary surfaces, their current coverage state, and the proof lanes/fixtures that will validate them. Deterministic contracts exist for web mode, MCP, representative workflow parity, and worktree/session/recovery parity. Remaining stale gsd-facing smoke/help/package surfaces are enumerated as explicit drift instead of hidden assumptions.

## Proof Level

- This slice proves: Machine-readable inventory artifact plus contract tests validating matrix shape, fixture metadata, and truthful uncovered-surface reporting.

## Integration Closure

Downstream slices consume the published fixtures/contracts instead of inventing their own parity definitions.

## Verification

- Adds a structured secondary-parity inventory/report and rebrand-drift audit surface that the final release gate can read.

## Tasks

- [x] **T01: Audit secondary surfaces and rebrand drift** `est:0.5-1 day`
  Review the current repo state after M114 and inventory the secondary surfaces that matter for parity with gsd2: web mode, MCP, workflow/BMAD, and worktree/session/recovery. Capture what already has coverage, what is uncovered, and where stale `gsd`/`gsd-pi` assumptions still exist in help text, smoke tests, packaging, or runtime diagnostics. Produce a truthful drift list that downstream slices can retire one band at a time.
  - Files: `tests/parity/run.ts`, `tests/parity/baseline-lanes.ts`, `tests/smoke/test-help.ts`, `tests/smoke/test-init.ts`, `tests/smoke/test-version.ts`, `src/help-text.ts`, `src/cli.ts`, `package.json`
  - Verify: rg -n "gsd-pi|Usage: gsd|\[gsd\]" src tests package.json && node --experimental-strip-types tests/parity/run.ts --format json

- [x] **T02: Define secondary parity matrix and fixture manifests** `est:1 day`
  Turn the audit into tracked parity contracts. Define the scoped surfaces, proof classes, required vs optional lanes, and deterministic fixtures/manifests for web mode, MCP, representative workflow parity, and worktree/session/recovery parity. Lock the report shape and uncovered-surface semantics in contract tests so future slices extend a stable truth surface rather than mutating expectations ad hoc.
  - Files: `tests/parity/secondary-surface-inventory.ts`, `tests/parity/secondary-lanes.ts`, `tests/fixtures/secondary-parity-manifest.json`, `src/tests/integration/secondary-surface-inventory-contract.test.ts`, `src/tests/integration/secondary-parity-manifest.test.ts`
  - Verify: node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/secondary-surface-inventory-contract.test.ts src/tests/integration/secondary-parity-manifest.test.ts

- [x] **T03: Publish baseline secondary-parity report wiring** `est:0.5-1 day`
  Extend the parity runner/report plumbing so M115 has an explicit baseline inventory for secondary surfaces. The runner should emit structured lane metadata, uncovered surfaces, drift findings, and report paths even when the verdict is partial. Keep the report usable by downstream diagnostics and release-gate slices without requiring live reruns.
  - Files: `tests/parity/run.ts`, `tests/parity/diagnostics.ts`, `tests/parity/artifacts/secondary-surface-inventory.json`, `src/tests/integration/secondary-parity-report-contract.test.ts`
  - Verify: node --experimental-strip-types tests/parity/run.ts --format json && node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/secondary-parity-report-contract.test.ts

## Files Likely Touched

- tests/parity/run.ts
- tests/parity/baseline-lanes.ts
- tests/smoke/test-help.ts
- tests/smoke/test-init.ts
- tests/smoke/test-version.ts
- src/help-text.ts
- src/cli.ts
- package.json
- tests/parity/secondary-surface-inventory.ts
- tests/parity/secondary-lanes.ts
- tests/fixtures/secondary-parity-manifest.json
- src/tests/integration/secondary-surface-inventory-contract.test.ts
- src/tests/integration/secondary-parity-manifest.test.ts
- tests/parity/diagnostics.ts
- tests/parity/artifacts/secondary-surface-inventory.json
- src/tests/integration/secondary-parity-report-contract.test.ts

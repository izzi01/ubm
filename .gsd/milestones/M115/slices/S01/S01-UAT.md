# S01: S01 — UAT

**Milestone:** M115
**Written:** 2026-04-24T10:01:19.612Z

# S01 UAT — Secondary-surface parity inventory and contracts

## Preconditions

1. Work in the repo root: `/home/cid/projects-personal/umb`.
2. Node is available with support for `--experimental-strip-types`.
3. The slice outputs exist in the working tree:
   - `tests/parity/secondary-surface-inventory.ts`
   - `tests/parity/artifacts/secondary-surface-inventory.json`
   - `tests/parity/secondary-lanes.ts`
   - `tests/fixtures/secondary-parity-manifest.json`
   - `tests/parity/artifacts/baseline-report.json`
4. No live-provider secrets are required; this UAT validates deterministic inventory/reporting behavior only.

## Test Case 1 — Inspect the tracked secondary-surface inventory artifact

1. Run `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/secondary-surface-inventory-contract.test.ts`.
2. Expected outcome: the test passes and confirms the JSON artifact matches the TypeScript source contract.
3. Open `tests/parity/artifacts/secondary-surface-inventory.json`.
4. Expected outcome: the artifact lists exactly four surfaces: `web-mode`, `mcp`, `workflow-bmad`, and `worktree-session-recovery`.
5. Expected outcome: every surface status is `partial`, each row includes `alreadyCoveredBy`, `uncoveredAreas`, and `plannedProofLanes`, and the summary reports 12 drift findings with severity counts.

## Test Case 2 — Confirm rebrand drift is explicit rather than hidden

1. Run `rg -n "gsd-pi|Usage: gsd|\[gsd\]" src tests package.json`.
2. Expected outcome: the command returns matches in runtime diagnostics, packaging, and test/fixture code.
3. Compare a few representative matches to `tests/parity/artifacts/secondary-surface-inventory.json`.
4. Expected outcome: the artifact includes corresponding drift findings for CLI/runtime prefixes, worktree usage text, MCP/web startup output, and packaging/test-fixture drift.
5. Expected outcome: the presence of these matches is treated as documented drift for downstream slices, not as a hidden assumption or silent pass.

## Test Case 3 — Validate the secondary parity manifest contract

1. Run `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/secondary-parity-manifest.test.ts`.
2. Expected outcome: the test passes and proves the manifest artifact matches the lane-definition source.
3. Open `tests/fixtures/secondary-parity-manifest.json`.
4. Expected outcome: the manifest summary reports 4 surfaces, 13 total lanes, 8 required lanes, 5 optional lanes, 8 present fixtures, and 4 planned fixtures.
5. Expected outcome: each surface includes required existing deterministic proof plus at least one missing planned proof/report lane, keeping the surface truthfully `partial`.

## Test Case 4 — Verify canonical baseline report wiring publishes secondary parity data

1. Run `node --experimental-strip-types tests/parity/run.ts --format json`.
2. Expected outcome: the command exits successfully and prints a machine-readable baseline report.
3. Inspect `tests/parity/artifacts/baseline-report.json`.
4. Expected outcome: the report contains a top-level `secondaryParity` payload with inventory metadata, manifest metadata, per-surface rows, uncovered surface rows, and drift findings.
5. Expected outcome: each secondary surface row points back to a stable report path under `tests/parity/artifacts/baseline-report.json#secondaryParity...`.
6. Expected outcome: the overall baseline verdict may remain `partial`; that is acceptable and truthful because secondary-surface closure is planned work, not yet complete proof.

## Test Case 5 — Confirm operator-facing diagnostics can read the canonical report

1. Run `node --experimental-strip-types tests/parity/diagnostics.ts --report tests/parity/artifacts/baseline-report.json`.
2. Expected outcome: the diagnostics renderer exits successfully and prints a human-readable parity summary.
3. Expected outcome: the output includes the baseline verdict, lane totals, repo-installed comparison, and actionable lane summaries.
4. Expected outcome: downstream operators can use the canonical baseline report without rerunning discovery logic to understand current proof versus uncovered secondary surfaces.

## Edge Cases

### Edge Case A — Partial is the correct truthful state

1. Inspect the secondary inventory, manifest, and baseline report outputs together.
2. Expected outcome: none of the four secondary surfaces are shown as `covered` yet.
3. Expected outcome: the data makes missing release-readable proof lanes and planned fixtures explicit instead of over-claiming parity from scattered tests.

### Edge Case B — Existing lower-level tests do not auto-close a surface

1. Inspect the `mcp` and `workflow-bmad` rows in `tests/fixtures/secondary-parity-manifest.json`.
2. Expected outcome: even though existing deterministic unit/integration proof exists, the rows still show missing release-readable proof/report lanes.
3. Expected outcome: downstream slices must add the planned parity lanes/artifacts before the matrix can truthfully move from `partial` to `covered`.

### Edge Case C — Canonical baseline remains usable even when not fully green

1. Run the full deterministic verification stack for this slice.
2. Expected outcome: all slice contract tests pass even if the baseline verdict remains `partial`.
3. Expected outcome: this proves the reporting contract is stable and actionable before downstream parity-closure work lands.


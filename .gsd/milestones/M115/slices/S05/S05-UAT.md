# S05: Integrated secondary-surface release gate — UAT

**Milestone:** M115
**Written:** 2026-04-24T11:25:40.633Z

# S05 UAT — Integrated secondary-surface release gate

## Preconditions

1. Work from the repo root `/home/cid/projects-personal/umb`.
2. Node dependencies for the repo are installed.
3. No provider secrets are required for the default run; live/provider coverage is expected to remain explicit and non-blocking when not enabled.
4. Existing tracked artifacts from earlier slices are present, especially:
   - `tests/parity/artifacts/baseline-report.json`
   - `tests/parity/artifacts/mcp-parity.json`
   - `tests/parity/artifacts/workflow-parity.json`

## Test Case 1 — Run the integrated secondary release gate

1. Run:
   `node --experimental-strip-types tests/parity/secondary-release-gate.ts --format text`
2. Confirm the command exits 0.
3. Confirm the output reports `Secondary parity release gate: verdict=passed`.
4. Confirm the required lane names listed are exactly:
   - `web-mode`
   - `mcp`
   - `workflow-bmad`
   - `worktree-session-recovery`
   - `rebrand-drift`
5. Confirm the output includes stable artifact pointers for:
   - `tests/parity/artifacts/baseline-report.json`
   - `tests/parity/artifacts/secondary-release-report.json`
   - `tests/parity/artifacts/mcp-parity.json`
   - `tests/parity/artifacts/workflow-parity.json`
   - `tests/fixtures/worktree-session-parity-manifest.json`

**Expected outcome:** The integrated gate passes, names the required secondary surfaces, and gives direct artifact paths for debugging.

## Test Case 2 — Inspect the integrated machine-readable artifact

1. Open `tests/parity/artifacts/secondary-release-report.json`.
2. Confirm the top-level verdict is passing for required lanes.
3. Confirm each required lane includes release-readable diagnostics and artifact paths.
4. Confirm failed surfaces/phases fields are present even when empty (`none`/empty equivalents rather than omitted).
5. Confirm optional lanes are still present for planned-proof coverage and live/provider behavior.

**Expected outcome:** The JSON artifact is suitable for release consumption and does not hide optional or future-proofing gaps.

## Test Case 3 — Verify the human-readable diagnostics path

1. Run:
   `node --experimental-strip-types tests/parity/diagnostics.ts --surface secondary --report tests/parity/artifacts/secondary-release-report.json`
2. Confirm the command exits 0.
3. Confirm the rendered diagnostics clearly separate:
   - required lanes
   - optional/planned lanes
   - live/provider status
4. Confirm the output preserves artifact references and any failed surface/phase fields.

**Expected outcome:** An operator can understand what is proven now, what is optional, and where to inspect artifacts when something breaks.

## Test Case 4 — Verify worktree/session and rebrand contracts remain locked

1. Run:
   `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/worktree-session-parity-contract.test.ts src/tests/integration/rebrand-surface-contract.test.ts`
2. Confirm all tests pass.
3. Review the assertions summary to verify:
   - branchless worktree/session/recovery exports remain pinned
   - operator help remains branded as `umb`
   - remaining old-brand strings are treated as tracked expected drift, not silent regressions

**Expected outcome:** The integrated gate’s worktree/session and rebrand lanes are backed by deterministic contracts, not ad hoc assumptions.

## Test Case 5 — Verify the integrated gate contract

1. Run:
   `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/secondary-release-gate-contract.test.ts`
2. Confirm all tests pass.
3. Confirm the contract proves:
   - required composed lanes drive failure behavior
   - artifact paths are preserved
   - failed surfaces and failed phases are preserved
   - the CLI exits non-zero when a required lane is red

**Expected outcome:** The release gate semantics are locked and regressions in verdict logic are caught automatically.

## Test Case 6 — Verify the secondary diagnostics/UAT contract

1. Run:
   `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/secondary-parity-diagnostics-contract.test.ts`
2. Confirm all tests pass.
3. Open `tests/parity/human-uat-secondary.md`.
4. Confirm the guide references tracked commands and artifact paths rather than placeholder instructions.

**Expected outcome:** The human-facing reporting path stays aligned with the real integrated release artifact.

## Edge Cases

### Edge Case A — Optional live/provider coverage is unavailable

1. Run the integrated gate without enabling live coverage.
2. Confirm the gate still passes if required deterministic lanes pass.
3. Confirm `optionalLive` is shown as skipped/non-blocking with an explicit reason such as `not-enabled`.

**Expected outcome:** Missing provider configuration does not falsely fail the release gate, but it is still visible.

### Edge Case B — Baseline context remains imperfect

1. Inspect the integrated text output.
2. Confirm it still reports the baseline context truthfully (for example, baseline summary may remain failing/partial because non-required lanes are red or skipped).
3. Confirm the integrated secondary verdict is still driven only by the required secondary surfaces.

**Expected outcome:** The release-facing secondary gate stays truthful without being coupled to unrelated non-required baseline noise.

### Edge Case C — A required lane breaks in the future

1. Use the integration contract fixtures or a future regression to force one required lane red.
2. Re-run:
   `node --experimental-strip-types tests/parity/secondary-release-gate.ts --format text`
3. Confirm the CLI exits non-zero and the output includes the failed surface, failed phase, and relevant artifact path.

**Expected outcome:** Red results are actionable rather than ambiguous.


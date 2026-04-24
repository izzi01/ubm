# S04: S04 — UAT

**Milestone:** M115
**Written:** 2026-04-24T11:04:31.520Z

# S04 UAT — Workflow/BMAD parity proof

## Preconditions

1. Work from the repo root.
2. Ensure dependencies are installed for the existing test/parity harness.
3. No live provider keys are required; this UAT is deterministic and local.

## Test Case 1 — Workflow parity fixture contract stays truthful

1. Run:
   `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/workflow-parity-fixture-contract.test.ts`
2. Confirm the test suite passes.
3. Expected outcome:
   - The manifest at `tests/fixtures/workflow-parity-manifest.json` is accepted as the source of truth.
   - The representative path is `gsd-planning-to-execution`.
   - The contract expects milestone planning, slice planning, and task completion phases.
   - The contract expects the current emitted slice-plan marker `**Goal:**` and the current persisted `task.verification_result` value that stores the verification command string.

## Test Case 2 — Canonical parity report exposes workflow parity as a dedicated surface

1. Run:
   `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/workflow-parity-contract.test.ts`
2. Expected outcome:
   - The test passes.
   - The baseline parity contract confirms a dedicated `workflowParity` block exists.
   - The block points at `tests/parity/artifacts/workflow-parity.json` and `tests/fixtures/recordings/workflow-parity.json`.
   - The workflow surface is release-readable without needing to reinterpret ad hoc task logs.

## Test Case 3 — Operator-facing workflow diagnostics are actionable

1. Run:
   `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/workflow-parity-diagnostics-contract.test.ts`
2. Expected outcome:
   - The test passes.
   - Diagnostics explicitly name three failure classes: missing artifact, invalid transition, and missing verification evidence.
   - The renderer promises artifact path + phase, entity/field/expected/observed transition details, and task/evidence attribution rather than generic failure text.

## Test Case 4 — End-to-end parity run records a passing workflow lane

1. Run:
   `node --experimental-strip-types tests/parity/run.ts --format json`
2. Inspect the emitted JSON or the generated file `tests/parity/artifacts/baseline-report.json`.
3. Expected outcome:
   - A top-level `workflowParity` block is present.
   - `workflowParity.releaseReadableStatus` is `covered`.
   - `workflowParity.parityStatus` is `passed`.
   - `workflowParity.parityArtifactPath` is `tests/parity/artifacts/workflow-parity.json`.
   - `workflowParity.recordingPath` is `tests/fixtures/recordings/workflow-parity.json`.
   - `workflowParity.diagnostics.failureDiagnostics` is empty.

## Test Case 5 — Inspect the workflow artifact for concrete proof details

1. Open `tests/parity/artifacts/workflow-parity.json`.
2. Confirm it includes:
   - `artifactChecks` entries for roadmap, slice-plan, task-plan, and task-summary.
   - `stateTransitions` entries covering milestone.status, slice.status, task.status, and task.verification_result.
   - `verificationEvidence.rowCount` greater than or equal to 1.
3. Expected outcome:
   - The artifact shows a concrete representative planning-to-execution run rather than a placeholder status row.
   - Each artifact/state assertion reports `passed`.

## Edge Case Checks

### Edge Case A — Resolver-backed workflow execution remains hidden behind the normal runner

1. Re-run:
   `node --experimental-strip-types tests/parity/run.ts --format json`
2. Expected outcome:
   - The command succeeds without requiring manual `resolve-ts` wrapping at the top-level parity runner.
   - This confirms the resolver-backed worker isolation is functioning.

### Edge Case B — Failure diagnostics remain operator-readable if the workflow lane regresses

1. If a future regression is introduced, re-run the diagnostics renderer/tests instead of inspecting raw task logs first.
2. Expected outcome:
   - The first readable failure should identify the missing artifact path, the mismatched transition, or the missing verification evidence row directly.
   - Operators should not need to reconstruct the planning-to-execution contract manually from source files.


# S04: Workflow/BMAD parity proof

**Goal:** Exercise one representative BMAD/workflow/planning-to-execution path end to end so parity covers how people structure and run work, not just how they edit code.
**Demo:** After this: umb can prove a representative planning-to-execution workflow with the expected artifacts and state transitions, supporting a stronger parity claim than the core coding-loop fixture alone.

## Must-Haves

- A scoped workflow parity path produces the expected milestone/slice/task artifacts or equivalent workflow outputs, and contract/integration checks verify the state transitions and operator-visible outcomes.

## Proof Level

- This slice proves: Deterministic workflow artifact contract plus integration verification of the expected transitions and outputs.

## Integration Closure

Workflow parity evidence can be summarized in the milestone report without reinterpreting ad hoc task logs.

## Verification

- Adds machine-readable workflow parity evidence for expected artifacts, transitions, and failure points.

## Tasks

- [x] **T01: Define representative workflow parity fixture and artifact contract** `est:1 day`
  Select a representative workflow/BMAD path that matters for parity and define a deterministic fixture/replay boundary for it. The chosen path should cover structured planning/execution behavior and produce observable artifacts or state transitions that can be validated without relying on ambient human input. Publish the expected artifact/state contract so later tasks can implement proof cleanly.
  - Files: `tests/fixtures/workflow-parity-manifest.json`, `src/resources/extensions/umb/bmad-pipeline/`, `src/tests/integration/workflow-parity-fixture-contract.test.ts`
  - Verify: node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/workflow-parity-fixture-contract.test.ts

- [x] **T02: Implement workflow parity lane and recorded evidence** `est:1-1.5 days`
  Implement the representative workflow parity proof. Exercise the scoped planning-to-execution path, capture the produced artifacts and state transitions, and serialize a machine-readable artifact/report that can be consumed by the final parity gate. The proof should clearly show what was planned, what transitioned, and where the operator-facing outputs live when something breaks.
  - Files: `tests/parity/secondary-lanes.ts`, `tests/parity/run.ts`, `tests/parity/diagnostics.ts`, `tests/fixtures/recordings/workflow-parity.json`, `src/tests/integration/workflow-parity-contract.test.ts`, `src/resources/extensions/umb/bmad-pipeline/`, `src/resources/extensions/gsd/`
  - Verify: node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/workflow-parity-contract.test.ts && node --experimental-strip-types tests/parity/run.ts --format json

- [ ] **T03: Lock workflow diagnostic contract** `est:0.5 day`
  Add contract coverage for operator-facing workflow diagnostics so failures name the missing artifact, invalid transition, or mismatched expected output directly. Ensure the parity report and diagnostics renderer can summarize workflow proof status without forcing humans to inspect raw task logs.
  - Files: `tests/parity/diagnostics.ts`, `src/tests/integration/workflow-parity-diagnostics-contract.test.ts`, `tests/parity/artifacts/workflow-parity.json`
  - Verify: node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/workflow-parity-diagnostics-contract.test.ts

## Files Likely Touched

- tests/fixtures/workflow-parity-manifest.json
- src/resources/extensions/umb/bmad-pipeline/
- src/tests/integration/workflow-parity-fixture-contract.test.ts
- tests/parity/secondary-lanes.ts
- tests/parity/run.ts
- tests/parity/diagnostics.ts
- tests/fixtures/recordings/workflow-parity.json
- src/tests/integration/workflow-parity-contract.test.ts
- src/resources/extensions/gsd/
- src/tests/integration/workflow-parity-diagnostics-contract.test.ts
- tests/parity/artifacts/workflow-parity.json

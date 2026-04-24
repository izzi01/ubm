---
id: T01
parent: S04
milestone: M115
key_files:
  - tests/fixtures/workflow-parity-manifest.json
  - src/tests/integration/workflow-parity-fixture-contract.test.ts
  - tests/parity/secondary-lanes.ts
key_decisions:
  - Scoped workflow/BMAD parity to a deterministic GSD planning-to-execution loop instead of claiming coverage for every workflow template or BMAD pipeline.
  - Required the workflow parity contract to prove both rendered artifacts and persisted state transitions, with explicit diagnostics for missing artifacts, invalid transitions, and absent verification evidence.
duration: 
verification_result: passed
completed_at: 2026-04-24T10:41:51.992Z
blocker_discovered: false
---

# T01: Defined the workflow parity fixture contract for a representative planning-to-execution loop and locked it with an integration test.

**Defined the workflow parity fixture contract for a representative planning-to-execution loop and locked it with an integration test.**

## What Happened

I aligned this task with the repository’s existing parity-manifest pattern instead of inventing a separate workflow harness. After inspecting the current parity manifests, secondary-surface inventory, workflow/BMAD code, and GSD planning/completion tests, I selected a scoped representative path: the deterministic GSD planning-to-execution loop that runs through milestone planning, slice planning, and task completion. I added `tests/fixtures/workflow-parity-manifest.json` to publish the artifact and state-transition contract for that path, including required phases, expected artifacts, persisted transition assertions, and failure-diagnostic expectations. I also updated `tests/parity/secondary-lanes.ts` so the existing workflow parity reservation points at this task’s real manifest path instead of the older placeholder filename. Then I added `src/tests/integration/workflow-parity-fixture-contract.test.ts`, which locks the manifest contents, phase/tool sequence, artifact/state requirements, observability expectations, and the secondary-parity reservation alignment. The chosen scope is intentionally narrow and truthful: it proves workflow/BMAD parity through structured planning and execution state transitions rather than over-claiming full BMAD pipeline coverage in this slice.

## Verification

Ran the task verification command from the plan: `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/workflow-parity-fixture-contract.test.ts`. All 4 contract tests passed. The assertions verified the representative path selection, the expected `gsd_plan_milestone -> gsd_plan_slice -> gsd_complete_task` phase sequence, the required artifact/state contracts and failure diagnostics, and the alignment between the new fixture manifest and the workflow reservation in `tests/parity/secondary-lanes.ts`.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/workflow-parity-fixture-contract.test.ts` | 0 | ✅ pass | 106ms |

## Deviations

Minor local correction: the existing secondary workflow reservation still referenced `tests/fixtures/secondary-workflow-bmad-manifest.json`, so I updated it to the task’s authoritative output path `tests/fixtures/workflow-parity-manifest.json` to keep downstream work on a single contract path.

## Known Issues

None.

## Files Created/Modified

- `tests/fixtures/workflow-parity-manifest.json`
- `src/tests/integration/workflow-parity-fixture-contract.test.ts`
- `tests/parity/secondary-lanes.ts`

# M100: Integration Test Milestone

**Vision:** Build and verify the integration-test core needed to drive the workflow engine and render milestone artifacts correctly, so dispatch behavior and file projections can be exercised end-to-end instead of only asserted piecemeal.

## Success Criteria

- The core engine dispatch path works through its real integration surface and the milestone's integration tests pass.
- Planning and summary files render correctly from engine state without structural corruption or boundary mismatches.

## Slices

- [ ] **S01: Core Engine** `risk:high` `depends:[]`
  > After this: After this: the workflow core can dispatch through its real integration-test surface and the engine integration tests pass.

- [ ] **S02: Rendering System** `risk:medium` `depends:[S01]`
  > After this: After this: planning and summary files render correctly from engine state and the rendered artifact checks pass.

## Boundary Map

## Boundary Map

### S01 → S02
Produces:
- workflow dispatch contract exercised through the real integration-test engine path
- core engine state transitions that rendering can consume
- integration-test harness coverage for dispatch behavior

Consumes:
- nothing (first slice)

### S02 → milestone-complete
Produces:
- rendered planning artifact output from engine state
- rendered summary artifact output from engine state
- end-to-end engine→renderer proof that files are correctly structured

Consumes from S01:
- dispatchable workflow engine path
- engine state and integration-test fixtures proven by the core-engine slice

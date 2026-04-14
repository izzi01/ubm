---
estimated_steps: 5
estimated_files: 3
skills_used:
  - tdd-guard
---

# T03: Wire state machine into extension and write integration tests

**Slice:** S02 — GSD State Machine + Approval Gates
**Milestone:** M001

## Description

Wire the state machine and gate system into the extension entry point, making them available for use by S03's command/tool registration. Write integration tests that prove the full lifecycle: create milestone → create slices → create tasks → advance through plan→execute→verify→complete with approval gates firing at configured boundaries.

This task also creates the barrel export from `src/state-machine/index.ts` and updates the extension's `index.ts` to instantiate the state machine when the extension loads.

## Failure Modes

| Dependency | On error | On timeout | On malformed response |
|------------|----------|-----------|----------------------|
| GsdStateMachine | Propagate to extension init error | N/A (sync) | N/A (typed) |
| GsdGateManager | Propagate to extension init error | N/A (sync) | N/A (typed) |

## Steps

1. Create `src/state-machine/index.ts` — Barrel export for the state-machine module:
   - Re-export `GsdStateMachine` from state-machine.ts
   - Re-export `GsdGateManager` from gates.ts
   - Re-export all types from types.ts
   - Export a factory function `createGsdEngine(dbPath: string)` that creates GsdDb + GsdStateMachine + GsdGateManager wired together

2. Update `src/extension/index.ts` — Wire the state machine into the extension:
   - Import `createGsdEngine` from state-machine
   - In the registerExtension function, instantiate the GSD engine with a DB path (use `.gsd/gsd.db` or configurable path)
   - Store the engine instance on the extension's context for S03 to use
   - Do NOT register any commands/tools yet — that's S03's job
   - The extension should load without errors and have the engine available

3. Create `tests/state-machine/integration.test.ts` — Integration tests proving the full cycle:
   - Create a milestone with 2 slices, each with 2 tasks
   - Configure one slice as high-risk with approval gates
   - Drive the state machine through all phases:
     a. Plan phase: create all entities (already done by test setup)
     b. Execute phase: advance tasks to active, then to complete
     c. Verify phase: advance slices to complete (gates fire on high-risk slice)
     d. Approve the gate-blocked slice
     e. Complete phase: advance milestone to complete
   - Assert the final state of all entities matches expectations
   - Test that getPhase() correctly reports each phase throughout

## Must-Haves

- [ ] Barrel export from src/state-machine/index.ts provides all public API
- [ ] createGsdEngine factory wires GsdDb + GsdStateMachine + GsdGateManager
- [ ] Extension index.ts instantiates the engine on load
- [ ] Integration test proves full plan→execute→verify→complete cycle
- [ ] Integration test proves approval gates block and resume correctly
- [ ] All tests pass: `npm run test:run`

## Verification

- `npm run test:run -- tests/state-machine/integration.test.ts` — integration test passes
- `npm run test:run` — all project tests pass (db + state-machine + patterns)
- `npx tsc --noEmit` — zero type errors in src/

## Inputs

- `src/state-machine/types.ts` — Types from T01
- `src/state-machine/state-machine.ts` — GsdStateMachine from T01
- `src/state-machine/gates.ts` — GsdGateManager from T02
- `src/extension/index.ts` — Current empty extension entry point
- `src/db/gsd-db.ts` — GsdDb class
- `src/db/types.ts` — Entity types

## Expected Output

- `src/state-machine/index.ts` — Barrel exports + createGsdEngine factory
- `src/extension/index.ts` — Updated with engine instantiation
- `tests/state-machine/integration.test.ts` — Full lifecycle integration test

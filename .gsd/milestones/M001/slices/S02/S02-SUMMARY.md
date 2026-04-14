---
id: S02
parent: M001
milestone: M001
provides:
  - ["GsdStateMachine class for lifecycle management", "GsdGateManager for approval gate enforcement", "GsdEngine factory (createGsdEngine) wiring all state machine components", "Barrel export from src/state-machine/index.ts", "Phase detection (plan/execute/verify/complete) across entity hierarchy"]
requires:
  []
affects:
  - ["S03 — will register GSD tools and commands against the engine instance via getGsdEngine()"]
key_files:
  - ["src/state-machine/types.ts", "src/state-machine/state-machine.ts", "src/state-machine/gates.ts", "src/state-machine/index.ts", "src/extension/index.ts", "tests/state-machine/state-machine.test.ts", "tests/state-machine/gates.test.ts", "tests/state-machine/integration.test.ts"]
key_decisions:
  - ["Linear transitions (pick first valid next state) for deterministic API", "Gate configs in runtime Map, not DB schema — avoids migrations", "Engine factory pattern with module-scoped singleton accessor", "Phase detection is top-down hierarchical (milestone → slices → tasks)", "Milestones not directly gated — transitions depend on slice-level gates"]
patterns_established:
  - ["Decorator pattern for cross-cutting concerns (GsdGateManager wraps GsdStateMachine)", "Factory function for engine assembly (createGsdEngine)", "Runtime config registry (Map) for ephemeral policy settings", "Linear state transition model with exported TRANSITIONS maps for downstream consumers"]
observability_surfaces:
  - none
drill_down_paths:
  - [".gsd/milestones/M001/slices/S02/tasks/T01-SUMMARY.md", ".gsd/milestones/M001/slices/S02/tasks/T02-SUMMARY.md", ".gsd/milestones/M001/slices/S02/tasks/T03-SUMMARY.md"]
duration: ""
verification_result: passed
completed_at: 2026-04-07T21:54:02.777Z
blocker_discovered: false
---

# S02: GSD State Machine + Approval Gates

**State machine driving milestone→slice→task lifecycle through plan→execute→verify→complete phases, with configurable approval gates that block transitions at policy-defined boundaries**

## What Happened

Built the GSD state machine across three tasks (T01–T03):

**T01** implemented the core state machine engine in three files: types.ts (phase types, transition maps, GsdStateMachineError), state-machine.ts (GsdStateMachine class with advance/canAdvance/getStatus/getPhase/getNextStatus), and 49 unit tests. Transitions are linear (pick first valid next state) for deterministic behavior. Slice completion requires all tasks complete; milestone completion accepts complete or skipped slices. Phase detection examines the full entity hierarchy top-down.

**T02** built the approval gate system as a decorator over the state machine. GsdGateManager wraps advance() with gate-checking logic. Gates are configured per-slice with policies: 'always' (block), 'high-risk-only' (block only for high-risk slices), 'never' (pass through). Gate configs live in a runtime Map (no DB schema changes). Task gates inherit from parent slice config. 32 unit tests cover all policies, approve/resume flow, idempotent double-approval, cross-slice isolation, and malformed config handling.

**T03** wired everything together: barrel export (src/state-machine/index.ts), factory function createGsdEngine() that assembles GsdDb + GsdStateMachine + GsdGateManager into one GsdEngine object, and module-scoped singleton accessor in src/extension/index.ts. 5 integration tests prove the full plan→execute→verify→complete lifecycle with approval gates firing and resolving at the right boundaries.

All 86 state-machine tests pass (49 + 32 + 5). Zero type errors in new files.

## Verification

npm run test:run -- tests/state-machine/ — 86/86 tests pass (3 files, 207ms). TypeScript: npx tsc --noEmit shows zero type errors in src/state-machine/ and tests/state-machine/. Pre-existing failures in background-manager (5) and agent-babysitter (1) are unrelated.

## Requirements Advanced

None.

## Requirements Validated

None.

## New Requirements Surfaced

None.

## Requirements Invalidated or Re-scoped

None.

## Deviations

None.

## Known Limitations

None.

## Follow-ups

None.

## Files Created/Modified

- `src/state-machine/types.ts` — Phase types, transition maps, GsdStateMachineError class
- `src/state-machine/state-machine.ts` — Core state machine with advance/canAdvance/getStatus/getPhase
- `src/state-machine/gates.ts` — Approval gate manager with per-slice policies
- `src/state-machine/index.ts` — Barrel export and createGsdEngine factory
- `src/extension/index.ts` — Wired engine instantiation with getGsdEngine() accessor
- `tests/state-machine/state-machine.test.ts` — 49 unit tests for core state machine
- `tests/state-machine/gates.test.ts` — 32 unit tests for approval gates
- `tests/state-machine/integration.test.ts` — 5 integration tests for full lifecycle

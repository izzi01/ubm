---
estimated_steps: 7
estimated_files: 4
skills_used:
  - tdd-guard
---

# T01: Build the GSD state machine engine

**Slice:** S02 — GSD State Machine + Approval Gates
**Milestone:** M001

## Description

Implement the state machine that manages lifecycle transitions for milestones, slices, and tasks. The machine enforces valid state transitions (e.g. task can't go from pending→complete without being active first), tracks the current phase of execution (plan→execute→verify→complete), and persists all transitions to the database via GsdDb.

The state machine is the core runtime engine for GSD auto-mode. It knows:
- What state each unit (milestone/slice/task) is in
- What transitions are valid from each state
- What phase the overall execution is in (plan, execute, verify, complete)
- How to advance the next actionable unit through its lifecycle

## Failure Modes

| Dependency | On error | On timeout | On malformed response |
|------------|----------|-----------|----------------------|
| GsdDb connection | Throw GsdStateMachineError with DB context | N/A (sync) | N/A (typed) |
| Missing entity | Return undefined from advance(), caller decides | N/A | N/A |

## Steps

1. Create `src/state-machine/types.ts` — Define `StateMachinePhase` type ('plan' | 'execute' | 'verify' | 'complete'), `TransitionResult` interface (success/failure + before/after state), `StateMachineConfig` (optional custom transition rules), and `GsdStateMachineError` class. Define the valid transition maps for each entity type as const objects (e.g. `MILESTONE_TRANSITIONS: Record<MilestoneStatus, MilestoneStatus[]>`).

2. Create `src/state-machine/state-machine.ts` — Implement the `GsdStateMachine` class:
   - Constructor takes a `GsdDb` instance
   - `getStatus(entityType, id)` — returns current status of any unit
   - `getPhase(milestoneId)` — determines current execution phase by examining milestone status and its slices/tasks
   - `advance(entityType, id)` — drives a unit to its next valid state. For tasks: pending→active→complete. For slices: pending→active→complete (only when all tasks are complete). For milestones: active→completed (only when all slices are complete).
   - `canAdvance(entityType, id)` — returns true if the unit can move to its next state
   - All transitions are persisted to DB via `GsdDb` update methods
   - Invalid transitions throw `GsdStateMachineError` with clear message

3. Create `tests/state-machine/state-machine.test.ts` — Unit tests covering:
   - Valid transitions for each entity type (milestone, slice, task)
   - Invalid transitions are rejected with error
   - Slice cannot complete until all its tasks are complete
   - Milestone cannot complete until all its slices are complete
   - `getPhase()` returns correct phase based on entity states
   - `canAdvance()` correctly predicts advanceability
   - Idempotent transitions (advancing an already-complete unit is a no-op or error)

## Must-Haves

- [ ] State machine enforces all valid transition rules for milestones, slices, and tasks
- [ ] Slice completion requires all tasks to be complete
- [ ] Milestone completion requires all slices to be complete
- [ ] Invalid transitions throw descriptive errors
- [ ] All transitions persisted to DB immediately (synchronous)
- [ ] 20+ unit tests covering transition rules and edge cases

## Verification

- `npm run test:run -- tests/state-machine/state-machine.test.ts` — all tests pass
- `npx tsc --noEmit` — zero type errors in src/state-machine/

## Inputs

- `src/db/gsd-db.ts` — GsdDb class for persisting state transitions
- `src/db/types.ts` — Entity row types and status enums
- `src/db/schema.ts` — Schema reference for status CHECK constraints

## Expected Output

- `src/state-machine/types.ts` — Phase type, transition maps, TransitionResult, error class
- `src/state-machine/state-machine.ts` — GsdStateMachine class with advance/canAdvance/getStatus/getPhase
- `tests/state-machine/state-machine.test.ts` — 20+ unit tests for state machine transitions

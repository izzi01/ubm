---
estimated_steps: 6
estimated_files: 3
skills_used:
  - tdd-guard
---

# T02: Build the approval gate system

**Slice:** S02 — GSD State Machine + Approval Gates
**Milestone:** M001

## Description

Implement configurable approval gates that intercept state transitions and pause execution when human approval is required. Gates are defined per-slice and specify which transitions require approval (e.g. slice→complete always requires approval, task→execute requires approval for high-risk slices).

The gate system wraps the state machine's `advance()` method. When a gate fires, the transition is blocked and the unit enters an 'awaiting-approval' state. An `approve()` method explicitly resumes the blocked transition.

Gates are stored as metadata in the slice's existing fields — no new DB table needed. The `GateConfig` type defines rules like: `{ sliceComplete: 'always', taskStart: 'high-risk-only' }`.

## Failure Modes

| Dependency | On error | On timeout | On malformed response |
|------------|----------|-----------|----------------------|
| GsdStateMachine | Throw GateError wrapping state machine error | N/A (sync) | N/A (typed) |
| GateConfig parsing | Skip gate (log warning), allow transition | N/A | Invalid rules ignored |

## Load Profile

- **Shared resources**: GsdDb (synchronous, single-threaded)
- **Per-operation cost**: 1-2 DB reads for gate check, 1 DB write for approval
- **10x breakpoint**: N/A — synchronous local DB, no contention

## Negative Tests

- **Malformed inputs**: GateConfig with unknown transition names, invalid risk levels, empty rules
- **Error paths**: Approving a unit not awaiting approval, double-approval
- **Boundary conditions**: Gate on already-complete unit, gate on milestone with no slices

## Steps

1. Create `src/state-machine/gates.ts` — Implement the approval gate system:
   - Define `GateConfig` interface: maps transition types to gate policies ('always', 'high-risk-only', 'never')
   - Define `GatePolicy` type: 'always' | 'high-risk-only' | 'never'
   - Define `GateResult` interface: { blocked: boolean, reason?: string, gateType: string }
   - Implement `GsdGateManager` class:
     - Constructor takes `GsdDb` and `GsdStateMachine` instances
     - `checkGate(entityType, id, transition)` — evaluates whether a transition requires approval based on slice's GateConfig and risk level
     - `advanceWithGate(entityType, id)` — calls state machine's canAdvance, then checks gates, then either advances or blocks
     - `approve(entityType, id)` — resumes a blocked transition by calling advance
     - `isAwaitingApproval(entityType, id)` — checks if a unit is gate-blocked (stored as a special status flag or separate tracking)

2. Create `tests/state-machine/gates.test.ts` — Unit tests covering:
   - Gate with 'always' policy blocks the transition
   - Gate with 'never' policy allows the transition
   - Gate with 'high-risk-only' blocks only for high-risk slices
   - No gate configured → transition proceeds normally
   - Approving a blocked unit resumes the transition
   - Approving a non-blocked unit is a no-op or error
   - Double-approval is idempotent
   - Gate check for malformed config falls back to allowing transition

## Must-Haves

- [ ] Gates can be configured per-slice with policies: 'always', 'high-risk-only', 'never'
- [ ] 'always' gates always block the configured transition
- [ ] 'high-risk-only' gates only block for high-risk slices
- [ ] Blocked transitions can be resumed via explicit approve()
- [ ] Gate config is stored in slice metadata (no new DB table)
- [ ] 15+ unit tests covering gate behavior and edge cases

## Verification

- `npm run test:run -- tests/state-machine/gates.test.ts` — all tests pass
- `npm run test:run -- tests/state-machine/` — all T01 + T02 tests pass together

## Inputs

- `src/state-machine/types.ts` — Base types from T01
- `src/state-machine/state-machine.ts` — GsdStateMachine class from T01
- `src/db/gsd-db.ts` — GsdDb for reading slice config and persisting state
- `src/db/types.ts` — SliceRow type with risk field

## Expected Output

- `src/state-machine/gates.ts` — GsdGateManager class with checkGate/advanceWithGate/approve
- `tests/state-machine/gates.test.ts` — 15+ unit tests for gate system

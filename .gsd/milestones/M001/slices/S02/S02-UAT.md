# S02: GSD State Machine + Approval Gates — UAT

**Milestone:** M001
**Written:** 2026-04-07T21:54:02.777Z

# S02: GSD State Machine + Approval Gates — UAT

**Milestone:** M001
**Written:** 2026-04-08

## UAT Type

- UAT mode: artifact-driven
- Why this mode is sufficient: The state machine is a pure-logic library with no runtime server or UI. Correctness is fully verified by the 86 automated tests and integration tests that exercise the full lifecycle.

## Preconditions

- Node.js available, `npm install` completed
- No running server needed — tests execute directly via Vitest

## Smoke Test

```bash
npm run test:run -- tests/state-machine/
```
Expected: 3 test files, 86 tests, all passing.

## Test Cases

### 1. Full lifecycle without gates

1. Create milestone, slices, and tasks via GsdDb
2. Call `advance(milestoneId)` repeatedly through plan→execute→verify→complete
3. **Expected:** Each entity transitions through pending→active→complete in order. getPhase() returns correct phase at each stage.

### 2. High-risk slice gate blocks at configured boundary

1. Create milestone with a high-risk slice (risk='high')
2. Configure gate policy 'high-risk-only' on the slice
3. Advance the slice toward completion
4. **Expected:** Transition is blocked with 'awaiting-approval' status. approve(sliceId) resumes. Advance completes successfully.

### 3. Gate policy 'always' blocks unconditionally

1. Create milestone with a low-risk slice
2. Configure gate policy 'always' on the slice
3. Advance the slice
4. **Expected:** Transition blocked regardless of risk level. Approve resumes.

### 4. Gate policy 'never' passes through

1. Create milestone with a high-risk slice
2. Configure gate policy 'never'
3. Advance the slice to completion
4. **Expected:** No blocking occurs. Slice completes without approval.

### 5. Phase detection at each lifecycle stage

1. Create milestone with multiple slices and tasks
2. Advance incrementally and check getPhase() after each step
3. **Expected:** Phase follows top-down hierarchy: "plan" while slices pending, "execute" while tasks active, "verify" while tasks complete, "complete" when all done.

### 6. Double-approval is idempotent

1. Block a transition with a gate
2. Call approve() twice
3. **Expected:** Second approve() is a no-op. No error thrown.

### 7. Factory wiring produces functional engine

1. Call createGsdEngine(dbPath)
2. Verify stateMachine and gateManager properties exist
3. Drive a full lifecycle through the engine
4. **Expected:** Engine object has all required methods. Full lifecycle completes.

## Edge Cases

### Milestone completion accepts skipped slices

1. Create milestone with two slices
2. Complete one slice, skip the other
3. Advance milestone to completion
4. **Expected:** Milestone completes successfully — skipped slices count as terminal.

### Task gate inherits from parent slice config

1. Create a slice with 'always' gate policy
2. Create tasks under that slice
3. Advance a task
4. **Expected:** Task transition is blocked because it inherits the slice's gate policy.

## Failure Signals

- Any test failure in `tests/state-machine/` indicates a regression
- TypeScript errors in `src/state-machine/` indicate type safety regression
- Integration test failure means the wiring between components is broken

## Not Proven By This UAT

- No runtime/server behavior — this is pure logic
- No UI interactions
- No concurrent access patterns (SQLite is synchronous, single-threaded here)
- No persistence across process restarts (DB file cleanup between tests)

## Notes for Tester

- Run the full suite: `npm run test:run -- tests/state-machine/`
- 86 tests should all pass in ~200ms
- Pre-existing failures in background-manager and agent-babysitter are unrelated
- The factory function and barrel export are exercised by integration tests, not separately

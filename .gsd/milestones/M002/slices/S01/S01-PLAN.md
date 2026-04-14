# S01: Dispatch Engine + Auto-mode State

**Goal:** Build the dispatch engine that reads current DB state and determines the next actionable unit and required action, plus auto-mode state management (start/stop/iteration tracking).
**Demo:** After this: dispatcher correctly identifies next unit and action for any milestone state; auto-mode can be started/stopped

## Must-Haves

- dispatch() returns correct {milestoneId, sliceId, taskId, phase, action} for all states: no milestones, milestone with pending slices, active slice with pending tasks, active task, gate-blocked state, all complete. Auto-mode state can start/stop/query. All edge cases tested.

## Proof Level

- This slice proves: test

## Integration Closure

Dispatch engine is a pure function of GsdEngine — no external deps. Auto-mode state is in-memory for v1. Both are independently testable.

## Verification

- Dispatch results include structured context (phase, action, entity IDs) that can be logged or displayed in dashboard

## Tasks

- [x] **T01: Build dispatch engine with state analysis** `est:1.5h`
  Create `src/auto/dispatcher.ts` with the core dispatch function.

1. Define `DispatchResult` type:
   ```ts
   type DispatchAction = 'plan-slice' | 'plan-task' | 'execute-task' | 'verify-slice' | 'verify-milestone' | 'complete-milestone' | 'complete' | 'idle';
   interface DispatchResult {
     milestoneId: string;
     sliceId: string | null;
     taskId: string | null;
     phase: StateMachinePhase;
     action: DispatchAction;
     message: string;
     blocked: boolean;
     blockedReason?: string;
   }
   ```

2. Implement `dispatch(engine: GsdEngine, milestoneId: string): DispatchResult`:
   - Get milestone status
   - Get all slices for milestone
   - Get current phase via engine.stateMachine.getPhase()
   - Find next actionable unit:
     - If no slices → action: 'plan-slice' (need to plan slices)
     - If has pending slice (no active) → action: 'plan-task' (need to activate slice and plan tasks)
     - If has active slice with no active task → find next pending task, action: 'execute-task'
     - If has active slice with active task → action: 'execute-task'
     - If active slice, all tasks complete → action: 'verify-slice'
     - If all slices complete → action: 'verify-milestone'
   - Check gate-blocked state: if any entity is awaiting approval, mark blocked
   - Return structured DispatchResult

3. Export `dispatch` and all types

Files: src/auto/dispatcher.ts, src/auto/types.ts
  - Files: `src/auto/dispatcher.ts`, `src/auto/types.ts`
  - Verify: npm run test:run -- tests/auto/dispatcher.test.ts --reporter=verbose

- [x] **T02: Build auto-mode state manager** `est:1h`
  Create `src/auto/auto-state.ts` with auto-mode lifecycle management.

1. Define types:
   ```ts
   type AutoModeStatus = 'idle' | 'running' | 'paused' | 'stopped';
   interface AutoModeState {
     status: AutoModeStatus;
     milestoneId: string | null;
     currentSliceId: string | null;
     currentTaskId: string | null;
     iteration: number;
     startedAt: string | null;
     lastDispatch: DispatchResult | null;
   }
   ```

2. Implement `AutoModeManager` class:
   - `start(milestoneId: string)`: Set status to 'running', record milestoneId, reset iteration
   - `stop()`: Set status to 'stopped', clear focus
   - `pause()`: Set status to 'paused' (keep focus)
   - `resume()`: Set status back to 'running'
   - `getState(): AutoModeState`: Return current state
   - `updateLastDispatch(result: DispatchResult)`: Record last dispatch for dashboard/tool access
   - `incrementIteration()`: Bump iteration counter
   - All state is in-memory (v1 simplicity)

3. Wire into GsdEngine: Add `autoMode: AutoModeManager` field to the engine factory

Files: src/auto/auto-state.ts, src/state-machine/index.ts (engine factory update)
  - Files: `src/auto/auto-state.ts`, `src/state-machine/index.ts`
  - Verify: npm run test:run -- tests/auto/auto-state.test.ts --reporter=verbose

- [x] **T03: Test dispatch engine and auto-mode state comprehensively** `est:1.5h`
  Write comprehensive tests for dispatch engine and auto-mode state.

1. `tests/auto/dispatcher.test.ts` — Test dispatch() for all state combinations:
   - No slices on milestone → action: plan-slice
   - Pending slice (no active) → action: plan-task
   - Active slice with pending tasks → action: execute-task (first pending task)
   - Active slice with active task → action: execute-task (current active task)
   - Active slice, all tasks complete → action: verify-slice
   - All slices complete → action: verify-milestone
   - Gate-blocked entity → blocked: true with reason
   - Multiple pending slices → picks first pending
   - Skipped slices are treated as complete
   - Empty milestone (no slices, no tasks) → plan-slice

2. `tests/auto/auto-state.test.ts` — Test AutoModeManager:
   - start/stop lifecycle
   - pause/resume
   - getState returns correct state at each phase
   - incrementIteration works
   - updateLastDispatch stores result
   - Double-start is a no-op or resets
   - Stop when idle is a no-op

3. Update engine factory test to verify autoMode field exists

Use existing test helpers from tests/integration/ where applicable.
  - Files: `tests/auto/dispatcher.test.ts`, `tests/auto/auto-state.test.ts`
  - Verify: npm run test:run -- tests/auto/ --reporter=verbose

## Files Likely Touched

- src/auto/dispatcher.ts
- src/auto/types.ts
- src/auto/auto-state.ts
- src/state-machine/index.ts
- tests/auto/dispatcher.test.ts
- tests/auto/auto-state.test.ts

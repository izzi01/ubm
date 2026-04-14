---
estimated_steps: 30
estimated_files: 2
skills_used: []
---

# T01: Build dispatch engine with state analysis

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

## Inputs

- `src/state-machine/state-machine.ts`
- `src/state-machine/gates.ts`
- `src/state-machine/types.ts`
- `src/db/types.ts`

## Expected Output

- `src/auto/dispatcher.ts`
- `src/auto/types.ts`

## Verification

npm run test:run -- tests/auto/dispatcher.test.ts --reporter=verbose

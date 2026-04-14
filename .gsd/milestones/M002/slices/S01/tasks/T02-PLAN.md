---
estimated_steps: 25
estimated_files: 2
skills_used: []
---

# T02: Build auto-mode state manager

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

## Inputs

- `src/auto/dispatcher.ts`
- `src/auto/types.ts`

## Expected Output

- `src/auto/auto-state.ts`
- `src/state-machine/index.ts (updated)`

## Verification

npm run test:run -- tests/auto/auto-state.test.ts --reporter=verbose

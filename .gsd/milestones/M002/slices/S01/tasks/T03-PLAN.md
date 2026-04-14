---
estimated_steps: 22
estimated_files: 2
skills_used: []
---

# T03: Test dispatch engine and auto-mode state comprehensively

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

## Inputs

- `src/auto/dispatcher.ts`
- `src/auto/auto-state.ts`

## Expected Output

- `tests/auto/dispatcher.test.ts`
- `tests/auto/auto-state.test.ts`

## Verification

npm run test:run -- tests/auto/ --reporter=verbose

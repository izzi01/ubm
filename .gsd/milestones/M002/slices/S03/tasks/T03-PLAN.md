---
estimated_steps: 30
estimated_files: 1
skills_used: []
---

# T03: Full integration test for auto-mode lifecycle

Write full integration test proving the auto-mode lifecycle.

Create `tests/integration/auto-mode.test.ts`:

1. Setup: Create engine, plan milestone M100 with 2 slices (S01, S02), each with 2 tasks

2. Test: Full auto-mode cycle
   - Start auto-mode for M100
   - dispatch() → returns S01, T01, execute-task
   - gsd_task_complete(T01) → renders T01-SUMMARY.md, advances to T02
   - dispatch() → returns S01, T02, execute-task
   - gsd_task_complete(T02) → renders T02-SUMMARY.md, all tasks done
   - dispatch() → returns S01, null, verify-slice
   - gsd_slice_complete(S01) → renders S01-SUMMARY.md + UAT.md
   - dispatch() → returns S02, T01, execute-task
   - gsd_task_complete(T01) → renders summary
   - gsd_task_complete(T02) → renders summary
   - gsd_slice_complete(S02) → renders summary + UAT
   - dispatch() → returns M100, null, verify-milestone
   - gsd_milestone_validate(M100, pass) → renders VALIDATION.md
   - gsd_milestone_complete(M100) → renders M100-SUMMARY.md
   - dispatch() → returns M100, null, complete

3. Verify all 9 files rendered:
   - T01-SUMMARY.md, T02-SUMMARY.md (S01), T01-SUMMARY.md, T02-SUMMARY.md (S02)
   - S01-SUMMARY.md, S01-UAT.md
   - S02-SUMMARY.md, S02-UAT.md
   - M100-SUMMARY.md, M100-VALIDATION.md

4. Verify auto-mode state reflects completion

5. Also test error cases:
   - gsd_task_complete on already-complete task
   - gsd_slice_complete with incomplete tasks
   - gsd_milestone_complete with incomplete slices
   - dispatch with gate-blocked state

## Inputs

- `src/tools/gsd-tools.ts`
- `src/auto/dispatcher.ts`
- `src/auto/auto-state.ts`
- `src/auto/renderer.ts`

## Expected Output

- `tests/integration/auto-mode.test.ts`

## Verification

npm run test:run -- tests/integration/auto-mode.test.ts --reporter=verbose

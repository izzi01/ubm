# S01: Dispatch Engine + Auto-mode State — UAT

**Milestone:** M002
**Written:** 2026-04-10T12:03:01.365Z

# S01 UAT: Dispatch Engine + Auto-mode State

## Manual Verification Steps

### 1. Dispatch engine returns correct actions
- Create a milestone with no slices → dispatch returns `plan-slice`
- Add a pending slice → dispatch returns `plan-task`
- Activate slice, add pending tasks → dispatch returns `execute-task` with taskId
- Complete all tasks → dispatch returns `verify-slice`
- Complete all slices → dispatch returns `verify-milestone`

### 2. Auto-mode lifecycle
- Start auto-mode for a milestone → state is `running`
- Pause → state is `paused`, focus preserved
- Resume → state is `running`
- Stop → state is `idle`, focus cleared

### 3. Gate blocking
- Configure gate to block slice completion
- When slice is ready to complete, dispatch returns `blocked: true`

### 4. Edge cases
- Non-existent milestone → dispatch returns `idle`
- Deferred milestone → dispatch returns `idle`
- Skipped slices → treated as complete
- Multiple pending slices → first one picked

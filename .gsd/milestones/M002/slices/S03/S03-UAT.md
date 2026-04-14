# S03: Enhanced Completion Tools + Auto-mode Wiring — UAT

**Milestone:** M002
**Written:** 2026-04-10T12:18:46.941Z

# S03 UAT: Enhanced Completion Tools + Auto-mode Wiring

## Manual Verification Steps

### 1. gsd_task_complete
- Create milestone, slice, task via existing tools
- Activate task
- Call gsd_task_complete with narrative, verification, key files
- Verify T##-SUMMARY.md is written to .gsd/milestones/{MID}/slices/{SID}/tasks/
- Verify file contains YAML frontmatter, narrative, verification sections

### 2. gsd_slice_complete
- Complete all tasks in a slice
- Call gsd_slice_complete with narrative, verification, UAT content
- Verify S##-SUMMARY.md and S##-UAT.md written to slice directory
- Verify error if tasks are incomplete

### 3. gsd_milestone_validate and gsd_milestone_complete
- Complete all slices
- Call gsd_milestone_validate with verdict "pass"
- Verify M##-VALIDATION.md written
- Call gsd_milestone_complete
- Verify M##-SUMMARY.md written
- Verify error if slices are incomplete

### 4. /gsd auto dispatch
- Run /gsd auto on a planned milestone
- Verify output shows Phase, Action, Slice, Task, Blocked
- Verify dispatch returns correct action for current state

### 5. /gsd stop
- Start /gsd auto
- Run /gsd stop
- Verify auto-mode stops

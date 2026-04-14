# S04: Implement /bmad auto-planning (Phase 2 pipeline) — UAT

**Milestone:** M112
**Written:** 2026-04-13T16:45:17.573Z

# UAT: S04 — /bmad auto-planning (Phase 2 pipeline)

## Preconditions
- umb CLI installed and available
- _bmad/ directory with BMAD skill definitions present
- S03 pipeline infrastructure (bmad-pipeline module) operational

## Test Cases

### TC1: PLANNING_PIPELINE structure is valid
1. Run `npx vitest run src/resources/extensions/umb/tests/bmad-pipeline.test.ts`
2. **Expected**: 24/24 tests pass — pipeline has 2 stages, correct phase, valid stage IDs

### TC2: /bmad auto-planning help
1. Invoke `handleBmadAutoPlanning` with empty args
2. **Expected**: Widget shows PLANNING_PIPELINE stages (bmad-create-prd, bmad-create-ux-design)

### TC3: /bmad auto --list includes planning
1. Invoke `handleBmadAutoAnalysis` with `--list` arg
2. **Expected**: Output lists both ANALYSIS_PIPELINE and PLANNING_PIPELINE

### TC4: /bmad auto planning dispatches to handler
1. Invoke `handleBmadAuto` with `planning` as phase
2. **Expected**: Delegates to handleBmadAutoPlanning (not "coming soon" message)

### TC5: /bmad auto-planning --dry-run
1. Invoke `handleBmadAutoPlanning` with `--dry-run` arg
2. **Expected**: Runs pipeline without creating sessions, shows stage progress

### TC6: Full execution creates sessions for both stages
1. Invoke `handleBmadAutoPlanning` with topic and mock sessionFactory
2. **Expected**: sessionFactory called twice (once per stage), context accumulates between stages

### TC7: Command registration
1. Call `registerBmadCommands(pi)` 
2. **Expected**: 'bmad auto-planning' command is registered

### TC8: No regressions on existing tests
1. Run full command test suite
2. **Expected**: All 37 tests pass (30 existing + 7 new)

## Edge Cases
- Missing required stage in pipeline → executor fails gracefully
- Session cancellation during execution → handler reports failure
- /bmad auto with unknown phase → shows available phases

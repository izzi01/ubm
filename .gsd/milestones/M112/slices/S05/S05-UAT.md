# S05: Implement /bmad auto-solutioning (Phase 3 pipeline) — UAT

**Milestone:** M112
**Written:** 2026-04-13T16:49:21.733Z

# UAT: S05 — /bmad auto-solutioning

## Preconditions
- umb CLI installed and available
- BMAD skill definitions present in `_bmad/` directory

## Test Cases

### TC-01: Command registration and help
1. Run `/bmad auto-solutioning` with no arguments
2. **Expected:** Usage help text displayed showing: `/bmad auto-solutioning <message>`, `--list`, and `--dry-run` options

### TC-02: Stage listing (--list)
1. Run `/bmad auto-solutioning --list`
2. **Expected:** Lists 3 stages in order: bmad-create-architecture, bmad-create-epics-and-stories, bmad-check-implementation-readiness

### TC-03: Dry-run validation (--dry-run)
1. Run `/bmad auto-solutioning --dry-run 'Build a REST API'`
2. **Expected:** Validates all 3 stages exist and are resolvable, displays pipeline name "Solutioning Pipeline", shows total 3 stages, does NOT execute any stage

### TC-04: AUTO_PHASES marks solutioning as implemented
1. Run `/bmad auto --list` (or equivalent phases listing)
2. **Expected:** Solutioning phase shows as implemented (not planned)

### TC-05: Dispatch routing
1. Run `/bmad auto solutioning 'Build a REST API'` (with space instead of hyphen)
2. **Expected:** Dispatches to handleBmadAutoSolutioning handler (same behavior as TC-01)

### TC-06: Pipeline lookup
1. Call `getPipeline('solutioning')` programmatically
2. **Expected:** Returns SOLUTIONING_PIPELINE with name, phase '3-solutioning', and 3 stages

### TC-07: Sequential execution
1. Run the solutioning pipeline with a valid project description
2. **Expected:** Stages execute in order (architecture → epics-and-stories → implementation-readiness), context accumulates between stages

### TC-08: Failure on missing stage
1. Attempt to run pipeline with a stage that doesn't exist in the skill registry
2. **Expected:** Pipeline fails with error identifying the missing stage, no subsequent stages execute

## Regression Tests
- All 32 bmad-pipeline tests pass (including 9 new solutioning tests)
- All 44 bmad-commands tests pass (including 7 new solutioning handler tests)
- ANALYSIS_PIPELINE and PLANNING_PIPELINE tests unaffected

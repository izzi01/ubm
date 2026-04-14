# S06: Implement /bmad auto-implementation (Phase 4 pipeline) — UAT

**Milestone:** M112
**Written:** 2026-04-13T16:54:17.092Z

# UAT: S06 — /bmad auto-implementation (Phase 4 pipeline)

## Preconditions
- umb binary available
- BMAD skills installed (_bmad/ directory with Phase 4 skills)
- Phase 3 artifacts exist in _bmad-output/

## Test Cases

### TC-01: Pipeline structure verification
1. Import IMPLEMENTATION_PIPELINE from bmad-pipeline module
2. Verify it has exactly 4 stages
3. Verify stage order: bmad-sprint-planning, bmad-create-story, bmad-dev-story, bmad-code-review
4. Verify all stages have phase '4-implementation'
5. **Expected**: All assertions pass

### TC-02: Pipeline lookup
1. Call getPipeline('4-implementation')
2. **Expected**: Returns IMPLEMENTATION_PIPELINE
3. Call getPipeline('IMPLEMENTATION_PIPELINE')
4. **Expected**: Returns IMPLEMENTATION_PIPELINE (name-based lookup)

### TC-03: Pipeline registration
1. Call listPipelines()
2. **Expected**: Returns array of 4 pipelines including IMPLEMENTATION_PIPELINE

### TC-04: /bmad auto-implementation help
1. Execute `/bmad auto-implementation` with no arguments
2. **Expected**: Shows usage text with --list and --dry-run options

### TC-05: /bmad auto-implementation --list
1. Execute `/bmad auto-implementation --list`
2. **Expected**: Lists all 4 stages with their phases and skill names

### TC-06: /bmad auto-implementation --dry-run
1. Execute `/bmad auto-implementation "Build a REST API" --dry-run`
2. **Expected**: Shows dry-run output with all 4 stages listed, no actual execution

### TC-07: Dispatch routing
1. Execute `/bmad auto implementation "message"`
2. **Expected**: Routes to handleBmadAutoImplementation handler

### TC-08: Zero regressions
1. Run full bmad-pipeline test suite
2. **Expected**: 40 tests pass
3. Run full bmad-commands test suite
4. **Expected**: 52 tests pass

## Edge Cases
- Missing required context (Phase 3 artifacts) should produce clear error
- Cancellation during execution should clean up gracefully
- All 4 phases in AUTO_PHASES should be marked implemented: true

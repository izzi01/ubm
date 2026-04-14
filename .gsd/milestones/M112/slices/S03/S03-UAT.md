# S03: Implement /bmad auto-analysis (Phase 1 pipeline) — UAT

**Milestone:** M112
**Written:** 2026-04-13T16:40:44.164Z

# UAT: S03 — /bmad auto-analysis Pipeline

## Preconditions
- umb binary installed and available
- Working directory contains `_bmad/` with BMAD skill definitions (from S01)
- `_bmad-output/` directory exists or is creatable

## Test Cases

### TC1: /bmad auto-analysis --list shows pipeline stages
1. Run `/bmad auto-analysis --list`
2. **Expected**: Output lists all 6 stages with descriptions:
   - bmad-domain-research (required)
   - bmad-market-research (required)
   - bmad-technical-research (required)
   - bmad-product-brief (required)
   - bmad-prfaq (optional)
   - bmad-document-project (required)

### TC2: /bmad auto-analysis --dry-run previews without execution
1. Run `/bmad auto-analysis --dry-run 'Build a REST API'`
2. **Expected**: All 6 stages shown as "completed" (dry-run mode). No pi sessions created. No artifacts written.

### TC3: /bmad auto-analysis with no args shows usage
1. Run `/bmad auto-analysis`
2. **Expected**: Usage message displayed with available flags (--list, --dry-run) and example syntax.

### TC4: /bmad auto shows available phases
1. Run `/bmad auto`
2. **Expected**: Lists available phases: analysis (implemented), planning/solutioning/implementation (coming soon).

### TC5: /bmad auto with unimplemented phase
1. Run `/bmad auto planning 'Build something'`
2. **Expected**: Message indicating 'planning' phase is coming soon, not yet implemented.

### TC6: Full pipeline execution (integration)
1. Run `/bmad auto-analysis 'Build a REST API for task management'`
2. **Expected**:
   - Progress widget shows per-stage execution
   - Each stage loads its BMAD skill and creates a pi session
   - Context from completed stages is accumulated for subsequent stages
   - If prfaq skill is not loadable, it is skipped gracefully (optional stage)
   - Final summary shows completed/skipped/failed counts
   - Analysis artifacts produced in `_bmad-output/planning-artifacts/`

### TC7: Pipeline handles missing required skill
1. Remove a required skill (e.g., bmad-domain-research) from _bmad/
2. Run `/bmad auto-analysis 'Test'`
3. **Expected**: Pipeline fails at the missing required stage with an error message identifying which skill was not found.

## Edge Cases
- **Empty message**: `/bmad auto-analysis ''` — should show usage or error
- **Cancelled session**: If a pi session is cancelled mid-pipeline, subsequent stages should not execute
- **Config resolution failure**: If `_bmad/bmm/config.yaml` is missing, pipeline should fail gracefully

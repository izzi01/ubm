---
estimated_steps: 21
estimated_files: 3
skills_used: []
---

# T03: Test all renderers comprehensively

Write comprehensive tests for all renderers.

1. `tests/auto/renderer-planning.test.ts`:
   - renderRoadmap with empty slices, with complete slices, with mixed statuses
   - renderSlicePlan with empty tasks, with mixed task statuses
   - renderTaskPlan with full task data and with minimal data
   - Snapshot-style assertions: verify specific markdown elements are present
   - Idempotency: same input produces identical output

2. `tests/auto/renderer-summaries.test.ts`:
   - renderTaskSummary with full narrative data
   - renderSliceSummary with multiple tasks
   - renderMilestoneSummary with multiple slices
   - renderUat produces valid UAT content
   - renderValidation with pass/needs-attention verdicts
   - All outputs have correct YAML frontmatter
   - All outputs have correct heading structure

Use factory helper functions to create test data objects from db/types.ts.

Also create `tests/auto/renderer-helpers.ts` with shared test data factories:
   - createTestMilestone(overrides?)
   - createTestSlice(overrides?)
   - createTestTask(overrides?)
   These return complete objects with sensible defaults.

## Inputs

- `src/auto/renderer.ts`
- `src/db/types.ts`

## Expected Output

- `tests/auto/renderer-planning.test.ts`
- `tests/auto/renderer-summaries.test.ts`
- `tests/auto/renderer-helpers.ts`

## Verification

npm run test:run -- tests/auto/renderer- --reporter=verbose

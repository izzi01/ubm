---
estimated_steps: 28
estimated_files: 1
skills_used: []
---

# T01: Build planning file renderers (ROADMAP, SLICE-PLAN, TASK-PLAN)

Create `src/auto/renderer.ts` with planning file renderers.

1. Define renderer function signatures:
   ```ts
   renderRoadmap(milestone: MilestoneRow, slices: SliceRow[]): string
   renderSlicePlan(slice: SliceRow, tasks: TaskRow[]): string
   renderTaskPlan(task: TaskRow): string
   ```

2. `renderRoadmap` produces:
   - Title heading with milestone ID and title
   - Vision block
   - Slice overview table with columns: ID, Slice, Risk, Depends, Done (checkbox), After this
   - Done column: ✅ for complete/skipped, ⬜ for pending, 🔄 for active
   - Success Criteria section (if present)
   - Definition of Done section (if present)

3. `renderSlicePlan` produces:
   - Title heading with slice ID and title
   - Goal section
   - Task overview table with columns: ID, Task, Est, Done (checkbox)
   - Per-task detail blocks with description, files, verify, expected output
   - Success Criteria section (if present)

4. `renderTaskPlan` produces:
   - Title heading with task ID and title
   - Description block
   - Files list
   - Verify command block
   - Inputs list
   - Expected output list

All renderers are pure functions — no side effects, no filesystem access. Markdown formatting is clean and human-readable.

## Inputs

- `src/db/types.ts`
- `src/auto/types.ts`

## Expected Output

- `src/auto/renderer.ts`

## Verification

npm run test:run -- tests/auto/renderer-planning.test.ts --reporter=verbose

# S02: File Rendering System

**Goal:** Build template-based file renderers that turn DB state into markdown: ROADMAP.md (milestone + slices), S##-PLAN.md (slice + tasks), T##-PLAN.md (task), and summary files (T##-SUMMARY.md, S##-SUMMARY.md, M##-SUMMARY.md, S##-UAT.md, M##-VALIDATION.md).
**Demo:** After this: calling renderRoadmap(milestone, slices) produces valid ROADMAP.md with checkboxes and table; calling renderTaskSummary(task) produces valid SUMMARY.md with frontmatter

## Must-Haves

- All 8 file types render correctly from DB data with proper markdown structure. Templates match GSD-2 artifact format (checkboxes, metadata blocks, frontmatter). Rendering is idempotent — same input produces same output. All renderers tested with snapshot-style assertions.

## Proof Level

- This slice proves: test

## Integration Closure

Renderers are pure functions (data in → markdown string out). No filesystem writes in the renderer layer — that's the completion tools' job. Rendering output is deterministic and testable.

## Verification

- Rendered files serve as the primary observability surface — they're what the operator and LLM read to understand state

## Tasks

- [x] **T01: Build planning file renderers (ROADMAP, SLICE-PLAN, TASK-PLAN)** `est:1.5h`
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
  - Files: `src/auto/renderer.ts`
  - Verify: npm run test:run -- tests/auto/renderer-planning.test.ts --reporter=verbose

- [x] **T02: Build summary file renderers (TASK-SUMMARY, SLICE-SUMMARY, MILESTONE-SUMMARY, UAT, VALIDATION)** `est:2h`
  Add summary file renderers to `src/auto/renderer.ts`.

1. Define summary renderer signatures:
   ```ts
   renderTaskSummary(task: TaskRow): string
   renderSliceSummary(slice: SliceRow, tasks: TaskRow[]): string
   renderMilestoneSummary(milestone: MilestoneRow, slices: SliceRow[]): string
   renderUat(slice: SliceRow, tasks: TaskRow[]): string
   renderValidation(milestone: MilestoneRow, slices: SliceRow[], verdict: string, rationale: string): string
   ```

2. `renderTaskSummary` produces:
   - YAML frontmatter with id, parent slice, milestone, completed_at
   - Title heading
   - One-liner section
   - Narrative section
   - Verification section
   - Key files section
   - Key decisions section

3. `renderSliceSummary` produces:
   - YAML frontmatter with id, parent milestone, provides/requires arrays
   - Title heading
   - One-liner
   - What Happened section
   - Verification section
   - Files modified section
   - Drill-down paths to task summaries

4. `renderMilestoneSummary` produces:
   - YAML frontmatter with id, title, verification_passed
   - Title heading
   - One-liner
   - Narrative section
   - Success criteria results
   - Definition of done results
   - Key decisions section

5. `renderUat` produces:
   - UAT test content for the slice
   - Lists what should be manually verified

6. `renderValidation` produces:
   - Validation verdict (pass/needs-attention/needs-remediation)
   - Success criteria checklist
   - Slice delivery audit table
   - Cross-slice integration notes
   - Requirement coverage notes

All use YAML frontmatter format matching GSD-2 conventions.
  - Files: `src/auto/renderer.ts`
  - Verify: npm run test:run -- tests/auto/renderer-summaries.test.ts --reporter=verbose

- [x] **T03: Test all renderers comprehensively** `est:1.5h`
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
  - Files: `tests/auto/renderer-planning.test.ts`, `tests/auto/renderer-summaries.test.ts`, `tests/auto/renderer-helpers.ts`
  - Verify: npm run test:run -- tests/auto/renderer- --reporter=verbose

## Files Likely Touched

- src/auto/renderer.ts
- tests/auto/renderer-planning.test.ts
- tests/auto/renderer-summaries.test.ts
- tests/auto/renderer-helpers.ts

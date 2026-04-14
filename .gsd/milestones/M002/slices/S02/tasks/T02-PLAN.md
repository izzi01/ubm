---
estimated_steps: 43
estimated_files: 1
skills_used: []
---

# T02: Build summary file renderers (TASK-SUMMARY, SLICE-SUMMARY, MILESTONE-SUMMARY, UAT, VALIDATION)

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

## Inputs

- `src/db/types.ts`

## Expected Output

- `src/auto/renderer.ts (updated)`

## Verification

npm run test:run -- tests/auto/renderer-summaries.test.ts --reporter=verbose

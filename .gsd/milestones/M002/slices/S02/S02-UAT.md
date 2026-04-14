# S02: File Rendering System — UAT

**Milestone:** M002
**Written:** 2026-04-10T12:06:59.442Z

# S02 UAT: File Rendering System

## Manual Verification Steps

### 1. Planning renderers produce valid markdown
- renderRoadmap with milestone + slices → contains heading, vision, table with status icons
- renderSlicePlan with slice + tasks → contains heading, goal, task table, detail blocks
- renderTaskPlan with full task data → contains checkbox, description, files, verify, inputs, expected output

### 2. Summary renderers produce valid markdown
- renderTaskSummary with completed task → contains YAML frontmatter with id/slice/milestone, all sections
- renderSliceSummary with tasks → contains task list, completion count
- renderMilestoneSummary with slices → contains slice results with status icons
- renderUat with tasks → contains verification steps and general checks
- renderValidation with pass verdict → contains verdict, audit table, criteria checklist

### 3. Idempotency
- Call any renderer twice with same input → identical output

### 4. Edge cases
- Null JSON fields → graceful fallback, no crashes
- Empty slices/tasks → sections omitted or minimal output

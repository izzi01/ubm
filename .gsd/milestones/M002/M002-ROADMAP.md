# M002: Auto-Mode Execution Loop

## Vision
Build the auto-mode execution loop that turns GSD from a state tracker into a state driver. The dispatch engine reads current milestone/slice/task state, determines the next actionable unit and required action (plan → execute → verify → complete), and produces structured dispatch results. File renderers turn DB state into ROADMAP.md, PLAN.md, and SUMMARY.md files so the LLM and operator can see progress. Enhanced completion tools (task_complete, slice_complete, milestone_validate, milestone_complete) write results to DB and render summary files. The /gsd auto command uses the dispatcher to kick off the cycle. After this milestone, running /gsd auto on a planned milestone will drive execution through to completion.

## Slice Overview
| ID | Slice | Risk | Depends | Done | After this |
|----|-------|------|---------|------|------------|
| S01 | S01 | high | — | ✅ | After this: dispatcher correctly identifies next unit and action for any milestone state; auto-mode can be started/stopped |
| S02 | S02 | medium | — | ✅ | After this: calling renderRoadmap(milestone, slices) produces valid ROADMAP.md with checkboxes and table; calling renderTaskSummary(task) produces valid SUMMARY.md with frontmatter |
| S03 | S03 | medium | — | ✅ | After this: /gsd auto on a planned milestone drives the LLM through the full cycle: dispatch → execute → complete → advance → dispatch next unit |

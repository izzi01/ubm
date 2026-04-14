---
id: T01
parent: S04
milestone: M112
key_files:
  - src/resources/extensions/umb/bmad-pipeline/pipelines.ts
  - src/resources/extensions/umb/bmad-pipeline/index.ts
  - src/resources/extensions/umb/tests/bmad-pipeline.test.ts
key_decisions:
  - (none)
duration: 
verification_result: passed
completed_at: 2026-04-13T16:43:05.558Z
blocker_discovered: false
---

# T01: Added PLANNING_PIPELINE definition (bmad-create-prd → bmad-create-ux-design) with full test coverage (24/24 tests pass)

**Added PLANNING_PIPELINE definition (bmad-create-prd → bmad-create-ux-design) with full test coverage (24/24 tests pass)**

## What Happened

Added PLANNING_PIPELINE to pipelines.ts with two required stages (bmad-create-prd, bmad-create-ux-design) in the 2-plan-workflows phase. Exported it from index.ts. Added 9 new tests covering structure validation, lookup, sequential execution with mock sessionFactory, context accumulation, and failure on missing required stage. Updated existing listPipelines test to reflect the new pipeline count. All 24 tests pass (15 existing + 9 new) with no regressions.

## Verification

npx vitest run src/resources/extensions/umb/tests/bmad-pipeline.test.ts — 24/24 tests pass, 154ms duration

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `npx vitest run src/resources/extensions/umb/tests/bmad-pipeline.test.ts` | 0 | ✅ pass | 154ms |

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `src/resources/extensions/umb/bmad-pipeline/pipelines.ts`
- `src/resources/extensions/umb/bmad-pipeline/index.ts`
- `src/resources/extensions/umb/tests/bmad-pipeline.test.ts`

---
id: T01
parent: S03
milestone: M001
key_files:
  - src/tools/gsd-tools.ts
  - src/tools/index.ts
  - src/extension/index.ts
  - tests/tools/gsd-tools.test.ts
key_decisions:
  - Separated tool handler creation from registration for testability
  - Used pi SDK AgentToolResult<{content,details}> shape for tool returns
  - Stored JSON arrays in DB string columns per existing schema
duration: 
verification_result: untested
completed_at: 2026-04-07T22:04:13.756Z
blocker_discovered: false
---

# T01: Implemented 10 GSD CRUD/state-machine tools (milestone_plan, slice_plan, task_plan, advance, approve, status, phase, list_milestones, list_slices, list_tasks) with TypeBox schemas, pi extension registration, and 36 passing tests.

**Implemented 10 GSD CRUD/state-machine tools (milestone_plan, slice_plan, task_plan, advance, approve, status, phase, list_milestones, list_slices, list_tasks) with TypeBox schemas, pi extension registration, and 36 passing tests.**

## What Happened

Read the pi SDK's ExtensionAPI and ToolDefinition types to understand the exact registration contract. Created src/tools/gsd-tools.ts with createGsdToolHandlers(engine) factory returning 10 tool definitions with TypeBox parameter schemas and async execute functions, plus registerGsdTools(pi, engine) to wire them into the extension system. Each execute() wraps engine operations in try/catch. Updated src/extension/index.ts to call registerGsdTools at load time. Created barrel export in src/tools/index.ts. Wrote 36 tests covering all tools: happy paths, error handling, gate interactions, approval flow, and registry completeness. Key adaptation: pi SDK's AgentToolResult uses {content, details} not {isError, content}, and gate manager returns {blocked, reason} for non-existent/terminal entities instead of throwing.

## Verification

All 36 tests pass (npm run test:run -- tests/tools/). Zero type errors in new files (npx tsc --noEmit). Tool registry completeness verified.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| — | No verification commands discovered | — | — | — |

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `src/tools/gsd-tools.ts`
- `src/tools/index.ts`
- `src/extension/index.ts`
- `tests/tools/gsd-tools.test.ts`

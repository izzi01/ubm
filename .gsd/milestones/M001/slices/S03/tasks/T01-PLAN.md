---
estimated_steps: 6
estimated_files: 4
skills_used: []
---

# T01: Register GSD CRUD tools as LLM-callable tools

**Slice:** S03 — GSD Tools + Commands + Pattern Control
**Milestone:** M001

## Description

Create LLM-callable tool definitions for the core GSD operations using the pi extension `registerTool()` API. Each tool wraps a `GsdEngine` method with a TypeBox parameter schema and returns structured JSON. This is the backbone that enables the LLM to manage milestones, slices, and tasks through the GSD state machine.

The pi SDK's `registerTool()` expects a `ToolDefinition` object with:
- `name`: tool name string (e.g. `"gsd_milestone_plan"`)
- `description`: LLM-readable description
- `parameters`: TypeBox schema (`TSchema` from `@sinclair/typebox`)
- `execute()`: async handler receiving `(toolCallId, params, signal, onUpdate, ctx)` returning `AgentToolResult`

All tools operate through the `getGsdEngine()` singleton from `src/extension/index.ts`.

## Failure Modes

| Dependency | On error | On timeout | On malformed response |
|------------|----------|-----------|----------------------|
| GsdDb (SQLite) | Return `{ isError: true, content: [{ type: "text", text: error.message }] }` | N/A (synchronous) | N/A |
| GsdStateMachine | Return transition error as text result | N/A (synchronous) | N/A |
| TypeBox validation | SDK rejects malformed params before execute() | N/A | N/A |

## Steps

1. **Create `src/tools/gsd-tools.ts`** — Define tool registration function `registerGsdTools(pi: ExtensionAPI)` that registers all GSD tools. Implement these tools:
   - `gsd_milestone_plan` — Creates a milestone. Params: `{ id, title, vision, status?, successCriteria?, definitionOfDone? }`. Calls `engine.db.milestoneInsert()`. Returns milestone row as JSON.
   - `gsd_slice_plan` — Creates a slice. Params: `{ id, milestoneId, title, goal, risk?, depends?, demo?, status? }`. Calls `engine.db.sliceInsert()`. Returns slice row as JSON.
   - `gsd_task_plan` — Creates a task. Params: `{ id, sliceId, milestoneId, title, description?, estimate?, files?, verify? }`. Calls `engine.db.taskInsert()`. Returns task row as JSON.
   - `gsd_advance` — Advances entity state via state machine (with gate checks). Params: `{ entityType: "milestone"|"slice"|"task", id }`. Calls `engine.gates.advanceWithGate()`. Returns `GateResult` as JSON. If blocked, returns `{ blocked: true, reason }`.
   - `gsd_approve` — Approves a blocked transition. Params: `{ entityType, id }`. Calls `engine.gates.approve()`. Returns success/error.
   - `gsd_status` — Gets current status of an entity. Params: `{ entityType, id }`. Calls `engine.stateMachine.getStatus()`. Returns `{ entityType, id, status }`.
   - `gsd_phase` — Gets current phase for a milestone. Params: `{ milestoneId }`. Calls `engine.stateMachine.getPhase()`. Returns `{ milestoneId, phase }`.
   - `gsd_list_milestones` — Lists all milestones. No params. Calls `engine.db.milestoneGetAll()`. Returns array.
   - `gsd_list_slices` — Lists slices for a milestone. Params: `{ milestoneId }`. Returns array.
   - `gsd_list_tasks` — Lists tasks for a slice or milestone. Params: `{ sliceId?, milestoneId? }`. Returns array.
   - Use `Type` from `@sinclair/typebox` for parameter schemas (e.g. `Type.Object()`, `Type.String()`, `Type.Optional()`).
   - All `execute()` functions must catch errors and return `{ isError: true, content: [{ type: "text", text: errorMessage }] }` on failure.
   - Import `getGsdEngine` from `../extension/index.js`.

2. **Create `src/tools/index.ts`** — Barrel export `registerGsdTools` from `./gsd-tools.js`.

3. **Update `src/extension/index.ts`** — Import and call `registerGsdTools(pi)` inside the `registerExtension()` function after engine creation.

4. **Create `tests/tools/gsd-tools.test.ts`** — Unit tests that:
   - Create an in-memory GsdEngine (`createGsdEngine(":memory:")`)
   - Mock or directly test tool execute functions by extracting them from the registration
   - Test `gsd_milestone_plan` creates a milestone and returns it
   - Test `gsd_slice_plan` creates a slice under a milestone
   - Test `gsd_task_plan` creates a task under a slice
   - Test `gsd_advance` advances task pending→active→complete
   - Test `gsd_advance` with gates (blocked transition returns blocked result)
   - Test `gsd_approve` unblocks and advances
   - Test `gsd_status` returns correct status
   - Test `gsd_phase` returns correct phase for milestone hierarchy
   - Test `gsd_list_*` tools return arrays
   - Test error handling — invalid entity returns isError result
   - Use `vitest` describe/it/expect patterns consistent with existing tests
   - NOTE: Since `registerTool` requires ExtensionAPI, test the tool execute functions directly rather than through the full registration flow. Export a `createGsdToolHandlers(engine)` function that returns a record of `{ name, execute }` pairs, separate from the registration function.

## Must-Haves

- [ ] All 10+ GSD tools registered with proper TypeBox schemas
- [ ] Every tool execute function catches errors and returns `{ isError: true }` on failure
- [ ] Tools use `getGsdEngine()` singleton (not creating new engines)
- [ ] `registerGsdTools()` called from `registerExtension()` in index.ts
- [ ] 20+ unit tests covering happy paths, error paths, and gate interactions
- [ ] `npm run test:run -- tests/tools/` passes with all tests green

## Verification

- `npm run test:run -- tests/tools/` — all tests pass
- `npx tsc --noEmit` — zero type errors in `src/tools/` and `tests/tools/`

## Inputs

- `src/state-machine/index.ts` — GsdEngine interface and createGsdEngine factory
- `src/db/gsd-db.ts` — GsdDb class with CRUD methods
- `src/db/types.ts` — Row types (MilestoneRow, SliceRow, TaskRow, etc.)
- `src/state-machine/types.ts` — EntityType, TransitionResult, GsdStateMachineError
- `src/state-machine/gates.ts` — GsdGateManager with advanceWithGate/approve
- `src/extension/index.ts` — getGsdEngine() accessor and registerExtension entry point

## Expected Output

- `src/tools/gsd-tools.ts` — Tool definitions and registration function
- `src/tools/index.ts` — Barrel export
- `src/extension/index.ts` — Updated to call registerGsdTools(pi)
- `tests/tools/gsd-tools.test.ts` — Unit tests for all GSD tools

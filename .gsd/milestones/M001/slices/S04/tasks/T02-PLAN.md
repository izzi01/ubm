---
estimated_steps: 55
estimated_files: 1
skills_used: []
---

# T02: Integration Tests for Full BMAD→GSD Pipeline

Write comprehensive integration tests exercising the complete lifecycle: tool execution → state machine transitions → gate blocking/approval → command handler output → dashboard refresh. Proves the full BMAD→GSD pipeline works end-to-end.

## Steps

1. Create `tests/integration/full-pipeline.test.ts`:

   **Test Suite: Full Lifecycle Integration**
   - Use `createGsdEngine(tmpDbPath)` with a real temp file (not :memory:, to test persistence)
   - Use `createGsdToolHandlers(engine)` and `createGsdCommandHandlers(engine)` for testing
   - Use `createMockCtx()` pattern from existing command tests (copy the helper)

   **Test: Plan milestone → slices → tasks via tool handlers**
   - Call execute() on gsd_milestone_plan tool handler with valid params
   - Assert returned content contains milestone ID
   - Call gsd_slice_plan for 3 slices
   - Call gsd_task_plan for 2 tasks per slice
   - Verify DB contains all created entities via `engine.db.milestoneGetAll()` etc.

   **Test: Advance through full state machine lifecycle**
   - Start with pending slice, advance to active, advance to complete
   - Verify state transitions via `engine.stateMachine.getStatus()`
   - Verify phase changes via `engine.stateMachine.getPhase()`
   - Test that advancing a milestone with incomplete slices is blocked

   **Test: Gate blocking and approval**
   - Configure a gate on a slice transition (e.g., active→complete requires approval)
   - Call gsd_advance — assert it returns blocked result
   - Call gsd_approve — assert approval succeeds
   - Call gsd_advance again — assert transition succeeds

   **Test: Command handlers reflect state changes**
   - After creating entities and advancing states, call handleGsdStatus
   - Assert widget content shows correct status icons for each entity
   - Call handleGsdAuto — assert it reports correct phase and next action

   **Test: Dashboard renders correctly after state changes**
   - Import `renderGsdDashboard` from dashboard module
   - After full lifecycle, call renderGsdDashboard(engine)
   - Assert output contains milestone title, slice progress counts, and correct status icons

   **Test: ContextScout pattern discovery**
   - Call `scanPatterns(process.cwd())` with the project root
   - Assert patterns array is non-empty (src/patterns/ has many pattern files)
   - Assert each pattern has name, path, and type='pattern'
   - If _bmad/ exists with agents, assert agents are discovered

   **Test: BMAD agent resolution**
   - Call `handleBmadList` with mock ctx
   - Assert widget content lists agents grouped by module
   - Call `handleBmadDelegate` with a valid agent name (e.g., 'pm')
   - Assert it finds the agent and shows delegation info

   **Test: Error handling in tool handlers**
   - Call gsd_advance with non-existent entity — assert error result
   - Call gsd_status with non-existent entity — assert error result
   - Call gsd_list_tasks without sliceId or milestoneId — assert error result

2. Verify all tests pass: `npm run test:run -- tests/integration/full-pipeline.test.ts`
3. Run full suite to ensure no regressions: `npm run test:run`
4. Verify no new type errors: `npx tsc --noEmit` (only check src/dashboard/ and src/extension/)

## Key Constraints

- Tool handler execute() signature: `(toolCallId, params, signal, onUpdate, ctx) => Promise<AgentToolResult>`
  - Pass empty string for toolCallId, undefined for signal and onUpdate
  - Create minimal mock ctx: `{ ui: { notify: vi.fn() } } as any`
- The `createMockCtx()` helper from gsd-commands.test.ts should be duplicated locally (not imported from test file)
- Temp DB files must be cleaned up in afterEach (use `fs.unlinkSync`)
- Do NOT test actual pi extension loading (requires pi runtime) — test the handlers directly

## Inputs

- `src/dashboard/gsd-dashboard.ts`
- `src/tools/gsd-tools.ts`
- `src/commands/gsd-commands.ts`
- `src/commands/bmad-commands.ts`
- `src/patterns/context-scout.ts`
- `src/state-machine/index.ts`

## Expected Output

- `tests/integration/full-pipeline.test.ts`

## Verification

npm run test:run -- tests/integration/full-pipeline.test.ts

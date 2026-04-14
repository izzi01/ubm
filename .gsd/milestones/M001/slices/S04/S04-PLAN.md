# S04: Dashboard UI + Integration Tests

**Goal:** Create a GSD dashboard widget that auto-updates milestone progress in the pi TUI, and write integration tests proving the full BMAD→GSD pipeline works end-to-end.
**Demo:** After this: After this: pi-tui dashboard shows milestone progress, all integration tests pass, full BMAD→GSD pipeline works end-to-end

## Tasks
- [x] **T01: Created GSD dashboard module rendering milestone/slice/task progress as formatted widget, wired auto-refresh into extension events** — Create a dashboard module that renders milestone/slice/task progress as a formatted widget, wire it into the extension via session_start and tool_result events for auto-refresh.

## Steps

1. Create `src/dashboard/gsd-dashboard.ts`:
   - Export `renderGsdDashboard(engine: GsdEngine): string[]` that reads milestones, slices, and tasks from the DB
   - For each milestone, show: `{id} — {title} [{status}]`
   - For each milestone, show phase via `engine.stateMachine.getPhase(milestone.id)`
   - For each slice, show status icon (✅ complete, 🔄 active, ⬜ pending, ⏭️ skipped) and title
   - For each slice, show task progress count: `Tasks: 2/4`
   - For each milestone, show overall progress line: `Slices: 1/3 complete`
   - Empty state: return `['📋 GSD Dashboard', '', 'No milestones found. Use gsd_milestone_plan to create one.']`
   - If milestone has a blocked slice (gate blocked), show `🔒` icon

2. Create `src/dashboard/index.ts`:
   - Barrel export: `export { renderGsdDashboard } from './gsd-dashboard.js'`

3. Create `src/dashboard/gsd-dashboard.test.ts` (note: test file is in tests/):
   - Actually create at `tests/dashboard/gsd-dashboard.test.ts`
   - Use `createGsdEngine(':memory:')` for in-memory DB
   - Test: empty state (no milestones) returns placeholder message
   - Test: single milestone with pending slices shows correct icons and counts
   - Test: milestone with mixed slice statuses (some complete, some pending)
   - Test: milestone with all slices complete shows all ✅
   - Test: milestone with blocked slice (gate blocked) shows 🔒
   - Test: multiple milestones rendered in order
   - Test: task progress counts per slice are accurate

4. Update `src/extension/index.ts`:
   - Import `renderGsdDashboard` from `../dashboard/gsd-dashboard.js`
   - After engine creation, register event handlers:
     ```typescript
     pi.on('session_start', (_event, ctx) => {
       if (engine) {
         ctx.ui.setWidget('gsd-dashboard', renderGsdDashboard(engine));
       }
     });
     pi.on('tool_result', (event, ctx) => {
       if (engine && 'toolName' in event && typeof event.toolName === 'string' && event.toolName.startsWith('gsd_')) {
         ctx.ui.setWidget('gsd-dashboard', renderGsdDashboard(engine));
       }
     });
     ```
   - Keep existing tool/command registration unchanged

## Key Constraints

- Use `string[]` return type for setWidget (not TUI Component factory) — consistent with existing command pattern
- `renderGsdDashboard` is a pure function taking GsdEngine, making it trivially testable
- Do NOT import TUI or Theme types — string arrays are sufficient for v1
- The `tool_result` event uses `CustomToolResultEvent` for extension-registered tools (toolName: string)
- Use type narrowing: `'toolName' in event && typeof event.toolName === 'string'` to distinguish CustomToolResultEvent from built-in tool events
  - Estimate: 1h
  - Files: src/dashboard/gsd-dashboard.ts, src/dashboard/index.ts, src/extension/index.ts, tests/dashboard/gsd-dashboard.test.ts
  - Verify: npm run test:run -- tests/dashboard/gsd-dashboard.test.ts
- [x] **T02: Wrote 22 integration tests covering full BMAD→GSD pipeline: tool CRUD, state machine lifecycle, gate blocking/approval, command handlers, dashboard rendering, ContextScout, BMAD agents, and error handling** — Write comprehensive integration tests exercising the complete lifecycle: tool execution → state machine transitions → gate blocking/approval → command handler output → dashboard refresh. Proves the full BMAD→GSD pipeline works end-to-end.

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
  - Estimate: 1h
  - Files: tests/integration/full-pipeline.test.ts
  - Verify: npm run test:run -- tests/integration/full-pipeline.test.ts

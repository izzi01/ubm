# S04: Dashboard UI + Integration Tests — UAT

**Milestone:** M001
**Written:** 2026-04-07T22:19:50.726Z

# S04: Dashboard UI + Integration Tests — UAT

**Milestone:** M001
**Written:** 2026-04-08

## UAT Type

- UAT mode: artifact-driven
- Why this mode is sufficient: This slice produces a dashboard widget and integration tests — both are verified by running the test suite and inspecting rendered output. No runtime server or human experience interaction is needed.

## Preconditions

- Node.js installed with project dependencies (`npm install` run)
- Project root contains `src/patterns/` directory with pattern files
- Project root contains `_bmad/` directory with agent YAML files (for ContextScout/BMAD tests)

## Smoke Test

Run `npm run test:run -- tests/integration/full-pipeline.test.ts` — all 22 tests should pass.

## Test Cases

### 1. Dashboard Renders Empty State

1. Create GsdEngine with in-memory DB
2. Call `renderGsdDashboard(engine)`
3. **Expected:** Output contains "No milestones found" placeholder message

### 2. Full Lifecycle: Plan → Execute → Verify → Complete

1. Create engine with temp file DB
2. Call gsd_milestone_plan tool handler with valid params
3. Call gsd_slice_plan for 3 slices
4. Call gsd_task_plan for 2 tasks per slice
5. Verify DB contains all entities
6. Advance tasks pending→active→complete
7. Advance slices pending→active→complete
8. Verify milestone can advance to complete
9. **Expected:** All 22 integration tests pass, DB state is consistent throughout

### 3. Gate Blocking Prevents Unauthorized Advance

1. Create milestone + slice via tool handlers
2. Configure gate requiring approval on slice active→complete
3. Call gsd_advance — assert blocked result
4. Call gsd_approve — assert success
5. Call gsd_advance again — assert transition succeeds
6. **Expected:** Gate blocks before approval, allows after

### 4. Dashboard Reflects State Changes Accurately

1. After full lifecycle (milestone with mixed slice statuses)
2. Call renderGsdDashboard(engine)
3. **Expected:** Output contains correct status icons (✅/🔄/⬜), task progress counts (e.g., "Tasks: 2/2"), slice completion count, and 🔒 for gate-blocked slices

### 5. ContextScout Discovers Project Patterns and Agents

1. Call scanPatterns(process.cwd())
2. **Expected:** Returns non-empty array with patterns having name, path, type='pattern'. If _bmad/ exists, agents are also discovered.

### 6. BMAD Agent Commands Work

1. Call handleBmadList with mock ctx
2. **Expected:** Widget content lists agents grouped by module (bmm, cis, bmb)
3. Call handleBmadDelegate with valid agent name
4. **Expected:** Returns agent info with delegation details

### 7. Error Handling Returns Useful Messages

1. Call gsd_advance with non-existent entity
2. Call gsd_status with non-existent entity
3. **Expected:** Error results with descriptive messages, no crashes

## Edge Cases

### Gate-Blocked Slice Shows Lock Icon

1. Create milestone with gate-configured slice
2. Block the slice via gate
3. Render dashboard
4. **Expected:** 🔒 icon appears next to the blocked slice

### Double Approval Is Idempotent

1. Approve a gate
2. Approve the same gate again
3. **Expected:** No error, second approval is a no-op

## Failure Signals

- Any integration test failure indicates a regression in the BMAD→GSD pipeline
- Dashboard tests failing indicates rendering logic or state machine query issues
- TypeScript errors in new files indicate type safety regressions

## Not Proven By This UAT

- Actual pi extension loading at runtime (requires pi runtime, not testable in Vitest)
- Real-time auto-refresh in live TUI (tested via direct function calls, not event system)
- Persistence across restarts (temp DB is created/destroyed within test)

## Notes for Tester

- 6 pre-existing test failures in patterns/ directory are unrelated to this slice
- Pre-existing TS2835 errors in tests/workflows/ are unrelated (missing .js extensions)
- The dashboard uses string[] (not TUI Component) — this is intentional for v1 simplicity

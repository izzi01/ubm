---
estimated_steps: 45
estimated_files: 4
skills_used: []
---

# T01: GSD Dashboard Widget with Auto-Refresh

Create a dashboard module that renders milestone/slice/task progress as a formatted widget, wire it into the extension via session_start and tool_result events for auto-refresh.

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

## Inputs

- `src/state-machine/index.ts`
- `src/extension/index.ts`
- `src/db/types.ts`

## Expected Output

- `src/dashboard/gsd-dashboard.ts`
- `src/dashboard/index.ts`
- `tests/dashboard/gsd-dashboard.test.ts`
- `src/extension/index.ts`

## Verification

npm run test:run -- tests/dashboard/gsd-dashboard.test.ts

## Observability Impact

Dashboard widget IS the observability surface — makes GSD state visible in the TUI without running commands.

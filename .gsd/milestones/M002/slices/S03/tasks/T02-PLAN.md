---
estimated_steps: 16
estimated_files: 2
skills_used: []
---

# T02: Wire /gsd auto command to dispatch engine, add gsd_dispatch tool

Enhance /gsd auto command and add gsd_dispatch tool.

1. Update `handleGsdAuto` in `src/commands/gsd-commands.ts`:
   - Use engine.autoMode to start auto-mode
   - Call dispatch() to get current state
   - Show structured dispatch result: phase, next unit, action, blocked status
   - Update autoMode lastDispatch
   - If gate-blocked, show which entity is blocked and why

2. Add `gsd_dispatch` tool (for LLM to call during auto-mode):
   - Params: milestoneId
   - Returns DispatchResult (current phase, next action, next unit IDs)
   - This is what the LLM calls to figure out what to do next

3. Add `/gsd stop` command:
   - Calls engine.autoMode.stop()
   - Shows 'Auto-mode stopped' notification

4. Register new tool and command in extension index.ts if needed

The /gsd auto command now starts auto-mode AND shows dispatch result in one step.

## Inputs

- `src/auto/dispatcher.ts`
- `src/auto/auto-state.ts`
- `src/state-machine/index.ts`

## Expected Output

- `src/commands/gsd-commands.ts (updated)`
- `src/tools/gsd-tools.ts (gsd_dispatch tool added)`

## Verification

npm run test:run -- tests/commands/gsd-auto.test.ts --reporter=verbose

---
estimated_steps: 20
estimated_files: 3
skills_used: []
---

# T02: Wire /umb model command and add integration tests

Create the `/umb` command namespace and the `/umb model` slash command that displays the resolved model configuration.

1. Create `src/commands/umb-commands.ts`:
   - `handleUmbModel(args, ctx)` — reads model config via `loadModelConfig(ctx.cwd)`, formats output
   - Display format (widget):
     - Header: "🔧 Model Configuration" + tier badge if set
     - Table: each agent name → assigned model string
     - If warnings exist, show them as ⚠️ lines
     - If errors exist, show them as ❌ lines and notify with 'error'
     - If no config file, show helpful message: "No .umb/models.yaml found. Create one with tier: budget|standard|premium"
   - `registerUmbCommands(pi)` — registers `/umb model` and `/umb` (with usage hint)

2. Register the commands in `src/extension/index.ts`:
   - Import and call `registerUmbCommands(pi)` alongside existing command registrations

3. Add integration test in `tests/commands/umb-commands.test.ts`:
   - Test `/umb model` with no config file — shows helpful message
   - Test `/umb model` with a valid `.umb/models.yaml` (create temp file in test) — shows agent→model table
   - Test `/umb model` with tier preset — shows tier badge
   - Test `/umb model` with warnings — shows warning lines
   - Use the same `createMockCtx` pattern from existing integration tests

4. Run all existing tests to verify no regressions:
   - `npm test:run` should pass all tests including the 33 existing ones

## Inputs

- `src/model-config/index.ts`
- `src/model-config/types.ts`
- `src/model-config/loader.ts`
- `src/extension/index.ts`

## Expected Output

- `src/commands/umb-commands.ts`
- `src/extension/index.ts`
- `tests/commands/umb-commands.test.ts`

## Verification

npm test:run -- tests/commands/umb-commands.test.ts && npm test:run

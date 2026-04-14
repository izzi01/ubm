# S01: Model Configuration System

**Goal:** Create a model configuration system where users define per-agent model assignments in .umb/models.yaml, apply tier presets (budget/standard/premium) for sensible defaults, and inspect their configuration via /umb model. Invalid models produce warnings.
**Demo:** User creates .umb/models.yaml, runs /umb model, sees all phase/agent assignments displayed. Invalid model produces a warning. Tier preset applies sensible defaults.

## Must-Haves

- .umb/models.yaml schema is defined and documented in types\n- Tier presets (budget/standard/premium) map to sensible agent→model defaults derived from existing opencode-config\n- loadModelConfig() reads, validates, and merges tier + user overrides\n- /umb model command displays all phase/agent assignments in a readable widget\n- Invalid or unrecognized agents produce warnings (not errors)\n- All tests pass including new unit + integration tests

## Proof Level

- This slice proves: contract

## Integration Closure

- Upstream surfaces consumed: existing extension registration pattern (src/extension/index.ts), existing command registration API (ExtensionAPI.registerCommand)\n- New wiring: registerUmbCommands() called in extension entry point; /umb namespace registered\n- What remains: S02 will consume loadModelConfig() to route models to BMAD discovery agents; S03 is independent

## Verification

- Warnings and errors are surfaced via ctx.ui.notify() and widget output — consistent with existing /bmad command pattern

## Tasks

- [x] **T01: Build model config types, YAML loader, tier presets, and validation** `est:1.5h`
  Create the core data layer for the model configuration system. This includes:

1. Define TypeScript types for the model config schema in `src/model-config/types.ts`:
   - `ModelConfig` — top-level config with optional `tier` preset field and `agents` map
   - `AgentModelAssignment` — per-agent model string (e.g. `google/antigravity-gemini-3-pro`)
   - `TierPreset` — union type: `'budget' | 'standard' | 'premium'`
   - `ValidatedModelConfig` — config after validation (all agents resolved, warnings collected)

2. Create tier preset definitions in `src/model-config/tier-presets.ts`:
   - Study existing `opencode-config/` directories (01-budget, 03-standard, 05-premium) for actual model assignments
   - Map each tier to a set of agent→model defaults (at minimum: analyst, architect, dev, pm, tea, sm, tech-writer, ux-designer, quick-flow-solo-dev, brainstorming-coach, creative-problem-solver, design-thinking-coach, innovation-strategist, presentation-master, storyteller, bmad-master, agent-builder, module-builder, workflow-builder)
   - Export `TIER_PRESETS: Record<TierPreset, Record<string, string>>`

3. Build YAML loader + validator in `src/model-config/loader.ts`:
   - `loadModelConfig(cwd: string): { config: ValidatedModelConfig | null; warnings: string[]; errors: string[] }`
   - Reads `.umb/models.yaml` from cwd (returns null config if file doesn't exist)
   - If `tier` field is set, merge tier defaults (user overrides win over tier defaults)
   - If no `tier` and no `agents`, return empty config with warning "No model assignments found"
   - Validate: check that each agent name is a known BMAD agent (compare against `_bmad/` agent manifests)
   - Collect warnings for agents not found in `_bmad/` (they may be valid but unrecognized)
   - Do NOT validate model strings against any provider — that's provider-specific and out of scope
   - Use simple YAML parsing (the config is flat — just read the file, extract `tier` and `agents` keys)

4. Add unit tests in `tests/model-config/loader.test.ts`:
   - Test loading a valid config with tier preset
   - Test loading a config with explicit agent overrides
   - Test merging: tier defaults + user overrides (user wins)
   - Test missing file returns null config
   - Test invalid YAML produces error
   - Test unknown agents produce warnings (not errors)
   - Test tier-only config (no agents) applies all defaults
   - Test empty file produces warning

Important: Do NOT add a YAML parsing dependency. Parse the simple YAML structure manually or use a lightweight approach. The config format is deliberately simple — no nested structures, just `tier:` and `agents:` with key-value pairs. A simple regex/line-based parser is sufficient.
  - Files: `src/model-config/types.ts`, `src/model-config/tier-presets.ts`, `src/model-config/loader.ts`, `src/model-config/index.ts`, `tests/model-config/loader.test.ts`
  - Verify: npm test:run -- tests/model-config/loader.test.ts

- [x] **T02: Wire /umb model command and add integration tests** `est:1h`
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
  - Files: `src/commands/umb-commands.ts`, `src/extension/index.ts`, `tests/commands/umb-commands.test.ts`
  - Verify: npm test:run -- tests/commands/umb-commands.test.ts && npm test:run

## Files Likely Touched

- src/model-config/types.ts
- src/model-config/tier-presets.ts
- src/model-config/loader.ts
- src/model-config/index.ts
- tests/model-config/loader.test.ts
- src/commands/umb-commands.ts
- src/extension/index.ts
- tests/commands/umb-commands.test.ts

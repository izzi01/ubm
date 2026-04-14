---
estimated_steps: 29
estimated_files: 5
skills_used: []
---

# T01: Build model config types, YAML loader, tier presets, and validation

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

## Inputs

- `opencode-config/01-budget/opencode.json`
- `opencode-config/03-standard/opencode.json`
- `opencode-config/05-premium/opencode.json`
- `_bmad/_config/manifest.yaml`

## Expected Output

- `src/model-config/types.ts`
- `src/model-config/tier-presets.ts`
- `src/model-config/loader.ts`
- `src/model-config/index.ts`
- `tests/model-config/loader.test.ts`

## Verification

npm test:run -- tests/model-config/loader.test.ts

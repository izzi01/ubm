# S02: BMAD Discovery Commands

**Goal:** Add /bmad research, /bmad brief, /bmad prd, and /bmad arch commands that delegate to the correct BMAD agent with the model resolved from .umb/models.yaml, and save output to _bmad-output/planning-artifacts/.
**Demo:** User runs /bmad research 'OAuth providers', analyst agent is invoked with configured model, research output saved to _bmad-output/planning-artifacts/research-{topic}.md. Same flow works for brief, prd, arch.

## Must-Haves

- /bmad research 'OAuth providers' creates a new session with the analyst agent's model from .umb/models.yaml and sends the research prompt\n- /bmad brief, /bmad prd, /bmad arch follow the same pattern with their respective agents\n- Missing model config produces a clear error directing user to /umb model\n- All new tests pass alongside existing S01 tests

## Proof Level

- This slice proves: contract

## Integration Closure

- Upstream surfaces consumed: loadModelConfig() from src/model-config/index.ts, ValidatedModelConfig/AgentModelAssignment types from src/model-config/types.ts, KNOWN_AGENTS from src/model-config/loader.ts\n- New wiring introduced: registerDiscoveryCommands() called in src/extension/index.ts, 4 new /bmad subcommands registered\n- What remains before milestone is truly usable end-to-end: S03 (PRD Import Bridge) to consume the output files

## Verification

- Discovery commands produce clear widget output showing: agent name, resolved model (provider/modelId), topic, and output path\n- Error states are surfaced via ctx.ui.notify() with severity levels and ctx.ui.setWidget() with actionable messages

## Tasks

- [x] **T01: Define discovery command types and agent mapping layer** `est:45m`
  Create the data/configuration layer for BMAD discovery commands. This includes:

1. Discovery type definitions — map each command (research, brief, prd, arch) to its BMAD agent, default prompt template, and output file prefix
2. A resolver function that takes a discovery type + topic and returns: agent name, prompt text, output file path, and the model string from .umb/models.yaml
3. Model string parsing utility — split 'provider/model-id' into {provider, modelId} for use with SessionManager.appendModelChange()
4. Output directory creation helper — ensure _bmad-output/planning-artifacts/ exists before writing

The key data structure:
```typescript
interface DiscoveryType {
  command: 'research' | 'brief' | 'prd' | 'arch';
  agent: string;           // 'analyst', 'pm', 'pm', 'architect'
  outputPrefix: string;    // 'research', 'brief', 'prd', 'arch'
  label: string;           // Human-readable label for session naming
}
```

Model string parsing: 'openai/gpt-5.2-codex' → { provider: 'openai', modelId: 'gpt-5.2-codex' }. Handle edge cases (no slash, multiple slashes — first slash is the separator).

This is pure logic — no pi SDK dependencies beyond types.
  - Files: `src/commands/discovery-types.ts`, `tests/commands/discovery-types.test.ts`
  - Verify: npm test -- --grep 'discovery-types'

- [x] **T02: Implement discovery command handlers with session delegation** `est:1h`
  Build the four discovery command handlers and wire them into the /bmad namespace:

1. Create `src/commands/discovery-commands.ts` with:
   - `handleBmadDiscovery(commandType, args, ctx)` — shared handler for all discovery commands
     - Parse topic from args (first quoted string or rest of args)
     - Resolve agent→model via discovery types from T01 + loadModelConfig()
     - Parse model string into provider/modelId
     - Build the agent prompt: load agent YAML from _bmad/, prepend with topic instruction
     - Call ctx.newSession({ setup: async (sm) => { sm.appendModelChange(provider, modelId); sm.appendMessage({role:'user', content: prompt}); } })
     - On success: notify user with agent name, model, and output path
     - On failure (no config, no model for agent): show error widget with setup instructions
   - `handleBmadResearch(args, ctx)` — thin wrapper calling handleBmadDiscovery('research', args, ctx)
   - `handleBmadBrief(args, ctx)` — thin wrapper for 'brief'
   - `handleBmadPrd(args, ctx)` — thin wrapper for 'prd'
   - `handleBmadArch(args, ctx)` — thin wrapper for 'arch'
   - `registerDiscoveryCommands(pi)` — register /bmad research, /bmad brief, /bmad prd, /bmad arch

2. Wire `registerDiscoveryCommands(pi)` into `src/extension/index.ts`

3. Key constraints:
   - Use ctx.modelRegistry.find(provider, modelId) to validate the model exists before delegating
   - If model not found in registry, show error with available models hint
   - Topic sanitization: strip shell-unsafe chars from topic for filename (keep alphanumeric, spaces, hyphens)
   - Output path: `_bmad-output/planning-artifacts/{type}-{sanitized-topic}.md`
   - Session label: `{type}: {topic}` via sm.appendSessionInfo()

The output file is NOT written by the command itself — the BMAD agent in the new session produces it. The command only sets up the session with the right model and prompt.
  - Files: `src/commands/discovery-commands.ts`, `src/extension/index.ts`
  - Verify: npm test -- --grep 'discovery-commands'

- [x] **T03: Write integration tests for discovery commands** `est:45m`
  Write comprehensive tests for the discovery command handlers:

1. Create `tests/commands/discovery-commands.test.ts` with:
   - Mock ctx using the existing createMockCtx pattern from umb-commands.test.ts
   - Test handleBmadDiscovery with:
     - Valid config + valid model: verifies newSession called with correct setup (model change + user message)
     - No config file: shows error widget pointing to /umb model setup
     - Config exists but agent has no model assignment: shows error with available agents
     - Model not found in registry: shows error with provider/model info
     - Empty topic: shows usage hint
     - Topic with special chars: sanitizes correctly for filename
   - Test each thin wrapper (research, brief, prd, arch) calls shared handler with correct type
   - Test output path generation: verifies _bmad-output/planning-artifacts/{type}-{topic}.md format
   - Test model string parsing edge cases from T01 (no slash, multiple slashes)

2. Verify all tests pass: `npm test -- --grep 'discovery'`

3. Run full test suite to confirm no regressions: `npm test:run`
  - Files: `tests/commands/discovery-commands.test.ts`
  - Verify: npm test -- --grep 'discovery' && npm test:run

## Files Likely Touched

- src/commands/discovery-types.ts
- tests/commands/discovery-types.test.ts
- src/commands/discovery-commands.ts
- src/extension/index.ts
- tests/commands/discovery-commands.test.ts

---
estimated_steps: 23
estimated_files: 2
skills_used: []
---

# T02: Implement discovery command handlers with session delegation

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

## Inputs

- `src/commands/discovery-types.ts`
- `src/model-config/loader.ts`
- `src/model-config/types.ts`
- `src/commands/bmad-commands.ts`
- `src/extension/index.ts`

## Expected Output

- `src/commands/discovery-commands.ts`
- `src/extension/index.ts`

## Verification

npm test -- --grep 'discovery-commands'

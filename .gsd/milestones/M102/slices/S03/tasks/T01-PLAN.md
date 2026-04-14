---
estimated_steps: 53
estimated_files: 2
skills_used: []
---

# T01: Implement /skill run handler with tests

Add the `/skill run` command that parses skill name + user message, validates the skill, resolves model routing, creates a new pi session with SKILL.md context injected, and sends the user's arguments as the first message. Includes comprehensive unit tests.

## Failure Modes

| Dependency | On error | On timeout | On malformed response |
|------------|----------|-----------|----------------------|
| `.opencode/skills/` directory | `scanSkillDirs` returns empty array, handler shows "skill not found" error widget | N/A (synchronous I/O) | N/A |
| `.umb/models.yaml` file | `loadModelConfig` returns `{ config: null }`, handler proceeds with current model (no crash) | N/A (synchronous I/O) | Parser returns null, falls back to no model routing |
| `ctx.modelRegistry.find()` | Returns undefined, handler shows "model not found" error widget with guidance | N/A (synchronous lookup) | N/A |
| `ctx.newSession()` | Catches exception, shows error widget with exception message | N/A (Promise-based, no timeout) | Returns `{ cancelled: true }`, handler shows cancellation warning |
| `readFileSync(skillMdPath)` | Catches exception, shows error widget | N/A (synchronous I/O) | N/A |

## Negative Tests

- **Malformed inputs**: Empty args, whitespace-only args, skill name with uppercase/special chars, quoted skill name with no message
- **Error paths**: Skill not found (no matching directory), skill found but invalid (fails validateSkill), model configured but not in registry, session creation throws exception
- **Boundary conditions**: Skill with empty SKILL.md body (only frontmatter), skill with very long description, model string without `/` separator

## Implementation steps

1. Add `handleSkillRun(args, ctx, pi)` to `src/commands/skill-commands.ts`:
   - Parse args: first token = skill name, rest = user message
   - Call `scanSkillDirs(skillsDir)` to find all skills
   - Find skill matching the name (exact match)
   - Call `validateSkill(skill)` to check compliance
   - Call `loadModelConfig(ctx.cwd)` to check for skill-specific model
   - If skill has model assignment: split `provider/modelId`, call `ctx.modelRegistry.find(provider, modelId)` to validate
   - Read full SKILL.md content via `readFileSync(skill.skillMdPath)`
   - Build the prompt: skill context header + full SKILL.md + user message
   - Call `ctx.newSession({ setup: async (sm) => { if model: sm.appendModelChange(provider, modelId); sm.appendSessionInfo(`skill: ${skillName}`); sm.appendMessage({ role: 'user', content: prompt, timestamp: Date.now() }); } })`
   - Check `result.cancelled` and show warning if true
   - Show success widget with skill name, model, and session status
   - Show error widgets for: no args, skill not found, invalid skill, model not in registry

2. Register the command in `registerSkillCommands()`:
   - `pi.registerCommand('skill run', { description: 'Run a skill: /skill run <name> <message>', handler: (args, ctx) => handleSkillRun(args, ctx, pi) })`
   - Capture `pi` in the closure (same pattern as discovery-commands)

3. Update `handleSkillHelp()` to include `/skill run` in the usage hint.

4. Add tests to `tests/commands/skill-commands.test.ts`:
   - Import `handleSkillRun` and add mock `pi` object with `sendUserMessage`, `setModel`, `setSessionName`
   - Test: shows usage hint when no args provided
   - Test: shows error widget when skill not found (lists available skills)
   - Test: shows error widget when skill is invalid (validation errors)
   - Test: creates new session with skill context when skill is valid (verify newSession called with correct setup)
   - Test: resolves model from .umb/models.yaml when skill has assignment (verify appendModelChange called)
   - Test: skips model change when no skill-specific model configured (verify appendModelChange NOT called)
   - Test: shows error widget when model not found in registry
   - Test: handles cancelled session (verify warning notification)
   - Test: reads full SKILL.md content and includes it in the session message
   - Test: strips quotes from skill name argument
   - Test: handles skill with extra frontmatter fields

## Key reference patterns

Follow `discovery-commands.ts` exactly for session creation:
```typescript
const result = await ctx.newSession({
  setup: async (sm) => {
    if (modelFound) sm.appendModelChange(provider, modelId);
    sm.appendSessionInfo(`skill: ${skillName}`);
    sm.appendMessage({ role: 'user', content: prompt, timestamp: Date.now() });
  },
});
if (result.cancelled) { /* warn */ }
```

Model lookup from config:
```typescript
const { config } = loadModelConfig(ctx.cwd);
const assignment = config?.assignments.find(a => a.agent === skillName);
if (assignment) {
  const [provider, modelId] = assignment.model.split('/');
  const model = ctx.modelRegistry.find(provider, modelId);
}
```

## Inputs

- ``src/commands/skill-commands.ts` — existing /skill list, /skill new, /skill help handlers and registration`
- ``src/skill-registry/index.ts` — scanSkillDirs, validateSkill exports`
- ``src/model-config/loader.ts` — loadModelConfig for model routing`
- ``src/commands/discovery-commands.ts` — reference pattern for ctx.newSession + sm.appendModelChange + sm.appendMessage`

## Expected Output

- ``src/commands/skill-commands.ts` — handleSkillRun() added, command registered, help text updated`
- ``tests/commands/skill-commands.test.ts` — 11+ new tests for /skill run covering all paths`

## Verification

npx vitest run tests/commands/skill-commands.test.ts

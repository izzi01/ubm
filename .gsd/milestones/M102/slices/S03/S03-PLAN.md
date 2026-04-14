# S03: /skill run

**Goal:** Implement `/skill run <name> <message>` command that looks up a skill from .opencode/skills/, resolves model routing from .umb/models.yaml, creates a new pi session with the skill's SKILL.md content loaded, and sends the user's message as the first turn.
**Demo:** User runs /skill run seo-mastery "topic" and a new session starts with skill loaded and correct model.

## Must-Haves

- `/skill run seo-mastery "organic dog food"` creates a new pi session with SKILL.md content injected and user message as first turn
- Model routing reads `skills:` section from `.umb/models.yaml` when present
- Falls back to current session model when no skill-specific config exists
- All error paths (no args, not found, invalid, model not in registry, cancelled) produce actionable widgets

## Threat Surface

- **Abuse**: Skill name is user-controlled and reaches `scanSkillDirs()` (filesystem read). No parameter injection risk since skill names are validated against `/^[a-z0-9-]+$/` before use. User message is passed to `sm.appendMessage()` — it's treated as a user message, not code execution, so no injection vector.
- **Data exposure**: SKILL.md content is public by design. Model config contains model identifiers (not API keys). No PII or secrets in the data flow.
- **Input trust**: Skill name is validated against directory scan results (exact match) — no path traversal possible since `scanSkillDirs` only returns subdirectory entries. Model strings from `.umb/models.yaml` are trusted (user-configured, not network-supplied).

## Requirement Impact

- **Requirements touched**: R003 (primary-user-loop)
- **Re-verify**: Existing `/skill list` and `/skill new` commands must still work after registration changes. Run `npx vitest run tests/commands/skill-commands.test.ts` to confirm no regressions.
- **Decisions revisited**: D005 (skills: section in models.yaml) — this is where the model routing is consumed; D006 (validation scope) — validateSkill is used as a gate before execution.

## Proof Level

- This slice proves: integration

## Integration Closure

- Upstream surfaces consumed: `src/skill-registry/` (scanSkillDirs, validateSkill), `src/model-config/loader.ts` (loadModelConfig), pi SDK ExtensionAPI (ctx.newSession, ctx.modelRegistry.find)
- New wiring: `handleSkillRun()` registered as `skill run` command, uses `ctx.newSession({ setup })` with `sm.appendModelChange()` + `sm.appendMessage()` to create sessions with skill context
- What remains: nothing — this is the final execution slice in M102

## Verification

- `npx vitest run tests/commands/skill-commands.test.ts` — all existing + new `/skill run` tests pass
- `npx vitest run tests/commands/` — no regressions in other command test files

## Observability / Diagnostics

- Console warnings from scanSkillDirs for skills without parseable frontmatter (inherited from S01)
- Widget notifications for all user-facing outcomes (success, error, cancelled)
- No new observability surfaces needed — follows existing command notification pattern

## Tasks

- [x] **T01: Implement /skill run handler with tests** `est:1.5h`
  Add the `/skill run` command that parses skill name + user message, validates the skill, resolves model routing, creates a new pi session with SKILL.md context injected, and sends the user's arguments as the first message. Includes comprehensive unit tests.

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
  - Files: `src/commands/skill-commands.ts`, `tests/commands/skill-commands.test.ts`
  - Verify: npx vitest run tests/commands/skill-commands.test.ts

## Files Likely Touched

- src/commands/skill-commands.ts
- tests/commands/skill-commands.test.ts

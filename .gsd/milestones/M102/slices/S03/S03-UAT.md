# S03: /skill run — UAT

**Milestone:** M102
**Written:** 2026-04-10T23:37:45.603Z


# S03: /skill run — UAT

**Milestone:** M102
**Written:** 2026-04-11

## UAT Type

- UAT mode: artifact-driven
- Why this mode is sufficient: The `/skill run` command is a CLI command with no persistent runtime. Correctness is fully verified through the test suite (33 skill-command tests) plus inspection of the registered command behavior. No server, no database mutation, no live network — all behavior is synchronous and deterministic.

## Preconditions

- Extension loaded with skill-registry and model-config modules
- At least one valid skill exists in `.opencode/skills/` (149 available from real skill corpus)
- pi SDK with ExtensionAPI providing `newSession()`, `modelRegistry`, and `ui` surfaces

## Smoke Test

Run `/skill run` with no arguments. A usage hint widget should appear listing the command syntax.

## Test Cases

### 1. Skill execution with model routing

1. Configure `.umb/models.yaml` with `skills:` section assigning a model to a skill (e.g., `seo-mastery: anthropic/claude-sonnet-4-20250514`)
2. Run `/skill run seo-mastery "organic dog food marketing"`
3. **Expected:** New session created. Skill's SKILL.md content is included in the first message. Model is changed to the configured provider/modelId via `appendModelChange()`. Success widget shows skill name and model.

### 2. Skill execution without model routing

1. Remove or omit `skills:` section from `.umb/models.yaml`
2. Run `/skill run seo-mastery "organic dog food marketing"`
3. **Expected:** New session created with SKILL.md content and user message. No model change applied (uses current session model). Success widget shows skill name.

### 3. Skill not found

1. Run `/skill run nonexistent-skill "some message"`
2. **Expected:** Error widget listing available skills. No session created.

### 4. Invalid skill (fails validation)

1. Create a skill directory with SKILL.md missing required `name` or `description` frontmatter
2. Run `/skill run <that-skill> "some message"`
3. **Expected:** Error widget showing validation errors (missing name/description). No session created.

### 5. Model not in registry

1. Configure `.umb/models.yaml` with `skills:` pointing to a non-existent model (e.g., `fake-provider/fake-model`)
2. Run `/skill run <configured-skill> "some message"`
3. **Expected:** Error widget indicating model not found. No session created.

### 6. Cancelled session

1. Run `/skill run seo-mastery "topic"` in a context where `ctx.newSession()` returns `cancelled: true`
2. **Expected:** Warning notification shown. No session active.

## Edge Cases

### Skill name with quotes

1. Run `/skill run "seo-mastery" "topic"`
2. **Expected:** Quotes stripped from skill name, skill found and executed normally.

### Skill with extra frontmatter fields

1. Use a skill SKILL.md with extra fields beyond name/description
2. Run `/skill run <that-skill> "topic"`
3. **Expected:** Extra fields ignored, skill loads and executes normally.

## Failure Signals

- `handleSkillRun` throws unhandled exception → indicates a bug in the handler (all paths should be covered by widget notifications)
- Tests fail → regression in skill-registry, model-config, or command registration
- `/skill list` or `/skill new` broken after S03 changes → regression in shared registration code

## Not Proven By This UAT

- Live pi session creation (tests mock `ctx.newSession()` — real session lifecycle requires running pi runtime)
- Actual model switching behavior with a live model provider
- Concurrent skill execution or session management under load
- SKILL.md content rendering in the actual pi chat UI

## Notes for Tester

- 14 unit tests comprehensively cover all handler paths — the UAT above validates the integration points that unit tests mock
- The `discovery-commands.ts` session creation pattern was followed exactly, so real session behavior should match existing `/bmad` command behavior
- Error messages include actionable context (available skills list, validation errors, missing model info)


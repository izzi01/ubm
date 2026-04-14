# S02: BMAD Discovery Commands — UAT

**Milestone:** M101
**Written:** 2026-04-10T22:08:12.701Z

# S02: BMAD Discovery Commands — UAT

**Milestone:** M101
**Written:** 2026-04-11

## UAT Type

- UAT mode: artifact-driven
- Why this mode is sufficient: Discovery commands are pure logic with no runtime server. Verification is through unit/integration tests that mock the pi SDK context. The commands produce no persistent output themselves — they delegate to agent sessions.

## Preconditions

- `.umb/models.yaml` exists with at least one agent model assignment (e.g., `agents: { analyst: 'openai/gpt-4o' }`)
- pi SDK context mock provides `newSession()`, `modelRegistry.find()`, `ui.notify()`, `ui.setWidget()`

## Smoke Test

Run `npx vitest run -t 'discovery'` — all 58 tests pass (27 discovery-types + 31 discovery-commands).

## Test Cases

### 1. Discovery type registry resolves all 4 commands

1. Call `resolveDiscovery('research', 'OAuth providers')` with a valid models.yaml containing `analyst: 'openai/gpt-4o'`
2. **Expected:** Returns resolved object with agent='analyst', modelString='openai/gpt-4o', parsedModel={provider:'openai', modelId:'gpt-4o'}, outputPath ending in `research-oauth-providers.md`

### 2. Missing model config produces actionable error

1. Call `handleBmadDiscovery('research', ['OAuth'], ctx)` with no .umb/models.yaml file
2. **Expected:** Error widget displayed with message directing user to run `/umb model` to configure

### 3. Agent without model assignment shows available agents

1. Configure models.yaml with only `analyst: 'openai/gpt-4o'`
2. Call `handleBmadDiscovery('arch', ['System design'], ctx)`
3. **Expected:** Error widget showing that 'architect' has no model assigned, listing available agents

### 4. Model not in registry shows provider/model info

1. Configure models.yaml with `analyst: 'nonsense/fake-model'`
2. Mock `ctx.modelRegistry.find('nonsense', 'fake-model')` to return undefined
2. Call `handleBmadDiscovery('research', ['test'], ctx)`
3. **Expected:** Error widget indicating model 'nonsense/fake-model' not found in registry

### 5. All 4 thin wrappers delegate correctly

1. Call handleBmadResearch, handleBmadBrief, handleBmadPrd, handleBmadArch with valid args
2. **Expected:** Each calls handleBmadDiscovery with correct command type ('research', 'brief', 'prd', 'arch')

### 6. Topic sanitization for filenames

1. Call resolveDiscovery with topic containing special chars: 'OAuth 2.0 / OpenID Connect (OIDC)'
2. **Expected:** Output path uses sanitized filename `research-oauth-2-0-openid-connect-oidc.md`

### 7. Model string parsing edge cases

1. Parse 'openai/gpt-4o' → {provider:'openai', modelId:'gpt-4o'}
2. Parse 'local-model' (no slash) → {provider:'', modelId:'local-model'}
3. Parse 'provider/path/model' (multiple slashes) → {provider:'provider', modelId:'path/model'}

## Edge Cases

### Empty topic
1. Call handleBmadDiscovery('research', [], ctx)
2. **Expected:** Shows usage hint widget, does not create session

### Tier preset fallback
1. Delete .umb/models.yaml
2. Set tier to 'standard' in config
3. resolveDiscovery should still return model from tier defaults
4. **Expected:** Warning included in resolved discovery about using tier defaults

## Failure Signals

- `npx vitest run -t 'discovery'` returns non-zero exit code
- TypeScript compilation errors in discovery-types.ts or discovery-commands.ts
- Import errors from src/extension/index.ts failing to resolve registerDiscoveryCommands

## Not Proven By This UAT

- Live session creation with actual LLM models (requires running pi SDK)
- Actual BMAD agent YAML loading and prompt assembly (mocked in tests)
- File output by the delegated agent session (agent produces the file, not the command)

## Notes for Tester

- The verification gate used `npm test -- --grep 'discovery'` which fails because this project uses Vitest, not Jest. Use `npx vitest run -t 'discovery'` instead.
- 2 pre-existing test failures exist in background-manager.test.ts and renderer-summaries.test.ts — these are unrelated to S02.
- The commands do NOT write output files themselves — they set up sessions where the BMAD agent produces the output.

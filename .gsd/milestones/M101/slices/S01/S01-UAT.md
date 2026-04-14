# S01: Model Configuration System — UAT

**Milestone:** M101
**Written:** 2026-04-10T22:01:49.140Z

# S01: Model Configuration System — UAT

**Milestone:** M101
**Written:** 2026-04-11

## UAT Type

- UAT mode: artifact-driven
- Why this mode is sufficient: This slice delivers config parsing, validation, and a display command — no runtime server or live system to test against. Correctness is fully verified through the test suite.

## Preconditions

- Node.js installed, `npm install` has been run
- Working directory is the project root

## Smoke Test

Run `npm run test:run -- tests/model-config/loader.test.ts tests/commands/umb-commands.test.ts` — all 33 tests should pass.

## Test Cases

### 1. Loader reads and validates a valid config

1. Create a temp `.umb/models.yaml` with `tier: standard` and an agent override
2. Call `loadModelConfig(tempDir)`
3. **Expected:** Returns ValidatedModelConfig with tier defaults merged, user override wins for the specified agent, no errors

### 2. Tier preset applies all defaults

1. Create `.umb/models.yaml` with only `tier: premium`
2. Call `loadModelConfig()`
3. **Expected:** All 20 known agents have model assignments from the premium tier preset

### 3. Missing config file returns null gracefully

1. Call `loadModelConfig('/nonexistent/path')`
2. **Expected:** Returns `{ config: null, warnings: [], errors: [] }` — no crash

### 4. Unknown agent produces warning, not error

1. Create `.umb/models.yaml` with an unrecognized agent name under `agents:`
2. Call `loadModelConfig()`
3. **Expected:** Config is returned, warnings array contains a message about the unknown agent, errors array is empty

### 5. /umb model displays resolved configuration

1. Create a temp dir with `.umb/models.yaml` containing `tier: budget`
2. Call `handleUmbModel({}, createMockCtx(tempDir))`
3. **Expected:** Widget output contains "Model Configuration", "budget" badge, and agent→model table entries

### 6. /umb model shows helpful message when no config exists

1. Call `handleUmbModel({}, createMockCtx('/nonexistent'))`
2. **Expected:** Widget output contains guidance about creating `.umb/models.yaml`

## Edge Cases

### Empty YAML file

1. Create `.umb/models.yaml` with empty content
2. Call `loadModelConfig()`
3. **Expected:** Warning about no model assignments, no crash

### Invalid YAML syntax

1. Create `.umb/models.yaml` with malformed content (e.g., unparseable lines)
2. Call `loadModelConfig()`
3. **Expected:** Errors array contains YAML parse error, config is null

## Failure Signals

- Any test failure in `tests/model-config/loader.test.ts` or `tests/commands/umb-commands.test.ts`
- TypeScript compilation errors in `src/model-config/` or `src/commands/umb-commands.ts`

## Not Proven By This UAT

- Runtime behavior in a live pi extension session (requires pi runtime)
- Actual model routing to BMAD agents (S02 concern)
- Provider-side model string validation (explicitly out of scope)

## Notes for Tester

- The 6 failing tests in `background-manager.test.ts` are pre-existing timing issues unrelated to this slice
- No external dependencies were added — the YAML parser is custom and dependency-free
- Tier presets are sourced from real model assignments in `opencode-config/` directories

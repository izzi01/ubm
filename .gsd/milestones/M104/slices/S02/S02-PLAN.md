# S02: Wire umb commands in the TUI

**Goal:** Ensure the umb extension loads at runtime without errors, all commands register correctly, and each command handler produces correct output with a mock context. Fix missing files and broken imports left by S01.
**Demo:** /umb model shows model config, /skill list shows 149 skills, /skill new test-skill works, /skill run creates a session

## Must-Haves

- All umb extension source files compile without MODULE_NOT_FOUND or TypeScript syntax errors\n- `node scripts/compile-tests.mjs` succeeds\n- All smoke tests in `dist-test/src/resources/extensions/umb/tests/*.test.js` pass\n- `/umb model` handler produces correct widget output for valid and missing configs\n- `/skill list` handler indexes skills and shows valid/invalid status\n- `/skill new` handler creates valid skill directories with SKILL.md\n- `/skill run` handler creates sessions with skill context and model routing\n- `/bmad discovery` handlers delegate to correct agents with model resolution

## Proof Level

- This slice proves: integration

## Integration Closure

- Upstream surfaces consumed: S01 provided all ported source files in `src/resources/extensions/umb/` with `@gsd/pi-coding-agent` imports\n- New wiring introduced: missing `auto/` module ported, broken import in `gsd-commands.ts` fixed, smoke tests proving command handlers work\n- What remains: S03 will port the full test suite (all original iz-to-mo-vu Vitest tests converted to Node test runner)

## Verification

- None — this slice fixes broken imports and adds tests, no runtime behavior changes beyond fixing what was broken

## Tasks

- [x] **T01: Port missing auto/ module and fix broken imports** `est:45m`
  ## Why
S01 ported the extension source files but the tsconfig excludes `src/resources/`, so `tsc --noEmit` never validated the extension code. Two problems exist:

1. The `auto/` directory (4 files) is missing — `auto-state.ts`, `dispatcher.ts`, `renderer.ts`, `types.ts` — needed by `state-machine/index.ts`, `tools/gsd-tools.ts`, and `commands/gsd-commands.ts`.
2. `commands/gsd-commands.ts` imports `getGsdEngine` from `../extension/index.js` but the actual module is at `../index.ts` (the extension entry point).

## Steps
1. Copy 4 files from `/home/cid/projects-personal/iz-to-mo-vu/src/auto/` to `src/resources/extensions/umb/auto/`:
   - `auto-state.ts`
   - `dispatcher.ts`
   - `renderer.ts`
   - `types.ts`
2. Verify imports in copied files resolve correctly (they use relative paths like `../state-machine/index.js` and `../db/types.js` which exist in the fork).
3. Fix the import in `commands/gsd-commands.ts` line 17: change `from "../extension/index.js"` to `from "../index.js"`.
4. Run `node scripts/compile-tests.mjs` to compile all source to `dist-test/`.
5. Verify the extension module loads at runtime by running a quick smoke import from `dist-test/`:
   ```
   node -e "import('./dist-test/src/resources/extensions/umb/index.js').then(() => console.log('OK')).catch(e => console.error(e.message))"
   ```
   Note: This may fail because the extension calls `createGsdEngine('.gsd/gsd.db')` at load time — if so, that's expected. The key is that import resolution succeeds (no MODULE_NOT_FOUND errors). If better-sqlite3 fails, that's a runtime concern for T02.
6. Run `npx tsc --noEmit --project tsconfig.resources.json` or equivalent to verify the extension code type-checks. If no separate tsconfig exists for resources, create a temporary one or use `grep -r '@mariozechner' src/resources/extensions/umb/` to confirm zero stale imports remain.
  - Files: `src/resources/extensions/umb/auto/auto-state.ts`, `src/resources/extensions/umb/auto/dispatcher.ts`, `src/resources/extensions/umb/auto/renderer.ts`, `src/resources/extensions/umb/auto/types.ts`, `src/resources/extensions/umb/commands/gsd-commands.ts`
  - Verify: 1. `test -d src/resources/extensions/umb/auto/` returns 0
2. `test -f src/resources/extensions/umb/auto/auto-state.ts && test -f src/resources/extensions/umb/auto/dispatcher.ts && test -f src/resources/extensions/umb/auto/renderer.ts && test -f src/resources/extensions/umb/auto/types.ts` returns 0
3. `grep -q 'from "../index.js"' src/resources/extensions/umb/commands/gsd-commands.ts` returns 0
4. `! grep -q 'from "../extension/index.js"' src/resources/extensions/umb/commands/gsd-commands.ts` returns 0
5. `grep -rq '@mariozechner' src/resources/extensions/umb/` returns non-zero (zero stale imports)
6. `node scripts/compile-tests.mjs` succeeds (exit 0)

- [x] **T02: Write smoke tests for model-config, umb commands, and skill list/new** `est:1h`
  ## Why
The extension code was ported but never tested in the fork context. We need smoke tests to verify the data layer (model-config, skill-registry) and the simple command handlers (umb model, skill list, skill new) work correctly.

## Steps
1. Create `src/resources/extensions/umb/tests/` directory.
2. Create `src/resources/extensions/umb/tests/model-config.test.ts` using Node's built-in test runner (`import test from 'node:test'`, `import assert from 'node:assert/strict'`). Tests:
   - `parseSimpleYaml` parses tier, agents block, skills block
   - `parseSimpleYaml` returns null for empty/invalid input
   - `loadModelConfig` returns null config when no file exists
   - `loadModelConfig` returns resolved config with tier defaults and user overrides
   - `loadModelConfig` handles malformed YAML gracefully
   Follow the pattern from `src/resources/extensions/gsd/tests/commands-logs.test.ts` (create temp dirs, write config files, cleanup in `after()`).
3. Create `src/resources/extensions/umb/tests/umb-commands.test.ts`. Tests:
   - `handleUmbHelp` shows usage widget with /umb model hint
   - `handleUmbModel` shows error widget when no config file exists
   - `handleUmbModel` shows config widget with tier badge and agent assignments
   - `handleUmbModel` shows warnings for unknown agents
   Create a mock context: `{ ui: { notify: fn(), setWidget: fn() }, cwd: testDir }`.
4. Create `src/resources/extensions/umb/tests/skill-commands.test.ts` (list and new only). Tests:
   - `handleSkillHelp` shows usage widget with list, new, run hints
   - `handleSkillList` shows warning when no skills directory
   - `handleSkillList` displays valid skills with checkmarks
   - `handleSkillList` marks invalid skills with errors
   - `handleSkillNew` creates skill directory with SKILL.md
   - `handleSkillNew` rejects invalid names
   - `handleSkillNew` rejects duplicate names
   Use temp directories for test isolation.
5. Run `node scripts/compile-tests.mjs` then `node --test dist-test/src/resources/extensions/umb/tests/model-config.test.js dist-test/src/resources/extensions/umb/tests/umb-commands.test.js dist-test/src/resources/extensions/umb/tests/skill-commands.test.js` to verify all tests pass.
  - Files: `src/resources/extensions/umb/tests/model-config.test.ts`, `src/resources/extensions/umb/tests/umb-commands.test.ts`, `src/resources/extensions/umb/tests/skill-commands.test.ts`
  - Verify: ```bash
node scripts/compile-tests.mjs && node --test dist-test/src/resources/extensions/umb/tests/model-config.test.js dist-test/src/resources/extensions/umb/tests/umb-commands.test.js dist-test/src/resources/extensions/umb/tests/skill-commands.test.js
```
All tests must pass (exit 0).

- [x] **T03: Write smoke tests for skill run and discovery commands** `est:1h`
  ## Why
The `/skill run` and `/bmad discovery` commands are the most complex handlers — they resolve models, create sessions, and handle errors. These need dedicated smoke tests to verify the integration points work correctly.

## Steps
1. Create `src/resources/extensions/umb/tests/skill-run.test.ts`. Tests:
   - Shows usage hint when no args
   - Shows usage hint when only skill name (no message)
   - Shows error widget when skill not found
   - Shows error widget when skill is invalid
   - Creates session with skill context when skill is valid
   - Session setup includes skill context in the message
   - Resolves model from .umb/models.yaml when skill has assignment
   - Skips model change when no skill-specific model configured
   - Shows error when model not found in registry
   - Handles cancelled session
   - Shows error for model string without / separator
   - Handles session creation throwing exception
   Mock context must include: `modelRegistry: { find: fn() }`, `newSession: fn()`, `ui: { notify: fn(), setWidget: fn() }`. Follow the pattern from the original `tests/commands/skill-commands.test.ts` in iz-to-mo-vu.
2. Create `src/resources/extensions/umb/tests/discovery-commands.test.ts`. Tests for `/bmad research`, `/bmad brief`, `/bmad prd`, `/bmad arch`:
   - Shows usage hint when no topic
   - Shows no-model error when agent has no assignment
   - Shows model-not-found error when model missing from registry
   - Creates session with correct model and prompt when configured
   - Session setup includes agent context
   Also test `resolveDiscovery()` and `parseModelString()` from `discovery-types.ts`:
   - parseModelString splits provider/modelId correctly
   - parseModelString handles no-slash case
   - resolveDiscovery returns correct agent, output path, and prompt
3. Run `node scripts/compile-tests.mjs` then `node --test dist-test/src/resources/extensions/umb/tests/skill-run.test.js dist-test/src/resources/extensions/umb/tests/discovery-commands.test.js` to verify all tests pass.
4. Final verification: run ALL umb tests together:
   ```
   node --test dist-test/src/resources/extensions/umb/tests/*.test.js
   ```
   All must pass.
  - Files: `src/resources/extensions/umb/tests/skill-run.test.ts`, `src/resources/extensions/umb/tests/discovery-commands.test.ts`
  - Verify: ```bash
node scripts/compile-tests.mjs && node --test dist-test/src/resources/extensions/umb/tests/skill-run.test.js dist-test/src/resources/extensions/umb/tests/discovery-commands.test.js && node --test dist-test/src/resources/extensions/umb/tests/*.test.js
```
All tests must pass (exit 0).

## Files Likely Touched

- src/resources/extensions/umb/auto/auto-state.ts
- src/resources/extensions/umb/auto/dispatcher.ts
- src/resources/extensions/umb/auto/renderer.ts
- src/resources/extensions/umb/auto/types.ts
- src/resources/extensions/umb/commands/gsd-commands.ts
- src/resources/extensions/umb/tests/model-config.test.ts
- src/resources/extensions/umb/tests/umb-commands.test.ts
- src/resources/extensions/umb/tests/skill-commands.test.ts
- src/resources/extensions/umb/tests/skill-run.test.ts
- src/resources/extensions/umb/tests/discovery-commands.test.ts

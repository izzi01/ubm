---
estimated_steps: 27
estimated_files: 3
skills_used: []
---

# T02: Write smoke tests for model-config, umb commands, and skill list/new

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

## Inputs

- `src/resources/extensions/umb/model-config/loader.ts`
- `src/resources/extensions/umb/model-config/types.ts`
- `src/resources/extensions/umb/commands/umb-commands.ts`
- `src/resources/extensions/umb/commands/skill-commands.ts`
- `src/resources/extensions/umb/skill-registry/scanner.ts`
- `src/resources/extensions/umb/skill-registry/validator.ts`
- `src/resources/extensions/gsd/tests/commands-logs.test.ts`

## Expected Output

- `src/resources/extensions/umb/tests/model-config.test.ts`
- `src/resources/extensions/umb/tests/umb-commands.test.ts`
- `src/resources/extensions/umb/tests/skill-commands.test.ts`

## Verification

```bash
node scripts/compile-tests.mjs && node --test dist-test/src/resources/extensions/umb/tests/model-config.test.js dist-test/src/resources/extensions/umb/tests/umb-commands.test.js dist-test/src/resources/extensions/umb/tests/skill-commands.test.js
```
All tests must pass (exit 0).

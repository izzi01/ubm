---
estimated_steps: 33
estimated_files: 2
skills_used: []
---

# T03: Write smoke tests for skill run and discovery commands

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

## Inputs

- `src/resources/extensions/umb/commands/skill-commands.ts`
- `src/resources/extensions/umb/commands/discovery-commands.ts`
- `src/resources/extensions/umb/commands/discovery-types.ts`
- `src/resources/extensions/umb/model-config/loader.ts`
- `/home/cid/projects-personal/iz-to-mo-vu/tests/commands/skill-commands.test.ts`
- `/home/cid/projects-personal/iz-to-mo-vu/tests/commands/discovery-commands.test.ts`

## Expected Output

- `src/resources/extensions/umb/tests/skill-run.test.ts`
- `src/resources/extensions/umb/tests/discovery-commands.test.ts`

## Verification

```bash
node scripts/compile-tests.mjs && node --test dist-test/src/resources/extensions/umb/tests/skill-run.test.js dist-test/src/resources/extensions/umb/tests/discovery-commands.test.js && node --test dist-test/src/resources/extensions/umb/tests/*.test.js
```
All tests must pass (exit 0).

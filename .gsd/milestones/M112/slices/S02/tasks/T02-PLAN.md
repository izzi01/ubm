---
estimated_steps: 21
estimated_files: 3
skills_used: []
---

# T02: Wire /bmad run command and write tests

Add the /bmad run command handler and comprehensive tests.

1. Add handleBmadRun(args, ctx, pi) to bmad-commands.ts:
   - Parse args: first token = skill name (fuzzy match supported), rest = user message
   - Use findBmadSkills() from bmad-executor to locate the skill
   - Support fuzzy matching (e.g. 'product-brief' matches 'bmad-product-brief', 'analyst' matches 'bmad-agent-analyst')
   - Load skill via loadBmadSkill(), resolve config via resolveBmadConfig()
   - Compose execution prompt via composeExecutionPrompt()
   - Create session via ctx.newSession() with the composed prompt (reuse handleSkillRun pattern)
   - Show success/error widgets via ctx.ui

2. Add /bmad skills subcommand to list available BMAD skills (non-agent skills)

3. Register commands: /bmad run, /bmad skills

4. Write tests in src/resources/extensions/umb/tests/bmad-executor.test.ts:
   - findBmadSkills() discovers skills from _bmad/bmm/ and _bmad/core/
   - loadBmadSkill() loads a skill with its prompts and manifest
   - resolveBmadConfig() parses config.yaml and resolves template variables
   - composeExecutionPrompt() builds correct prompt structure
   - Error handling: skill not found, missing SKILL.md, missing config
   - handleBmadRun() creates session with correct prompt
   - handleBmadRun() handles skill not found, missing message

Use the createMockCtx() and createTestDir() patterns from skill-run.test.ts. Build test fixtures using real _bmad/ structure (minimal: one skill with SKILL.md, one prompt file, config.yaml).

5. Export new functions from commands/index.ts barrel

## Inputs

- `src/resources/extensions/umb/bmad-executor/loader.ts`
- `src/resources/extensions/umb/bmad-executor/types.ts`
- `src/resources/extensions/umb/commands/bmad-commands.ts`
- `src/resources/extensions/umb/tests/skill-run.test.ts`

## Expected Output

- `src/resources/extensions/umb/commands/bmad-commands.ts`
- `src/resources/extensions/umb/commands/index.ts`
- `src/resources/extensions/umb/tests/bmad-executor.test.ts`

## Verification

node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/resources/extensions/umb/tests/bmad-executor.test.ts

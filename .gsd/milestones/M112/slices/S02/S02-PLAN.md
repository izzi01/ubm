# S02: Build BMAD skill execution engine (loader, executor, pipeline)

**Goal:** Build the BMAD skill execution engine that can load a BMAD skill from _bmad/, resolve its config template variables, compose a full prompt with all stage prompts and agent definitions, and execute it in a new pi session via /bmad run.
**Demo:** `/bmad run bmad-product-brief 'OAuth provider'` loads the analyst agent, runs the product brief workflow stages, and produces a brief artifact in `_bmad-output/`

## Must-Haves

- /bmad run bmad-product-brief 'OAuth provider' creates a new session with the full product brief skill context (SKILL.md + all stage prompts + config-resolved variables + user message)\n- /bmad run handles skill not found gracefully\n- /bmad skills lists all 35 non-agent BMAD skills\n- findBmadSkills() discovers skills from both _bmad/bmm/ and _bmad/core/\n- loadBmadSkill() loads SKILL.md content, discovers prompts/*.md, reads bmad-manifest.json\n- resolveBmadConfig() parses config.yaml and resolves {project-root} and other template variables\n- All tests pass

## Proof Level

- This slice proves: integration

## Integration Closure

- Upstream surfaces consumed: _bmad/bmm/config.yaml (config resolution), _bmad/bmm/{phase}/{skill}/SKILL.md (skill discovery), existing findBmadAgents() path pattern from S01\n- New wiring: /bmad run command registered in pi extension system, bmad-executor module connected to bmad-commands.ts\n- What remains: nothing — the demo command /bmad run bmad-product-brief 'OAuth provider' will work end-to-end after this slice

## Verification

- Runtime signals: ctx.ui.notify() + ctx.ui.setWidget() for command output (consistent with existing pattern)\n- Failure visibility: widget shows specific error (skill not found, missing message, session creation failure)

## Tasks

- [x] **T01: Build BMAD skill loader module** `est:45m`
  Create a bmad-executor/ module with types, loader, and prompt composition logic.

The loader must:
1. Scan _bmad/bmm/ and _bmad/core/ for skill directories containing SKILL.md
2. Parse the skill's YAML frontmatter (name, description) and detect stage prompts (prompts/*.md) and agent definitions (agents/*.md)
3. Read _bmad/bmm/config.yaml and resolve template variables ({user_name}, {communication_language}, {document_output_language}, {planning_artifacts}, {project_knowledge}, {project-root})
4. Compose a full execution prompt: skill SKILL.md content + all stage prompt files + config-resolved variables + user message
5. Parse bmad-manifest.json if present for metadata

Files to create:
- src/resources/extensions/umb/bmad-executor/types.ts — BmadSkillInfo, BmadConfig, BmadExecutionPlan interfaces
- src/resources/extensions/umb/bmad-executor/loader.ts — findBmadSkills(), loadBmadSkill(), resolveBmadConfig(), composeExecutionPrompt()
- src/resources/extensions/umb/bmad-executor/index.ts — barrel exports

Reuse patterns from skill-registry/ (simple YAML parsing, synchronous fs). Do NOT use any YAML library — extend the existing extractSimpleFrontmatter() or parseSimpleYaml() approach.

Key design decisions:
- findBmadSkills() walks _bmad/bmm/{phase}/ and _bmad/core/ for directories with SKILL.md
- loadBmadSkill(skillName) finds the skill, reads SKILL.md, discovers prompts/*.md and agents/*.md subdirectories, reads bmad-manifest.json if present
- resolveBmadConfig(cwd) reads _bmad/bmm/config.yaml and returns key-value pairs
- composeExecutionPrompt(skill, config, userMessage) builds the full prompt for session creation
- All functions are synchronous (consistent with existing skill-registry pattern)
- Template resolution replaces {project-root} with cwd, other {vars} from config.yaml
  - Files: `src/resources/extensions/umb/bmad-executor/types.ts`, `src/resources/extensions/umb/bmad-executor/loader.ts`, `src/resources/extensions/umb/bmad-executor/index.ts`
  - Verify: npx vitest run tests/bmad-executor.test.ts (or manual: grep -q 'composeExecutionPrompt' src/resources/extensions/umb/bmad-executor/loader.ts)

- [x] **T02: Wire /bmad run command and write tests** `est:1h`
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
  - Files: `src/resources/extensions/umb/commands/bmad-commands.ts`, `src/resources/extensions/umb/commands/index.ts`, `src/resources/extensions/umb/tests/bmad-executor.test.ts`
  - Verify: node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/resources/extensions/umb/tests/bmad-executor.test.ts

## Files Likely Touched

- src/resources/extensions/umb/bmad-executor/types.ts
- src/resources/extensions/umb/bmad-executor/loader.ts
- src/resources/extensions/umb/bmad-executor/index.ts
- src/resources/extensions/umb/commands/bmad-commands.ts
- src/resources/extensions/umb/commands/index.ts
- src/resources/extensions/umb/tests/bmad-executor.test.ts

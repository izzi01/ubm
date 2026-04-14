---
estimated_steps: 19
estimated_files: 3
skills_used: []
---

# T01: Build BMAD skill loader module

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

## Inputs

- `_bmad/bmm/config.yaml`
- `_bmad/bmm/1-analysis/bmad-product-brief/SKILL.md`
- `_bmad/bmm/1-analysis/bmad-product-brief/prompts/contextual-discovery.md`
- `_bmad/bmm/1-analysis/bmad-product-brief/bmad-manifest.json`
- `_bmad/_config/agent-manifest.csv`
- `src/resources/extensions/umb/commands/bmad-commands.ts`
- `src/resources/extensions/umb/skill-registry/scanner.ts`

## Expected Output

- `src/resources/extensions/umb/bmad-executor/types.ts`
- `src/resources/extensions/umb/bmad-executor/loader.ts`
- `src/resources/extensions/umb/bmad-executor/index.ts`

## Verification

npx vitest run tests/bmad-executor.test.ts (or manual: grep -q 'composeExecutionPrompt' src/resources/extensions/umb/bmad-executor/loader.ts)

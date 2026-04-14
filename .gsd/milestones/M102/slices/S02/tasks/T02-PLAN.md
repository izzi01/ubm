---
estimated_steps: 1
estimated_files: 2
skills_used: []
---

# T02: Implement /skill new command

Create the /skill new slash command that accepts a name and description, validates the name format (lowercase alphanumeric + hyphen), creates a directory under .opencode/skills/{name}/ with a SKILL.md template following the Agent Skills Spec, then validates the created skill using validateSkill(). Follow the same handler + registration pattern as other commands.

## Inputs

- ``src/skill-registry/index.ts``
- ``src/skill-registry/validator.ts``
- ``src/commands/skill-commands.ts``

## Expected Output

- ``src/commands/skill-commands.ts``
- ``tests/commands/skill-commands.test.ts``

## Verification

npx vitest run tests/commands/skill-commands.test.ts

---
estimated_steps: 1
estimated_files: 3
skills_used: []
---

# T01: Implement /skill list command

Create the /skill list slash command that scans .opencode/skills/ using scanSkillDirs() from S01's skill-registry module and displays all indexed skills in a formatted widget. Follow the exact same handler + registration pattern as /umb model in umb-commands.ts and /gsd status in gsd-commands.ts.

## Inputs

- ``src/skill-registry/index.ts``
- ``src/commands/umb-commands.ts``
- ``src/extension/index.ts``

## Expected Output

- ``src/commands/skill-commands.ts``
- ``tests/commands/skill-commands.test.ts``
- ``src/extension/index.ts``

## Verification

npx vitest run tests/commands/skill-commands.test.ts

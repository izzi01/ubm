# S02: /skill list + /skill new

**Goal:** User runs /skill list and sees all indexed skills from .opencode/skills/. User runs /skill new my-skill "description" and a valid skill directory is created following the Agent Skills Spec.
**Demo:** User runs /skill list and sees all indexed skills. /skill new my-skill "desc" creates a valid skill directory.

## Must-Haves

- /skill list shows all indexed skills with name and description\n- /skill new my-skill "A description" creates .opencode/skills/my-skill/SKILL.md with valid frontmatter\n- Invalid names rejected with clear error message\n- Both commands use scanSkillDirs/validateSkill from skill-registry module

## Proof Level

- This slice proves: contract

## Integration Closure

- Upstream surfaces consumed: scanSkillDirs(), parseSkillMd(), validateSkill() from src/skill-registry/\n- New wiring: skill-commands.ts registered in extension/index.ts via registerSkillCommands(pi)\n- What remains before milestone is usable: S03 needs to wire the CLI execution path for skill loading

## Verification

- Not provided.

## Tasks

- [x] **T01: Implement /skill list command** `est:30m`
  Create the /skill list slash command that scans .opencode/skills/ using scanSkillDirs() from S01's skill-registry module and displays all indexed skills in a formatted widget. Follow the exact same handler + registration pattern as /umb model in umb-commands.ts and /gsd status in gsd-commands.ts.
  - Files: `src/commands/skill-commands.ts`, `src/extension/index.ts`, `tests/commands/skill-commands.test.ts`
  - Verify: npx vitest run tests/commands/skill-commands.test.ts

- [x] **T02: Implement /skill new command** `est:30m`
  Create the /skill new slash command that accepts a name and description, validates the name format (lowercase alphanumeric + hyphen), creates a directory under .opencode/skills/{name}/ with a SKILL.md template following the Agent Skills Spec, then validates the created skill using validateSkill(). Follow the same handler + registration pattern as other commands.
  - Files: `src/commands/skill-commands.ts`, `tests/commands/skill-commands.test.ts`
  - Verify: npx vitest run tests/commands/skill-commands.test.ts

## Files Likely Touched

- src/commands/skill-commands.ts
- src/extension/index.ts
- tests/commands/skill-commands.test.ts

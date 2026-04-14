# S01: Skill install from git URL

**Goal:** Implement /skill install <git-url> that clones a git repo, discovers skill directories inside it, validates them against the Skills Spec, copies them to .opencode/skills/, and displays a success widget.
**Demo:** /skill install <git-url> clones repo, validates skill, copies to .opencode/skills/, shows success widget

## Must-Haves

- /skill install <git-url> clones repo to temp dir, scans for skills, validates, copies valid ones to .opencode/skills/, cleans up temp dir, shows success widget\n- Invalid git URLs show clear error messages\n- Repos with no valid skills show helpful error\n- Existing skill names are rejected (no overwrite)\n- git clone failures are caught and reported\n- All existing /skill commands continue to work (no regressions)\n- 10+ new tests covering install paths

## Proof Level

- This slice proves: contract

## Integration Closure

- Upstream surfaces consumed: scanSkillDirs(), validateSkill() from skill-registry, existing command registration pattern from skill-commands.ts\n- New wiring: gitInstallSkill() utility in skill-registry/installer.ts, handleSkillInstall() in skill-commands.ts, registered as 'skill install'\n- What remains before milestone is usable: S02 (/skill remove + help update) — this slice delivers install only

## Verification

- Signals added: console.warn for git clone failures, invalid repos, name conflicts\n- How inspected: /skill list after install shows newly installed skills; widget shows result\n- Failure state: error widget with specific failure reason (clone fail, no skills found, validation errors, name conflict)

## Tasks

- [x] **T01: Implement /skill install command with git clone, validation, and copy** `est:2h`
  Add a gitInstallSkill() utility and handleSkillInstall() command handler. The flow: parse git URL → git clone to temp dir → scan for skill dirs → validate each → copy valid ones to .opencode/skills/ → clean up temp dir → show widget. Register the command as 'skill install'. Write comprehensive tests.
  - Files: `src/skill-registry/installer.ts`, `src/skill-registry/index.ts`, `src/commands/skill-commands.ts`, `tests/skill-registry/installer.test.ts`, `tests/commands/skill-commands.test.ts`
  - Verify: npx vitest run tests/skill-registry/installer.test.ts tests/commands/skill-commands.test.ts

## Files Likely Touched

- src/skill-registry/installer.ts
- src/skill-registry/index.ts
- src/commands/skill-commands.ts
- tests/skill-registry/installer.test.ts
- tests/commands/skill-commands.test.ts

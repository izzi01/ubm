# Requirements

This file is the explicit capability and coverage contract for the project.

## Active

### R023 — GSD planning artifacts (milestones/*.md, PROJECT.md, DECISIONS.md, REQUIREMENTS.md, QUEUE.md, OVERRIDES.md, KNOWLEDGE.md) are tracked in git so they travel with branches. Runtime files (gsd.db, STATE.md, runtime/, activity/, worktrees/, metrics.json, completed-units.json) remain gitignored.
- Class: architectural
- Status: active
- Description: GSD planning artifacts (milestones/*.md, PROJECT.md, DECISIONS.md, REQUIREMENTS.md, QUEUE.md, OVERRIDES.md, KNOWLEDGE.md) are tracked in git so they travel with branches. Runtime files (gsd.db, STATE.md, runtime/, activity/, worktrees/, metrics.json, completed-units.json) remain gitignored.
- Why it matters: Eliminates the worktree sync layer — the root cause of most worktree bugs. With artifacts tracked in git, `git worktree add` and `git checkout` give correct state automatically, removing ~500 lines of file-copying code.
- Source: PRD-branchless-worktree-architecture
- Primary owning slice: M113/S01

### R024 — The worktree sync layer (syncProjectRootToWorktree, syncStateToProjectRoot, syncGsdStateToWorktree, syncWorktreeStateBack, copyPlanningArtifacts) is fully removed. All production callers and dependency injection sites are cleaned up. Worktrees receive correct state via git, not filesystem copying.
- Class: architectural
- Status: active
- Description: The worktree sync layer (syncProjectRootToWorktree, syncStateToProjectRoot, syncGsdStateToWorktree, syncWorktreeStateBack, copyPlanningArtifacts) is fully removed. All production callers and dependency injection sites are cleaned up. Worktrees receive correct state via git, not filesystem copying.
- Why it matters: The sync layer exists solely because .gsd/ artifacts are gitignored. With tracked artifacts (R023), the sync functions become dead code that add complexity and are the source of recurring bugs (overwrite loops, stale state, symlink issues).
- Source: PRD-branchless-worktree-architecture
- Primary owning slice: M113/S02

### R025 — mergeMilestoneToMain() is simplified from ~650 lines to ≤250 lines. Removed: stash/pop, milestone shelter, .gsd/ conflict auto-resolution. Kept: auto-commit dirty state, checkout main, squash merge, commit, worktree teardown, auto-push, code change detection, branch-ref divergence check.
- Class: architectural
- Status: active
- Description: mergeMilestoneToMain() is simplified from ~650 lines to ≤250 lines. Removed: stash/pop, milestone shelter, .gsd/ conflict auto-resolution. Kept: auto-commit dirty state, checkout main, squash merge, commit, worktree teardown, auto-push, code change detection, branch-ref divergence check.
- Why it matters: The defensive merge code exists to handle .gsd/ file divergence between branches — a problem that tracked artifacts (R023) eliminate. The simplified function is easier to reason about, test, and maintain.
- Source: PRD-branchless-worktree-architecture
- Primary owning slice: M113/S03

### R026 — Sync-specific test files are deleted. Remaining tests compile and pass. git-self-heal.ts is simplified to crash-recovery-only (no merge-specific recovery). No production or test code references deleted sync functions.
- Class: operational
- Status: active
- Description: Sync-specific test files are deleted. Remaining tests compile and pass. git-self-heal.ts is simplified to crash-recovery-only (no merge-specific recovery). No production or test code references deleted sync functions.
- Why it matters: Test cleanup ensures the codebase stays maintainable. Dead tests referencing removed functions create false confidence and compilation noise. Simplified git-self-heal reduces cognitive load for future agents debugging crash recovery.
- Source: PRD-branchless-worktree-architecture
- Primary owning slice: M113/S04

## Validated

### R001 — Operator can generate a new skill skeleton by providing a name and description via CLI. The skeleton follows the Agent Skills Spec (SKILL.md with YAML frontmatter) and is created in the .opencode/skills/ directory.
- Class: core-capability
- Status: validated
- Description: Operator can generate a new skill skeleton by providing a name and description via CLI. The skeleton follows the Agent Skills Spec (SKILL.md with YAML frontmatter) and is created in the .opencode/skills/ directory.
- Why it matters: Foundational for the skill execution framework — skills must exist before they can be run. Enables rapid skill prototyping.
- Source: prd
- Primary owning slice: M102/S02
- Supporting slices: none
- Validation: S02 delivered /skill new command that creates valid skill skeletons. 11 tests cover creation, validation, name format, duplicates, and quote stripping. Verified via npx vitest run tests/commands/skill-commands.test.ts (19/19 pass).
- Notes: Name must follow Skills Spec convention (lowercase alphanumeric + hyphen). Directory must not already exist.

### R002 — Operator can install skills from a local directory. The system scaffolds a valid skill directory structure with SKILL.md template following the Agent Skills Spec naming convention. Git-based installation is deferred.
- Class: core-capability
- Status: validated
- Description: Operator can install skills from a local directory. The system scaffolds a valid skill directory structure with SKILL.md template following the Agent Skills Spec naming convention. Git-based installation is deferred.
- Why it matters: Enables operators to add new skills to the system. Local-only for MVP; Git install is Phase 2 scope.
- Source: prd
- Primary owning slice: M102/S02
- Supporting slices: none
- Validation: S02 delivered /skill new command that scaffolds .opencode/skills/{name}/ with SKILL.md template following Agent Skills Spec naming convention (lowercase alphanumeric + hyphen). Local-only as specified. 19 tests pass including creation, validation, and edge cases.
- Notes: Partial coverage — scaffold only. Git-based install deferred to Phase 2.

### R003 — Operator can execute a skill via CLI with arguments. The system loads the skill's SKILL.md content, resolves model routing from .umb/models.yaml, creates a new pi session with the skill context, and passes arguments as the user message.
- Class: primary-user-loop
- Status: validated
- Description: Operator can execute a skill via CLI with arguments. The system loads the skill's SKILL.md content, resolves model routing from .umb/models.yaml, creates a new pi session with the skill context, and passes arguments as the user message.
- Why it matters: The primary user action — this is how operators invoke the specialized agent capabilities (SEO, design, content) that generate revenue.
- Source: prd
- Primary owning slice: M102/S03
- Supporting slices: M102/S01
- Validation: S03 implemented /skill run <name> <message> end-to-end: skill lookup via scanSkillDirs(), validation via validateSkill(), model routing from .umb/models.yaml skills section, session creation via ctx.newSession() with SKILL.md content injected. 33/33 skill-command tests pass including 14 /skill run tests covering all paths (success, not found, invalid, model not found, cancelled, session exception). 124/124 total command tests pass with zero regressions.
- Notes: Model routing infrastructure (skills: block in parseSimpleYaml) is now in place. R003 depends on S03 for the actual CLI execution path. Updated: skills field on ModelConfig, loadModelConfig merges skill assignments.

### R004 — System validates skill configuration against the Agent Skills Spec before execution. Checks that SKILL.md has required frontmatter fields (name, description), directory naming matches the skill name, and basic structure is valid.
- Class: quality-attribute
- Status: validated
- Description: System validates skill configuration against the Agent Skills Spec before execution. Checks that SKILL.md has required frontmatter fields (name, description), directory naming matches the skill name, and basic structure is valid.
- Why it matters: Prevents runtime failures from malformed skills. Ensures the skill ecosystem maintains quality standards.
- Source: prd
- Primary owning slice: M102/S01
- Supporting slices: none
- Validation: validateSkill() checks three Skills Spec requirements: name matches /^[a-z0-9-]+$/, description is non-empty, directory basename matches skill name. Returns structured { valid, errors[], warnings[] }. Tested with 10 unit tests including edge cases. 149 of 169 real skills pass validation; 16 skipped (no frontmatter), 4 missing SKILL.md.
- Notes: Skills Spec validation only (name + description). Full BMAD persona validation is out of scope.

### R010 — Operator can install skills from a Git repository URL. The system clones the repo, validates the skill structure, and places it in the skills directory.
- Class: core-capability
- Status: validated
- Description: Operator can install skills from a Git repository URL. The system clones the repo, validates the skill structure, and places it in the skills directory.
- Why it matters: Enables sharing skills across projects and teams. Important for ecosystem growth.
- Source: prd
- Primary owning slice: M106/S01
- Supporting slices: none
- Validation: M106/S01 delivered /skill install <git-url> that clones a git repo (shallow, depth=1, 60s timeout), scans for skill directories at root and one level deep, validates each against the Skills Spec, copies valid skills to .opencode/skills/ without overwriting existing ones, and cleans up temp directory. 13 installer tests + 5 command tests cover all paths (success, clone failure, no skills, partial install, name conflict, nested repos, cleanup). 78/78 skill-related tests pass.
- Notes: Deferred to Phase 2. Local-only install is sufficient for MVP.

## Deferred

### R011 — System validates that skill content follows BMAD four-field persona rules (role, identity, communication style, principles), module assignment, and manifest registration.
- Class: quality-attribute
- Status: deferred
- Description: System validates that skill content follows BMAD four-field persona rules (role, identity, communication style, principles), module assignment, and manifest registration.
- Why it matters: Ensures skills integrate properly with the BMAD agent framework.
- Source: inferred
- Primary owning slice: none
- Supporting slices: none
- Validation: unmapped
- Notes: Deferred — Skills Spec validation (R004) covers the machine-readable contract. BMAD persona validation is a separate concern.

## Out of Scope

### R020 — Agent researches keywords, generates content outlines, writes full-length articles with affiliate disclosures, and cross-references product specs.
- Class: core-capability
- Status: out-of-scope
- Description: Agent researches keywords, generates content outlines, writes full-length articles with affiliate disclosures, and cross-references product specs.
- Why it matters: This is the next milestone (M103). Depends on M102's /skill run infrastructure.
- Source: prd
- Primary owning slice: none
- Supporting slices: none
- Validation: n/a
- Notes: FR5-FR9 from PRD. Requires skill execution framework first.

### R021 — Agent generates complete static site project structure, branding assets, populates with SEO content, and deploys to hosting.
- Class: core-capability
- Status: out-of-scope
- Description: Agent generates complete static site project structure, branding assets, populates with SEO content, and deploys to hosting.
- Why it matters: Phase 1 PRD capability. Depends on both skill execution and SEO content generation.
- Source: prd
- Primary owning slice: none
- Supporting slices: none
- Validation: n/a
- Notes: FR10-FR13 from PRD. Requires M102 + M103 as prerequisites.

### R022 — Web UI for multi-client management, execution logs, job scheduling.
- Class: differentiator
- Status: out-of-scope
- Description: Web UI for multi-client management, execution logs, job scheduling.
- Why it matters: Phase 2 PRD capability. Not needed for MVP.
- Source: prd
- Primary owning slice: none
- Supporting slices: none
- Validation: n/a
- Notes: FR14, FR16 from PRD. Phase 2 scope.

## Traceability

| ID | Class | Status | Primary owner | Supporting | Proof |
|---|---|---|---|---|---|
| R001 | core-capability | validated | M102/S02 | none | S02 delivered /skill new command that creates valid skill skeletons. 11 tests cover creation, validation, name format, duplicates, and quote stripping. Verified via npx vitest run tests/commands/skill-commands.test.ts (19/19 pass). |
| R002 | core-capability | validated | M102/S02 | none | S02 delivered /skill new command that scaffolds .opencode/skills/{name}/ with SKILL.md template following Agent Skills Spec naming convention (lowercase alphanumeric + hyphen). Local-only as specified. 19 tests pass including creation, validation, and edge cases. |
| R003 | primary-user-loop | validated | M102/S03 | M102/S01 | S03 implemented /skill run <name> <message> end-to-end: skill lookup via scanSkillDirs(), validation via validateSkill(), model routing from .umb/models.yaml skills section, session creation via ctx.newSession() with SKILL.md content injected. 33/33 skill-command tests pass including 14 /skill run tests covering all paths (success, not found, invalid, model not found, cancelled, session exception). 124/124 total command tests pass with zero regressions. |
| R004 | quality-attribute | validated | M102/S01 | none | validateSkill() checks three Skills Spec requirements: name matches /^[a-z0-9-]+$/, description is non-empty, directory basename matches skill name. Returns structured { valid, errors[], warnings[] }. Tested with 10 unit tests including edge cases. 149 of 169 real skills pass validation; 16 skipped (no frontmatter), 4 missing SKILL.md. |
| R010 | core-capability | validated | M106/S01 | none | M106/S01 delivered /skill install <git-url> that clones a git repo (shallow, depth=1, 60s timeout), scans for skill directories at root and one level deep, validates each against the Skills Spec, copies valid skills to .opencode/skills/ without overwriting existing ones, and cleans up temp directory. 13 installer tests + 5 command tests cover all paths (success, clone failure, no skills, partial install, name conflict, nested repos, cleanup). 78/78 skill-related tests pass. |
| R011 | quality-attribute | deferred | none | none | unmapped |
| R020 | core-capability | out-of-scope | none | none | n/a |
| R021 | core-capability | out-of-scope | none | none | n/a |
| R022 | differentiator | out-of-scope | none | none | n/a |
| R023 | architectural | active | M113/S01 | none | unmapped |
| R024 | architectural | active | M113/S02 | none | unmapped |
| R025 | architectural | active | M113/S03 | none | unmapped |
| R026 | operational | active | M113/S04 | none | unmapped |

## Coverage Summary

- Active requirements: 4
- Mapped to slices: 4
- Validated: 5 (R001, R002, R003, R004, R010)
- Unmapped active requirements: 0

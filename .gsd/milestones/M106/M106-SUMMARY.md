---
id: M106
title: "Git-based skill install"
status: complete
completed_at: 2026-04-11T13:00:49.591Z
key_decisions:
  - Shallow clone (depth=1) with 60s timeout for fast, bounded installs
  - Scan root + one level deep for nested skill directories
  - Structured InstallResult { installed, skipped, errors } for partial success handling
  - Conflict-safe copy that skips existing skills rather than overwriting
key_files:
  - src/skill-registry/installer.ts
  - src/commands/skill-commands.ts
  - src/skill-registry/index.ts
  - tests/skill-registry/installer.test.ts
  - tests/commands/skill-commands.test.ts
lessons_learned:
  - Git clone failures can be transient (network-dependent) — tests use obviously fake URLs to avoid flakiness
  - Scanning root + one level deep handles both flat and nested repo structures without over-scanning
  - Structured result types (InstallResult) make partial-success UX straightforward — display what worked and what didn't
---

# M106: Git-based skill install

**Added /skill install <git-url> and /skill remove <name> commands with shallow clone, skill discovery, validation, conflict-safe copy, and structured result widgets**

## What Happened

M106 delivered two new skill management commands. S01 implemented installSkillFromGit() in src/skill-registry/installer.ts — a utility that shallow-clones a git repo (depth=1, 60s timeout), scans for skill directories at root and one level deep, validates each against the Skills Spec using existing scanSkillDirs()/validateSkill() infrastructure, copies valid skills to .opencode/skills/ without overwriting existing ones, and always cleans up temp directories in a finally block. The handleSkillInstall() command handler renders success/error/partial result widgets via ctx.ui.setWidget(). S02 added handleSkillRemove() that deletes skill directories from .opencode/skills/ with quote stripping and validation, plus updated /skill help to list all commands including install and remove. All 60 tests pass (13 installer + 47 command) with zero regressions across the 78-test skill-related suite.

## Success Criteria Results

- /skill install <git-url> clones repo, validates skill, copies to .opencode/skills/, shows success widget — VERIFIED: installer.ts implements shallow clone + scan + validate + copy + cleanup; 13 tests cover all paths
- /skill remove <name> deletes skill directory, /skill help shows all commands including install and remove — VERIFIED: handleSkillRemove() deletes with validation; help text includes all commands; 8 remove tests pass

## Definition of Done Results

- All slices complete: S01 ✅ (1/1 tasks), S02 ✅ (1/1 tasks)
- All slice summaries exist: S01-SUMMARY.md ✅, S02-SUMMARY.md ✅
- Cross-slice integration: S02 depends on S01 patterns (command registration, widget rendering) — verified working
- No regressions: 78/78 skill-related tests pass

## Requirement Outcomes

- R010: active → validated — 13 installer tests + 5 install command tests + 8 remove command tests. installSkillFromGit() handles clone failure, no skills, partial install, name conflicts, nested repos, and cleanup. /skill remove deletes correctly. 78/78 tests pass.

## Deviations

None.

## Follow-ups

None.

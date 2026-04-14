---
id: S01
parent: M106
milestone: M106
provides:
  - ["installSkillFromGit() utility in skill-registry/installer.ts", "handleSkillInstall() command handler registered as 'skill install'", "Updated barrel export in skill-registry/index.ts"]
requires:
  - slice: M102/S01
    provides: scanSkillDirs() and validateSkill() from skill-registry
affects:
  - ["M106/S02"]
key_files:
  - ["src/skill-registry/installer.ts", "src/commands/skill-commands.ts", "src/skill-registry/index.ts", "tests/skill-registry/installer.test.ts", "tests/commands/skill-commands.test.ts"]
key_decisions:
  - (none)
patterns_established:
  - ["Git-based installer pattern: shallow clone → scan → validate → copy → cleanup in finally block", "Structured InstallResult { installed, skipped, errors } for partial success handling", "Widget-based feedback: success/error/partial result display via ctx.ui.setWidget()"]
observability_surfaces:
  - none
drill_down_paths:
  - [".gsd/milestones/M106/slices/S01/tasks/T01-SUMMARY.md"]
duration: ""
verification_result: passed
completed_at: 2026-04-11T12:58:00.933Z
blocker_discovered: false
---

# S01: Skill install from git URL

**Implemented /skill install <git-url> with shallow clone, skill discovery, validation, conflict-safe copy, and success/error/partial widgets**

## What Happened

Created `src/skill-registry/installer.ts` with `installSkillFromGit()` that clones a git repo (shallow, depth=1, 60s timeout), scans for skill directories at root and one level deep, validates each against the Skills Spec, copies valid skills to `.opencode/skills/` without overwriting existing ones, and always cleans up the temp directory in a `finally` block. Returns structured `InstallResult { installed, skipped, errors }`.

Wired `handleSkillInstall()` in `skill-commands.ts` that parses the git URL, delegates to the installer, and renders appropriate widgets (success with skill names/paths, error with specific failure reason, partial success with installed+skipped lists). Registered as `"skill install"` command and added to `/skill` help text.

Updated barrel export in `index.ts`. Wrote 13 installer tests and 5 command tests covering all paths: successful install, clone failure, no valid skills, partial install (some valid/some invalid), name conflict with existing skill, nested repo structure, temp directory cleanup, empty URL, quote stripping, and help text update. All 78 skill-related tests pass with zero regressions.

## Verification

- `npx vitest run tests/skill-registry/installer.test.ts` — 13/13 passed
- `npx vitest run tests/commands/skill-commands.test.ts` — 38/38 passed
- `npx vitest run tests/skill-registry/ tests/commands/skill-commands.test.ts` — 78/78 passed (4 files), zero regressions

## Requirements Advanced

- R010 — Implemented /skill install <git-url> with git clone, skill discovery (root + nested), validation against Skills Spec, conflict-safe copy to .opencode/skills/, temp cleanup, and structured result widgets

## Requirements Validated

- R010 — 13 installer tests + 5 command tests cover all install paths. 78/78 skill-related tests pass. installSkillFromGit() handles clone failure, no skills, partial install, name conflicts, nested repos, and cleanup.

## New Requirements Surfaced

None.

## Requirements Invalidated or Re-scoped

None.

## Deviations

None.

## Known Limitations

["Only scans one level deep for nested skill directories", "No progress indication during git clone (blocks until clone completes or times out)", "No dry-run mode to preview what would be installed"]

## Follow-ups

None.

## Files Created/Modified

None.

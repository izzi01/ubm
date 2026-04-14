---
id: T01
parent: S01
milestone: M106
key_files:
  - (none)
key_decisions:
  - (none)
duration: 
verification_result: passed
completed_at: 2026-04-11T12:57:08.535Z
blocker_discovered: false
---

# T01: Implemented `/skill install <git-url>` with shallow git clone, skill discovery (root + nested), validation, conflict-safe copy, temp cleanup, and success/error/partial widgets

**Implemented `/skill install <git-url>` with shallow git clone, skill discovery (root + nested), validation, conflict-safe copy, temp cleanup, and success/error/partial widgets**

## What Happened

Created `src/skill-registry/installer.ts` with `installSkillFromGit()` that clones a git repo (shallow, depth=1, 60s timeout), scans for skill directories at root and one level deep, validates each against the Skills Spec, copies valid skills to `.opencode/skills/` without overwriting existing ones, and always cleans up the temp directory in a `finally` block. Returns structured `InstallResult { installed, skipped, errors }`.

Wired `handleSkillInstall()` in `skill-commands.ts` that parses the git URL, delegates to the installer, and renders appropriate widgets (success with skill names/paths, error with specific failure reason, partial success with installed+skipped lists). Registered as `"skill install"` command and added to `/skill` help text.

Updated barrel export in `index.ts`. Wrote 13 installer tests (success, clone failure, no skills, partial install, name conflict, nested repos, cleanup) and 5 command tests (no args, whitespace, clone error, quote stripping, help text). All 78 skill-related tests pass; 6 pre-existing failures in unrelated timer tests remain unchanged.

## Verification

- `npx vitest run tests/skill-registry/installer.test.ts` — 13 tests passed
- `npx vitest run tests/commands/skill-commands.test.ts` — 38 tests passed (33 existing + 5 new)
- `npx vitest run tests/skill-registry/ tests/commands/skill-commands.test.ts` — 78 tests passed, zero regressions
- Full suite: 700/706 pass; 6 failures are pre-existing in background-manager/agent-babysitter timer tests unrelated to this change

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `npx vitest run tests/skill-registry/installer.test.ts` | 0 | ✅ pass | 1030ms |
| 2 | `npx vitest run tests/commands/skill-commands.test.ts` | 0 | ✅ pass | 748ms |
| 3 | `npx vitest run tests/skill-registry/ tests/commands/skill-commands.test.ts` | 0 | ✅ pass | 1200ms |

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

None.

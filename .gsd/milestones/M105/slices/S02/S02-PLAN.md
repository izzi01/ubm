# S02: Smoke test and polish

**Goal:** Verify that a freshly-installed umb binary launches without crashing, /skill list correctly indexes the skills in .opencode/skills/, and the .umb/ config directory is created with proper structure on first run. Create a reusable smoke test script that covers all three demo outcomes.
**Demo:**  umb launches TUI, /skill list works, .umb/ config dir created on first run

## Must-Haves

- scripts/smoke-test.sh exists and passes all checks\n- umb binary launches without crashing (verified by --list-models and --mode text)\n- ~/.umb/agent/ directory structure is created correctly on launch\n- /skill list underlying infrastructure works (scanSkillDirs, validateSkill)\n- No new test regressions in vitest

## Proof Level

- This slice proves: operational

## Integration Closure

- Upstream surfaces consumed: globally-installed umb binary from S01, workspace package resolution from S01\n- New wiring: smoke test script as CI verification gate for the full M105 milestone\n- What remains: nothing — this is the final slice

## Verification

- Smoke test script produces structured pass/fail output with per-check diagnostics\n- Failed checks include the specific error message from the command that failed

## Tasks

- [x] **T01: Create smoke test script for umb binary** `est:45m`
  Create scripts/smoke-test.sh that validates the three S02 demo outcomes:

1. **umb launches without crash**: Run `umb --list-models` (non-interactive, exits 0 even without API keys). Run `umb --mode text "test"` (single-shot, exits 0). Both prove the binary loads, initializes resources, and exits cleanly.

2. **.umb/ config dir created on first run**: After launch, verify `~/.umb/agent/` exists, `~/.umb/agent/auth.json` exists, and `~/.umb/agent/extensions/` exists. These are created by `initResources()` and the auth system on every launch.

3. **/skill list works**: Since /skill list is a TUI command that can't be easily tested non-interactively, verify the underlying infrastructure: (a) the skill-registry module is loadable (no import errors), (b) `scanSkillDirs()` finds skills in `.opencode/skills/`, (c) `validateSkill()` works on found skills. Use a small Node script that imports the skill-registry functions from the installed package and runs them.

The script should:
- Use `set -euo pipefail` and colored pass/fail output (matching the style of verify-global-install.sh)
- Work from any directory (use `which umb` to find the binary)
- Print a summary line at the end
- Exit 0 on all pass, exit 1 on any failure
- Be self-contained (no external dependencies beyond umb itself)
  - Files: `scripts/smoke-test.sh`
  - Verify: bash -n scripts/smoke-test.sh (syntax check) && bash scripts/smoke-test.sh (full run)

- [x] **T02: Run smoke test and fix any discovered issues** `est:45m`
  Run the smoke test script from T01 end-to-end. If any checks fail, diagnose and fix the root cause:

**Likely issues to investigate:**
- If `umb --list-models` or `umb --mode text` crashes: check resource-loader.js initialization, workspace package resolution, or missing directories
- If `~/.umb/` structure is incomplete: check initResources() in resource-loader.js, ensure mkdir calls are correct
- If skill-registry Node script fails: check that scanSkillDirs and validateSkill are properly exported from the installed package, verify the import path resolves
- If .opencode/skills/ isn't found: the smoke test may need to be run from the project directory, or we need to document this

**Fix approach:**
- If the issue is in the installed package (dist-test/ tarball), fix it in the source files that S01 already modified (e.g., resource-loader.js, workspace package.json files)
- If the issue is in the smoke test script, fix the script
- Re-run the smoke test after each fix until all checks pass

**Final verification:**
- Run `bash scripts/smoke-test.sh` — all checks pass
- Run `npx vitest run` — no new test failures (the 2 pre-existing failures in agent-babysitter and background-manager are acceptable)
- Confirm `umb --help` still works
  - Files: `scripts/smoke-test.sh`
  - Verify: bash scripts/smoke-test.sh && npx vitest run 2>&1 | tail -5

## Files Likely Touched

- scripts/smoke-test.sh

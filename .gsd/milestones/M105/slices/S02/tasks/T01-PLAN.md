---
estimated_steps: 10
estimated_files: 1
skills_used: []
---

# T01: Create smoke test script for umb binary

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

## Inputs

- `scripts/verify-global-install.sh`
- `.opencode/skills/`

## Expected Output

- `scripts/smoke-test.sh`

## Verification

bash -n scripts/smoke-test.sh (syntax check) && bash scripts/smoke-test.sh (full run)

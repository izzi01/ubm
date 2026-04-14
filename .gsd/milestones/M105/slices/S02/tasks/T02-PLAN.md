---
estimated_steps: 14
estimated_files: 1
skills_used: []
---

# T02: Run smoke test and fix any discovered issues

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

## Inputs

- `scripts/smoke-test.sh`
- `scripts/verify-global-install.sh`

## Expected Output

- `scripts/smoke-test.sh`

## Verification

bash scripts/smoke-test.sh && npx vitest run 2>&1 | tail -5

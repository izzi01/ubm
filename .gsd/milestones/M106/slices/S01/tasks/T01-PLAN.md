---
estimated_steps: 7
estimated_files: 5
skills_used: []
---

# T01: Implement /skill install command with git clone, validation, and copy

**Slice:** S01 — Skill install from git URL
**Milestone:** M106

## Description

Implement the `/skill install <git-url>` command end-to-end. This command clones a git repository to a temporary directory, scans it for skill directories (any subdirectory containing a valid SKILL.md), validates each found skill against the Skills Spec, copies valid skills to `.opencode/skills/`, cleans up the temp directory, and shows a success/error widget.

The implementation adds a new `installer.ts` module in `skill-registry/` with the core git-clone-and-install logic (pure Node.js, no external dependencies — uses `child_process.execFile` for `git clone`), wires a `handleSkillInstall()` handler in `skill-commands.ts`, registers it as the `skill install` command, and adds comprehensive tests.

## Failure Modes

| Dependency | On error | On timeout | On malformed response |
|------------|----------|-----------|----------------------|
| git binary | Catch error, report "git is not installed" to user | Use 30s default timeout on execFile | N/A (binary exit code) |
| git clone (network) | Catch error, report clone failure with stderr | Timeout at 60s, report timeout | N/A |
| Target repo (no skills) | Report "no valid skills found" with details | N/A | N/A |
| Filesystem (permissions) | Catch error, report write failure | N/A | N/A |

## Load Profile

- **Shared resources**: none (each install is isolated to a temp dir)
- **Per-operation cost**: 1 git clone (network + disk), 1 directory scan, N validations, N copies
- **10x breakpoint**: N/A — this is an interactive CLI command, not a server endpoint

## Negative Tests

- **Malformed inputs**: empty URL, non-git URL (no .git or valid host), URL with spaces
- **Error paths**: git not installed, clone failure (bad URL, auth required, network down), repo has no SKILL.md files, repo has only invalid skills, skill name conflicts with existing skill
- **Boundary conditions**: repo with multiple skills (some valid, some invalid), repo with nested skill directories

## Steps

1. Create `src/skill-registry/installer.ts` with:
   - `installSkillFromGit(gitUrl: string, targetSkillsDir: string): Promise<InstallResult>` — main entry point
   - Uses `child_process.execFile('git', ['clone', '--depth', '1', gitUrl, tmpDir])` for shallow clone
   - Creates temp dir via `fs.mkdtemp()`, clones into it
   - Calls `scanSkillDirs()` on the cloned repo root (and optionally one level deep for repos like `user/skills-repo` where skills are subdirectories)
   - Validates each found skill with `validateSkill()`
   - Copies valid skills to `targetSkillsDir` using `fs.cpSync()` with recursive
   - Cleans up temp dir in `finally` block
   - Returns `{ installed: string[], skipped: { name: string, errors: string[] }[], errors: string[] }`
   - Does NOT overwrite existing skills — skips with error message

2. Export new types and function from `src/skill-registry/index.ts`

3. Add `handleSkillInstall(args, ctx)` handler in `src/commands/skill-commands.ts`:
   - Parse git URL from args (strip quotes, trim)
   - Validate URL is non-empty
   - Call `installSkillFromGit(url, skillsDir)`
   - Show success widget with installed skill names and paths
   - Show error widget on any failure (clone fail, no skills, validation errors)
   - Handle the case where some skills install but others fail (partial success)

4. Register the command in `registerSkillCommands()`:
   ```
   pi.registerCommand("skill install", {
     description: "Install skill(s) from a git repository: /skill install <git-url>",
     handler: handleSkillInstall,
   });
   ```

5. Update `/skill` help handler to include install command

6. Write `tests/skill-registry/installer.test.ts` with tests for:
   - Successful install from a local git repo (create temp repo with `git init`, add skill, commit)
   - Error when git clone fails (invalid URL)
   - Error when repo has no valid skills
   - Partial install (some valid, some invalid)
   - Skip when skill name already exists in target
   - Cleanup of temp directory on both success and failure

7. Add tests to `tests/commands/skill-commands.test.ts` for:
   - `/skill install` with no args shows usage
   - `/skill install <url>` success shows widget
   - `/skill install <url>` failure shows error widget
   - Help text includes install command

## Must-Haves

- [ ] `installSkillFromGit()` clones repo, scans for skills, validates, copies valid ones, cleans up temp dir
- [ ] Temp directory is always cleaned up (even on error) via `finally` block
- [ ] Existing skills are never overwritten — conflict reported as error
- [ ] `handleSkillInstall()` registered as `skill install` command
- [ ] Success widget shows installed skill names and paths
- [ ] Error widget shows specific failure reason (clone fail / no skills / validation errors / conflict)
- [ ] `/skill` help includes the install command
- [ ] 10+ new tests covering install paths
- [ ] All existing tests still pass (no regressions)

## Verification

- `npx vitest run tests/skill-registry/installer.test.ts` — all new installer tests pass
- `npx vitest run tests/commands/skill-commands.test.ts` — all command tests pass (new + existing)
- `npx vitest run` — full test suite passes with zero regressions

## Observability Impact

- Signals added: `console.warn` for git clone stderr, skipped skills, name conflicts
- How a future agent inspects this: `/skill list` shows newly installed skills; error widgets surface specific failure reasons
- Failure state exposed: InstallResult.skipped array contains per-skill error details; InstallResult.errors contains top-level failures

## Inputs

- `src/skill-registry/scanner.ts` — scanSkillDirs() for discovering skills in cloned repo
- `src/skill-registry/validator.ts` — validateSkill() for checking skill compliance
- `src/skill-registry/types.ts` — SkillMetadata, SkillValidationResult interfaces
- `src/skill-registry/index.ts` — barrel export to add installer exports
- `src/commands/skill-commands.ts` — existing command handlers and registration pattern

## Expected Output

- `src/skill-registry/installer.ts` — gitInstallSkill() utility with InstallResult type
- `src/skill-registry/index.ts` — updated barrel with installer exports
- `src/commands/skill-commands.ts` — handleSkillInstall() handler + registration
- `tests/skill-registry/installer.test.ts` — unit tests for installer module
- `tests/commands/skill-commands.test.ts` — updated with install command tests

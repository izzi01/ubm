# S01: Skill install from git URL — UAT

**Milestone:** M106
**Written:** 2026-04-11T12:58:00.933Z

# UAT: S01 — /skill install from git URL

## Preconditions
- `umb` CLI available with extension loaded
- `.opencode/skills/` directory exists (created by prior /skill commands)
- `git` installed and available in PATH
- Network access for git clone operations

## Test Cases

### TC1: Successful install from git repo with valid skill
1. Run `/skill install https://github.com/example/skill-repo.git`
2. **Expected**: Widget shows "Installed: skill-name" with path. Skill directory appears in `.opencode/skills/skill-name/` with valid SKILL.md.
3. Run `/skill list` — newly installed skill appears in list.

### TC2: Error on invalid git URL
1. Run `/skill install https://github.com/nonexistent/nonexistent-repo-xyz.git`
2. **Expected**: Error widget showing "git clone failed" with the specific git error message. No temp directories left behind.

### TC3: Error when no valid skills found in repo
1. Run `/skill install` pointing to a valid git repo that contains no skill directories with valid SKILL.md frontmatter
2. **Expected**: Error widget showing "No valid skills found in repository."

### TC4: Partial install when some skills are invalid
1. Run `/skill install` pointing to a repo with multiple skill directories, some valid and some invalid (e.g., missing description, invalid name format)
2. **Expected**: Widget shows partial success — lists installed skills and skipped skills with validation error reasons.

### TC5: Skip when skill name conflicts with existing
1. Ensure a skill named "commit" already exists in `.opencode/skills/`
2. Run `/skill install` pointing to a repo containing a skill named "commit"
3. **Expected**: Widget shows "commit" was skipped due to name conflict. Existing skill unchanged.

### TC6: No arguments shows error
1. Run `/skill install` (no URL argument)
2. **Expected**: Error widget showing usage message with expected format.

### TC7: Quote stripping from URL
1. Run `/skill install "https://github.com/example/repo.git"`
2. **Expected**: Quotes stripped, install proceeds with clean URL.

### TC8: Help text includes install command
1. Run `/skill`
2. **Expected**: Help output includes `/skill install <git-url>` with description.

### TC9: Temp directory cleanup
1. Run `/skill install` with any URL (success or failure)
2. Check `/tmp/` for leftover `skill-install-*` directories
3. **Expected**: No temp directories remain after command completes (verified by cleanup test).

### TC10: Nested skill discovery
1. Run `/skill install` pointing to a repo where skills are in subdirectories (one level deep from root)
2. **Expected**: Skills in subdirectories are discovered and installed, not just root-level ones.

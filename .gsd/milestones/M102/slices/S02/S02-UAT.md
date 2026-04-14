# S02: /skill list + /skill new — UAT

**Milestone:** M102
**Written:** 2026-04-10T23:33:15.915Z

# S02: /skill list + /skill new — UAT

**Milestone:** M102
**Written:** 2026-04-11

## UAT Type

- UAT mode: artifact-driven
- Why this mode is sufficient: These are CLI slash commands with no runtime server. Correctness is verified through automated tests and code review of the registration wiring.

## Preconditions

- Extension built and loaded in pi
- .opencode/skills/ directory exists with at least one valid skill (from S01)

## Smoke Test

Run `/skill list` — expect a formatted widget showing all indexed skills with ✅/❌ indicators and a summary count.

## Test Cases

### 1. List all indexed skills

1. Ensure .opencode/skills/ contains multiple valid skill directories
2. Run `/skill list`
3. **Expected:** Widget displays each skill name with description, ✅ for valid skills, ❌ for invalid, and a summary line (e.g., "Showing X skills (Y valid, Z invalid)")

### 2. List with empty skills directory

1. Remove or rename all skills in .opencode/skills/
2. Run `/skill list`
3. **Expected:** Widget shows "No skills found" message

### 3. Create a new skill

1. Run `/skill new my-test-skill "A test skill description"`
2. **Expected:** Notification confirms creation, then `/skill list` shows the new skill with ✅

### 4. Reject invalid skill name

1. Run `/skill new MySkill "uppercase"`
2. **Expected:** Error notification: name must be lowercase alphanumeric and hyphens only

### 5. Reject missing description

1. Run `/skill new my-skill`
2. **Expected:** Error notification: description is required

### 6. Reject duplicate skill name

1. Run `/skill new my-test-skill "Another description"` (after test 3)
2. **Expected:** Error notification: skill already exists

### 7. Verify SKILL.md template

1. After creating a skill, inspect .opencode/skills/my-test-skill/SKILL.md
2. **Expected:** File contains valid YAML frontmatter with name, description, and created_at fields between --- delimiters

## Edge Cases

### Name with special characters
1. Run `/skill new my_skill! "test"`
2. **Expected:** Rejected — only lowercase letters, digits, and hyphens allowed

### Single-word description (no quotes)
1. Run `/skill new simple test`
2. **Expected:** Creates skill with description "test" (first token consumed as name, rest as description)

### Missing skills directory entirely
1. Remove .opencode/skills/ directory
2. Run `/skill list`
3. **Expected:** Graceful message indicating no skills directory found

## Failure Signals

- Commands not registered: `/skill` triggers "unknown command"
- Widget shows no skills when skills directory has valid content
- Created SKILL.md has malformed frontmatter

## Not Proven By This UAT

- Live runtime behavior in pi (verified via unit tests with mock context)
- Interaction with S03's /skill run command
- Git-based skill installation (explicitly out of scope)

## Notes for Tester

- Tests use a mock ExtensionCommandContext with notify() and setWidget() — the real pi context provides these
- The help handler (`/skill help`) is implemented but minimal — it lists available subcommands

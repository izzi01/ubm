# S02: Build BMAD skill execution engine (loader, executor, pipeline) — UAT

**Milestone:** M112
**Written:** 2026-04-13T09:02:21.514Z

# UAT: S02 — BMAD Skill Execution Engine

## Preconditions
- Working from `/home/cid/projects-personal/umb/`
- `_bmad/` directory exists with BMAD v6.3.0 skill definitions
- Node.js available with test runner

## Test Cases

### TC1: Skill discovery finds all skills
**Steps:**
1. Run: `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/resources/extensions/umb/tests/bmad-executor.test.ts`
2. Observe test "findBmadSkills works against real _bmad/ directory in project" passes
**Expected:** Test passes — discovers 38 skills from _bmad/bmm/ (27) and _bmad/core/ (11)

### TC2: Skill loading with full structure
**Steps:**
1. Run the full executor test suite
2. Observe test "loadBmadSkill loads bmad-product-brief with full structure from real _bmad/" passes
**Expected:** Loads SKILL.md frontmatter (name, description), body content, 4+ stage prompts, 3+ agent definitions, and bmad-manifest.json metadata

### TC3: Config resolution with transitive variables
**Steps:**
1. Run executor tests
2. Observe tests for resolveBmadConfig pass: basic parsing, {project-root} resolution, transitive references, quoted values
**Expected:** All resolveBmadConfig tests pass — config.yaml parsed, template variables resolved iteratively

### TC4: Prompt composition produces correct structure
**Steps:**
1. Run executor tests
2. Observe tests for composeExecutionPrompt pass: includes skill content, stage prompts, agent definitions, omits empty config, preserves section order
**Expected:** Composed prompt has sections in order: header → config → skill → prompts → agents → user message

### TC5: /bmad run creates session with composed prompt
**Steps:**
1. Run command tests: `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/resources/extensions/umb/tests/bmad-commands.test.ts`
2. Observe test "handleBmadRun creates session with composed prompt from matched skill" passes
**Expected:** Session created with ctx.newSession() called once, prompt contains skill name and user message

### TC6: /bmad run error handling
**Steps:**
1. Run command tests
2. Observe tests for error cases pass: skill not found, missing message, cancelled session, session creation exception
**Expected:** All error paths show appropriate widget messages, no session created for error cases

### TC7: /bmad skills lists discoverable skills
**Steps:**
1. Run command tests
2. Observe test "handleBmadSkills works against real _bmad/ directory" passes
**Expected:** Widget displays skills grouped by module with prompt/agent counts in brackets

### TC8: Full test suite — zero regressions
**Steps:**
1. Run: `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/resources/extensions/umb/tests/*.test.ts`
2. Observe all 109 tests pass
**Expected:** 109 pass, 0 fail — all existing tests unaffected

## Edge Cases
- Empty _bmad/ directory → findBmadSkills returns empty array, no crash
- Missing config.yaml → resolveBmadConfig returns empty config, composeExecutionPrompt omits config section
- Skill name with no frontmatter name → skipped during discovery
- Fuzzy matching: 'product-brief' matches 'bmad-product-brief', 'analyst' matches 'bmad-agent-analyst'

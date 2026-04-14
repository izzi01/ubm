# S03: GSD Tools + Commands + Pattern Control — UAT

**Milestone:** M001
**Written:** 2026-04-07T22:08:09.625Z

# S03: GSD Tools + Commands + Pattern Control — UAT

**Milestone:** M001
**Written:** 2026-04-08

## UAT Type

- UAT mode: artifact-driven
- Why this mode is sufficient: This slice delivers LLM-callable tools and slash commands — no runtime server or UI to test live. Verification is through the test suite (61 tests) and type-checking, which prove the registration contracts are correct.

## Preconditions

- Node.js and npm installed
- `npm install` completed
- All S01 and S02 dependencies available (db layer, state machine, gate system)

## Smoke Test

Run the full test suite for both task areas:
```bash
npm run test:run -- tests/tools/ tests/commands/
```
Expected: 61 tests pass, 0 failures.

## Test Cases

### 1. Tool registration completeness

1. Import `createGsdToolHandlers` from `src/tools/gsd-tools.ts`
2. Call with a mock GsdEngine
3. **Expected:** Returns object with 10 tool keys: milestone_plan, slice_plan, task_plan, advance, approve, status, phase, list_milestones, list_slices, list_tasks

### 2. Tool execution — milestone_plan

1. Create engine with in-memory DB
2. Call milestone_plan tool handler with valid milestone payload
3. **Expected:** Returns AgentToolResult with content containing "M001" and details with milestone data

### 3. Tool execution — advance with gate blocking

1. Create engine with gate configured on slice S01→active transition
2. Call advance tool handler for task in S01
3. **Expected:** Returns content indicating gate blocked, with reason

### 4. Slash command — /gsd status

1. Create command handlers with engine containing a planned milestone
2. Invoke 'status' command handler with empty args
3. **Expected:** Output widget shows milestone hierarchy with phase information

### 5. Slash command — /bmad list

1. Invoke 'bmad-list' command handler
2. **Expected:** Output lists BMAD agents found in _bmad/ directory structure

### 6. ContextScout — pattern scanning

1. Create temp directories with sample .ts pattern file and _bmad/ YAML agent file
2. Call scanPatterns() with those directories
3. **Expected:** Returns indexed patterns with module names and agent definitions extracted

### 7. ContextScout — missing directories handled gracefully

1. Call scanPatterns() with non-existent directories
2. **Expected:** Returns empty patterns array, no crash (only stderr warnings logged)

## Edge Cases

### Tool error handling
1. Call advance tool with non-existent task ID
2. **Expected:** Throws error caught by try/catch, returns error message in content

### Empty engine state
1. Call status command with no milestones in DB
2. **Expected:** Returns "No milestones found" or equivalent empty-state message

## Failure Signals

- Test failures in tests/tools/ or tests/commands/
- Type errors in src/tools/, src/commands/, src/patterns/context-scout.ts, src/extension/index.ts
- Missing tool keys from createGsdToolHandlers return value

## Not Proven By This UAT

- Live pi-mono extension loading (tools/commands registered in actual pi runtime) — deferred to S04 integration tests
- End-to-end LLM calling tools in a real coding session
- Dashboard UI rendering of GSD state

## Notes for Tester

- Pre-existing type errors exist in tests/workflows/ and src/patterns/__tests__/ — these are NOT from S03
- ContextScout logs warnings to stderr for missing directories (expected behavior in tests)
- Commands use ctx.ui.notify() + ctx.ui.setWidget() — no sendUserMessage available

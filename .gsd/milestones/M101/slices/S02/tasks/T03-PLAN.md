---
estimated_steps: 15
estimated_files: 1
skills_used: []
---

# T03: Write integration tests for discovery commands

Write comprehensive tests for the discovery command handlers:

1. Create `tests/commands/discovery-commands.test.ts` with:
   - Mock ctx using the existing createMockCtx pattern from umb-commands.test.ts
   - Test handleBmadDiscovery with:
     - Valid config + valid model: verifies newSession called with correct setup (model change + user message)
     - No config file: shows error widget pointing to /umb model setup
     - Config exists but agent has no model assignment: shows error with available agents
     - Model not found in registry: shows error with provider/model info
     - Empty topic: shows usage hint
     - Topic with special chars: sanitizes correctly for filename
   - Test each thin wrapper (research, brief, prd, arch) calls shared handler with correct type
   - Test output path generation: verifies _bmad-output/planning-artifacts/{type}-{topic}.md format
   - Test model string parsing edge cases from T01 (no slash, multiple slashes)

2. Verify all tests pass: `npm test -- --grep 'discovery'`

3. Run full test suite to confirm no regressions: `npm test:run`

## Inputs

- `src/commands/discovery-types.ts`
- `src/commands/discovery-commands.ts`
- `tests/commands/umb-commands.test.ts`

## Expected Output

- `tests/commands/discovery-commands.test.ts`

## Verification

npm test -- --grep 'discovery' && npm test:run

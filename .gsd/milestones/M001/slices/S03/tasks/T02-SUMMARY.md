---
id: T02
parent: S03
milestone: M001
key_files:
  - src/commands/gsd-commands.ts
  - src/commands/bmad-commands.ts
  - src/commands/index.ts
  - src/patterns/context-scout.ts
  - src/extension/index.ts
  - tests/commands/gsd-commands.test.ts
  - tests/commands/context-scout.test.ts
key_decisions:
  - Used factory pattern (createGsdCommandHandlers) for testability, matching T01's tool handler pattern
  - Used ctx.ui.notify() + ctx.ui.setWidget() for command output instead of sendUserMessage (not available on ExtensionCommandContext)
  - ContextScout uses synchronous fs operations consistent with better-sqlite3 pattern
  - Pattern extraction uses regex (not AST parsing) for simplicity and zero dependencies
duration: 
verification_result: passed
completed_at: 2026-04-07T22:07:30.538Z
blocker_discovered: false
---

# T02: Implemented 5 slash commands (/gsd status, /gsd auto, /gsd plan, /bmad, /bmad list) and ContextScout pattern indexer with 25 passing tests.

**Implemented 5 slash commands (/gsd status, /gsd auto, /gsd plan, /bmad, /bmad list) and ContextScout pattern indexer with 25 passing tests.**

## What Happened

Created 5 slash commands registered via pi SDK's registerCommand(). The /gsd commands (status, auto, plan) query the GSD engine DB to display milestone/slice/task hierarchy, report auto-mode phase, and guide LLM tool usage. The /bmad commands delegate to BMAD agents and list available agents by scanning _bmad/ subdirectories. Implemented ContextScout (scanPatterns()) that scans src/patterns/ for TypeScript pattern files (extracting JSDoc @module tags and exports) and _bmad/ for agent definitions (extracting YAML frontmatter). Used factory pattern for testability matching T01's approach. Key adaptation: ExtensionCommandContext doesn't expose sendUserMessage, so commands use ctx.ui.notify() + ctx.ui.setWidget() for output.

## Verification

All 25 new tests pass (npm run test:run -- tests/commands/). Zero type errors in new files (npx tsc --noEmit). Existing 36 T01 tool tests still pass.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `npm run test:run -- tests/commands/` | 0 | ✅ pass | 248ms |
| 2 | `npx tsc --noEmit` | 0 | ✅ pass | 1000ms |
| 3 | `npm run test:run -- tests/tools/` | 0 | ✅ pass | 230ms |

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `src/commands/gsd-commands.ts`
- `src/commands/bmad-commands.ts`
- `src/commands/index.ts`
- `src/patterns/context-scout.ts`
- `src/extension/index.ts`
- `tests/commands/gsd-commands.test.ts`
- `tests/commands/context-scout.test.ts`

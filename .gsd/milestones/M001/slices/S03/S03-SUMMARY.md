---
id: S03
parent: M001
milestone: M001
provides:
  - ["10 LLM-callable GSD tools registered via pi extension system", "5 slash commands (/gsd status, /gsd auto, /gsd plan, /bmad, /bmad list)", "ContextScout pattern indexer for scanning src/patterns/ and _bmad/"]
requires:
  []
affects:
  - ["S04 — depends on S03 tools/commands for integration testing and dashboard wiring"]
key_files:
  - ["src/tools/gsd-tools.ts", "src/tools/index.ts", "src/commands/gsd-commands.ts", "src/commands/bmad-commands.ts", "src/commands/index.ts", "src/patterns/context-scout.ts", "src/extension/index.ts", "tests/tools/gsd-tools.test.ts", "tests/commands/gsd-commands.test.ts", "tests/commands/context-scout.test.ts"]
key_decisions:
  - ["Factory pattern (createGsdToolHandlers/createGsdCommandHandlers) for testability — separates handler creation from registration", "pi SDK AgentToolResult uses {content, details} shape, not {isError, content}", "Commands use ctx.ui.notify() + ctx.ui.setWidget() because ExtensionCommandContext lacks sendUserMessage", "ContextScout uses synchronous fs + regex extraction for zero dependencies"]
patterns_established:
  - ["Factory pattern for tool/command handler creation and registration", "AgentToolResult {content, details} return shape for all GSD tools", "ContextScout regex-based pattern extraction from TypeScript and YAML sources"]
observability_surfaces:
  - ["none — tools and commands are synchronous request/response, no background processes"]
drill_down_paths:
  - [".gsd/milestones/M001/slices/S03/tasks/T01-SUMMARY.md", ".gsd/milestones/M001/slices/S03/tasks/T02-SUMMARY.md"]
duration: ""
verification_result: passed
completed_at: 2026-04-07T22:08:09.625Z
blocker_discovered: false
---

# S03: GSD Tools + Commands + Pattern Control

**10 GSD tools and 5 slash commands registered via pi extension system, with ContextScout pattern indexer — 61 passing tests**

## What Happened

S03 wired the GSD engine into the pi extension system as LLM-callable tools and user-facing slash commands, and implemented ContextScout for pattern discovery.

T01 created 10 tool definitions (milestone_plan, slice_plan, task_plan, advance, approve, status, phase, list_milestones, list_slices, list_tasks) using TypeBox parameter schemas. Each tool wraps a GsdEngine method with try/catch error handling. A factory pattern (createGsdToolHandlers) separates handler creation from registration for testability. Key adaptation: pi SDK's AgentToolResult uses {content, details} shape, not {isError, content}. 36 tests cover all tools.

T02 created 5 slash commands (/gsd status, /gsd auto, /gsd plan, /bmad, /bmad list) using the pi SDK's registerCommand(). Commands use ctx.ui.notify() and ctx.ui.setWidget() for output since ExtensionCommandContext doesn't expose sendUserMessage. ContextScout (scanPatterns) scans src/patterns/ for TypeScript pattern files and _bmad/ for YAML agent definitions using regex-based extraction with synchronous fs operations. 25 tests cover commands and ContextScout.

Total: 61 new tests, zero type errors in S03 source files.

## Verification

All 61 tests pass across both task suites. `npm run test:run -- tests/tools/` — 36 passed. `npm run test:run -- tests/commands/` — 25 passed. `npx tsc --noEmit` shows zero errors in S03 source files (src/tools/gsd-tools.ts, src/commands/*.ts, src/patterns/context-scout.ts, src/extension/index.ts). Pre-existing type errors exist in workflow and pattern test files unrelated to S03.

## Requirements Advanced

None.

## Requirements Validated

None.

## New Requirements Surfaced

None.

## Requirements Invalidated or Re-scoped

None.

## Deviations

None.

## Known Limitations

- Tools/commands not yet tested in a live pi-mono runtime (deferred to S04 integration tests)
- ContextScout uses regex extraction, not AST parsing — may miss complex TypeScript patterns
- /gsd auto command provides guidance text but doesn't implement the full auto-mode orchestration loop (that requires S04 dashboard integration)
- /bmad command delegates to BMAD agents but agent invocation itself is a stub pending BMAD runtime wiring

## Follow-ups

None.

## Files Created/Modified

- `src/tools/gsd-tools.ts` — 10 GSD tool definitions with TypeBox schemas and execute handlers
- `src/tools/index.ts` — Barrel export for tools module
- `src/commands/gsd-commands.ts` — /gsd status, auto, plan slash commands
- `src/commands/bmad-commands.ts` — /bmad and /bmad list slash commands
- `src/commands/index.ts` — Barrel export for commands module
- `src/patterns/context-scout.ts` — Pattern indexer scanning src/patterns/ and _bmad/
- `src/extension/index.ts` — Updated to register tools and commands at load time
- `tests/tools/gsd-tools.test.ts` — 36 tests covering all GSD tools
- `tests/commands/gsd-commands.test.ts` — 9 tests for slash commands
- `tests/commands/context-scout.test.ts` — 16 tests for ContextScout pattern indexer

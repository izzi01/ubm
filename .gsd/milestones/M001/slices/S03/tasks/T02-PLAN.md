---
estimated_steps: 7
estimated_files: 7
skills_used: []
---

# T02: Register /gsd and /bmad slash commands, implement ContextScout pattern loading

**Slice:** S03 — GSD Tools + Commands + Pattern Control
**Milestone:** M001

## Description

Register user-facing slash commands that orchestrate the GSD tools, implement BMAD agent delegation, and build ContextScout — a pattern indexer that scans `_bmad/` and `src/patterns/` directories so the LLM has awareness of available patterns.

The pi SDK's `registerCommand()` expects `{ name, description?, handler(args, ctx) }`. Commands receive `ExtensionCommandContext` which has `ui`, `cwd`, `sessionManager`, and can send user messages.

## Steps

1. **Create `src/commands/gsd-commands.ts`** — Define `registerGsdCommands(pi: ExtensionAPI)` that registers:
   - `/gsd status` — Calls `getGsdEngine().db` to list milestones, their slices, and tasks. Formats a compact status table and displays via `ctx.ui.notify()` or sends as a user message. Shows: milestone ID, title, status, phase; under each milestone: slice statuses; under active slices: task statuses.
   - `/gsd auto` — Starts auto-mode execution. Uses `getGsdEngine()` to find the current phase and next actionable unit. Sends a user message like "Starting auto-mode: milestone M001 is in [phase]. Next: [action]." For this slice, the command just initiates and reports — the full auto-mode loop will be enhanced in S04. Uses `getGsdEngine().stateMachine.getPhase()` and `getGsdEngine().stateMachine.getNextStatus()`.
   - `/gsd plan` — Placeholder that sends a user message guiding the LLM to use the `gsd_milestone_plan` tool. In S04 this will get more sophisticated.
   - Import `getGsdEngine` from `../extension/index.js`.
   - Export each command handler as a separate named function for testability.

2. **Create `src/commands/bmad-commands.ts`** — Define `registerBmadCommands(pi: ExtensionAPI)` that registers:
   - `/bmad <agent>` — Delegates to a BMAD agent. Parses the agent name from args (e.g. "pm", "architect", "dev"). Validates the agent exists by checking `_bmad/` directory structure. Sends a user message with the delegation request formatted as a system prompt for the agent.
   - `/bmad list` — Lists available BMAD agents by scanning `_bmad/` subdirectories and reading agent YAML frontmatter (title, name, icon, module).
   - Import `getGsdEngine` for access to the engine context.
   - Export handlers as named functions.

3. **Create `src/patterns/context-scout.ts`** — Implement ContextScout pattern indexer:
   - `scanPatterns(cwd: string): PatternIndex` — Scans two directories:
     - `src/patterns/` — TypeScript pattern files. Reads each `.ts` file (excluding `__tests__/`), extracts JSDoc comments and exported class/function names.
     - `_bmad/` — BMAD agent definitions. Recursively finds YAML/Markdown files, extracts agent metadata (title, name, icon, module, description).
   - Returns a `PatternIndex` interface: `{ patterns: PatternEntry[], agents: AgentEntry[], scannedAt: string }`
   - Each `PatternEntry`: `{ name, path, type: "pattern", description?, exports?: string[] }`
   - Each `AgentEntry`: `{ name, title, icon?, module?, path, type: "agent" }`
   - Handle missing directories gracefully (return empty arrays, log warning).
   - Use `fs.readdirSync` and `fs.readFileSync` for synchronous scanning (consistent with better-sqlite3 sync pattern).
   - For TypeScript files, use simple regex to extract JSDoc `@module` tags and export names — don't parse AST.
   - For YAML/Markdown files, extract YAML frontmatter between `---` delimiters using simple string splitting.

4. **Create `src/commands/index.ts`** — Barrel export: `registerGsdCommands`, `registerBmadCommands`, and `scanPatterns` from `../patterns/context-scout.js`.

5. **Update `src/extension/index.ts`** — Import and call `registerGsdCommands(pi)` and `registerBmadCommands(pi)` after tool registration. Also import `scanPatterns` and call it during extension load, storing the result on the engine or in a module-scoped variable. Add the pattern index to the engine object or expose via a getter.

6. **Create `tests/commands/gsd-commands.test.ts`** — Unit tests for command handlers:
   - Test `/gsd status` with a pre-populated in-memory DB (milestone + slices + tasks). Mock `ctx.ui.notify` and verify it receives formatted status text.
   - Test `/gsd auto` with an active milestone. Verify it sends the correct user message with phase info.
   - Test `/gsd plan` sends a guidance message.
   - Mock ExtensionCommandContext with minimal stubs (`ui: { notify: vi.fn() }`, `sendUserMessage: vi.fn()`, etc.).

7. **Create `tests/commands/context-scout.test.ts`** — Unit tests for ContextScout:
   - Create temp directories with sample pattern files and BMAD agent YAML files.
   - Test `scanPatterns()` returns correct PatternIndex with discovered patterns and agents.
   - Test with missing directories — returns empty arrays, no errors.
   - Test with empty directories — returns empty arrays.
   - Test TypeScript JSDoc extraction picks up `@module` tags.
   - Test YAML frontmatter extraction for BMAD agents.
   - Clean up temp directories after each test.

## Must-Haves

- [ ] `/gsd status` shows milestone → slice → task hierarchy from DB
- [ ] `/gsd auto` reports current phase and next actionable unit
- [ ] `/gsd plan` sends guidance message to LLM
- [ ] `/bmad <agent>` validates agent exists and sends delegation message
- [ ] `/bmad list` scans _bmad/ and returns available agents
- [ ] ContextScout scans both src/patterns/ and _bmad/ directories
- [ ] PatternIndex includes names, paths, descriptions, and types
- [ ] All commands registered in registerExtension()
- [ ] 15+ unit tests covering commands and ContextScout
- [ ] `npm run test:run -- tests/commands/` passes

## Verification

- `npm run test:run -- tests/commands/` — all tests pass
- `npx tsc --noEmit` — zero type errors in `src/commands/`, `src/patterns/context-scout.ts`, and `tests/commands/`

## Inputs

- `src/tools/gsd-tools.ts` — Tool definitions (commands may reference tool names)
- `src/tools/index.ts` — Barrel export of tool registration
- `src/extension/index.ts` — getGsdEngine() accessor and registerExtension
- `src/state-machine/index.ts` — GsdEngine for state queries
- `src/patterns/sctdd.ts` — Example pattern file to verify scanning works
- `src/patterns/background-manager.ts` — Another pattern for scanning coverage

## Expected Output

- `src/commands/gsd-commands.ts` — /gsd command handlers and registration
- `src/commands/bmad-commands.ts` — /bmad command handlers and registration
- `src/commands/index.ts` — Barrel export
- `src/patterns/context-scout.ts` — ContextScout pattern indexer
- `src/extension/index.ts` — Updated with command registration and ContextScout initialization
- `tests/commands/gsd-commands.test.ts` — Unit tests for GSD commands
- `tests/commands/context-scout.test.ts` — Unit tests for ContextScout

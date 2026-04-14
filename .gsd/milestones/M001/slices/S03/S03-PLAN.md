# S03: GSD Tools + Commands + Pattern Control

**Goal:** Register GSD tools as LLM-callable tools via the pi extension system, register /gsd and /bmad slash commands, and implement ContextScout pattern loading so the LLM can manage milestones/slices/tasks and delegate to BMAD agents.
**Demo:** After this: After this: /gsd plan creates milestones, /gsd auto executes, ContextScout loads patterns, /bmad commands delegate to BMAD agents

## Tasks
- [x] **T01: Implemented 10 GSD CRUD/state-machine tools (milestone_plan, slice_plan, task_plan, advance, approve, status, phase, list_milestones, list_slices, list_tasks) with TypeBox schemas, pi extension registration, and 36 passing tests.** — Create tool definitions for the core GSD operations (milestone CRUD, slice CRUD, task CRUD, state machine advance, gate approve, status queries) using the pi extension registerTool() API. Each tool wraps a GsdEngine method with a TypeBox parameter schema and returns structured JSON. Wire all tools in the extension entry point.
  - Estimate: 2h
  - Files: src/tools/gsd-tools.ts, src/tools/index.ts, src/extension/index.ts, tests/tools/gsd-tools.test.ts
  - Verify: npm run test:run -- tests/tools/
- [x] **T02: Implemented 5 slash commands (/gsd status, /gsd auto, /gsd plan, /bmad, /bmad list) and ContextScout pattern indexer with 25 passing tests.** — Register /gsd status, /gsd auto, /gsd plan slash commands that orchestrate the GSD tools. Register /bmad command that delegates to BMAD agents. Implement ContextScout — a pattern loader that scans _bmad/ YAML definitions and src/patterns/ TypeScript files, indexing them for the LLM. Wire commands in the extension entry point.
  - Estimate: 2h
  - Files: src/commands/gsd-commands.ts, src/commands/bmad-commands.ts, src/commands/index.ts, src/patterns/context-scout.ts, src/extension/index.ts, tests/commands/gsd-commands.test.ts, tests/commands/context-scout.test.ts
  - Verify: npm run test:run -- tests/commands/

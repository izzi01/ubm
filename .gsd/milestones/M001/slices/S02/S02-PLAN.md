# S02: GSD State Machine + Approval Gates

**Goal:** Build the GSD state machine that drives milestone→slice→task lifecycle through plan→execute→verify→complete phases, and approval gates that pause execution at configurable boundaries for human approval.
**Demo:** After this: After this: state machine cycles through plan→execute→verify→complete, approval gates fire at configured boundaries

## Tasks
- [x] **T01: Implemented the GSD state machine engine with full lifecycle transition enforcement, phase detection, and 49 passing unit tests** — Implement the state machine that manages lifecycle transitions for milestones, slices, and tasks. The machine enforces valid state transitions (e.g. task can't go from pending→complete without being active first), tracks the current phase of execution (plan→execute→verify→complete), and persists all transitions to the database. The machine reads from and writes to GsdDb. It should expose a clean API: advance(milestoneId) to drive the next unit through its lifecycle, getStatus(unitId) to query current state, and getPhase(milestoneId) to determine the current execution phase.
  - Estimate: 2h
  - Files: src/state-machine/types.ts, src/state-machine/state-machine.ts, tests/state-machine/state-machine.test.ts
  - Verify: npm run test:run -- tests/state-machine/
- [x] **T02: Built the approval gate system with configurable per-slice policies (always/high-risk-only/never) and 32 passing tests** — Implement configurable approval gates that intercept state transitions and pause execution when approval is required. Gates are configured per-milestone or per-slice and define which transitions require approval (e.g. slice→complete always requires approval, task→execute requires approval for high-risk slices). The gate system is a layer on top of the state machine — it wraps advance() calls with gate checks. When a gate fires, the transition is blocked and recorded as 'awaiting-approval' status. An approve(unitId) method allows explicit approval to resume. Gates are stored in a simple config structure (no new DB table needed — gates are defined in the milestone/slice metadata that already exists in the schema).
  - Estimate: 1.5h
  - Files: src/state-machine/gates.ts, tests/state-machine/gates.test.ts
  - Verify: npm run test:run -- tests/state-machine/
- [x] **T03: Created barrel export, engine factory, wired extension entry point, and wrote 5 integration tests proving full plan→execute→verify→complete lifecycle with approval gates** — Wire the state machine and gate system into the extension entry point (index.ts), making them available via ExtensionAPI. Write integration tests that prove the full cycle: create milestone → create slices → create tasks → advance through plan→execute→verify→complete with approval gates firing at configured boundaries. The integration test creates a full milestone tree, drives the state machine through all phases, verifies gates block at the right moments, approves, and confirms completion. Also add a barrel export from src/state-machine/index.ts.
  - Estimate: 1.5h
  - Files: src/state-machine/index.ts, src/extension/index.ts, tests/state-machine/integration.test.ts
  - Verify: npm run test:run -- tests/state-machine/

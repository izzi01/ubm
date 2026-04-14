---
id: S01
parent: M001
milestone: M001
provides:
  - ["Pi-mono extension scaffold with two-file loader pattern (loader.ts → cli.ts → index.ts) ready for command/tool registration", "SQLite database layer (src/db/) with 5 tables, typed CRUD helpers, and camelCase↔snake_case auto-mapping", "40 passing Vitest tests covering DB schema, CRUD, constraints, and mapping", "Extension manifest and package.json wired for pi-mono discovery"]
requires:
  []
affects:
  - ["S02"]
key_files:
  - ["src/extension/loader.ts", "src/extension/cli.ts", "src/extension/index.ts", "src/extension/extension-manifest.json", "src/db/types.ts", "src/db/schema.ts", "src/db/gsd-db.ts", "tests/db/gsd-db.test.ts", "pkg/package.json", "package.json"]
key_decisions:
  - ["D001: Two-file loader pattern with pkg/ shim directory", "D002: Empty ExtensionAPI entry point deferred to S02", "D003: @mariozechner/pi-coding-agent as devDependency for types", "D004: better-sqlite3 with ESM default import for synchronous SQLite access", "D005: snake_case DB columns auto-mapped to camelCase TypeScript via toSnake/toCamel helpers"]
patterns_established:
  - ["Two-file loader pattern: loader.ts sets PI_PACKAGE_DIR, dynamic-imports cli.ts which re-exports index.ts", "Database module structure: types.ts (interfaces) → schema.ts (DDL) → gsd-db.ts (class with lazy connection)", "camelCase↔snake_case convention: DB uses snake_case, TypeScript uses camelCase, toCamel<T>() bridges them", "Test pattern: in-memory :memory: database per test file, CRUD round-trips for all entities"]
observability_surfaces:
  - none
drill_down_paths:
  - [".gsd/milestones/M001/slices/S01/tasks/T01-SUMMARY.md", ".gsd/milestones/M001/slices/S01/tasks/T02-SUMMARY.md"]
duration: ""
verification_result: passed
completed_at: 2026-04-07T21:48:09.302Z
blocker_discovered: false
---

# S01: Extension Scaffold + DB Layer

**Pi-mono extension scaffold with two-file loader pattern and SQLite database layer with 5 typed tables, CRUD helpers, and 40 passing tests**

## What Happened

This slice established the two foundational layers the rest of M001 builds on: the pi-mono extension scaffold and the GSD database layer.

T01 created the extension scaffold by researching the pi-mono extension architecture from the existing GSD extension at ~/.gsd/agent/extensions/gsd/. The key discovery was the two-file loader pattern: loader.ts sets PI_PACKAGE_DIR to pkg/ (a shim directory) before dynamically importing cli.ts, which re-exports from index.ts. This avoids Pi's theme resolution collision with src/. The extension exports an async default function receiving ExtensionAPI but registers nothing yet — that's S02's job. The extension-manifest.json declares the extension metadata (id, name, tier, provides), and package.json was wired with the pi.extensions pointer.

T02 built the database layer on better-sqlite3. Three modules under src/db/ cover the full stack: types.ts defines TypeScript interfaces for all 5 entities (milestones, slices, tasks, requirements, decisions) plus Input types; schema.ts has DDL with CHECK constraints, FK references with ON DELETE CASCADE, and indexes; gsd-db.ts provides a GsdDb class with lazy connection, camelCase↔snake_case auto-mapping via generic toCamel<T>() helpers, and full CRUD for all entities. 40 Vitest tests cover schema initialization, CRUD for all entities, FK/cascade enforcement, CHECK constraints, camelCase mapping, empty updates, and timestamp behavior.

## Verification

All slice-level verification passed:
- npx tsc --noEmit: zero errors in src/extension/ and src/db/ (pre-existing errors in unrelated workflow test files)
- npm run test:run -- tests/db/: 40/40 tests pass in 34ms
- All 5 extension scaffold files exist: loader.ts, cli.ts, index.ts, extension-manifest.json, pkg/package.json
- index.ts contains default export
- No new tsc errors introduced by this slice's code

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

["Extension index.ts is empty — no commands or tools registered yet (S02 responsibility)", "DB path is hardcoded to :memory: in tests; production path resolution not implemented", "No migration system — schema is create-only via initializeSchema()"]

## Follow-ups

None.

## Files Created/Modified

- `src/extension/loader.ts` — Two-file loader: sets PI_PACKAGE_DIR, dynamic-imports cli.ts
- `src/extension/cli.ts` — Re-exports extension default from index.ts
- `src/extension/index.ts` — Extension entry point — async default function receiving ExtensionAPI (empty body)
- `src/extension/extension-manifest.json` — Extension metadata for pi-mono discovery
- `src/db/types.ts` — TypeScript interfaces for 5 entities plus Input types
- `src/db/schema.ts` — DDL with constraints, FK cascade, indexes, and initializeSchema()
- `src/db/gsd-db.ts` — GsdDb class with lazy connection, camelCase mapping, full CRUD
- `tests/db/gsd-db.test.ts` — 40 Vitest tests covering schema, CRUD, constraints, mapping
- `pkg/package.json` — Shim directory for PI_PACKAGE_DIR
- `package.json` — Added name, pi.extensions pointer, better-sqlite3, pi-coding-agent devDep
- `.gsd/DECISIONS.md` — Added D002-D005 from task decisions
- `.gsd/KNOWLEDGE.md` — Created with extension and DB patterns
- `.gsd/PROJECT.md` — Updated current state to reflect S01 completion

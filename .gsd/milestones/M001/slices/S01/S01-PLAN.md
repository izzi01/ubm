# S01: Extension Scaffold + DB Layer

**Goal:** Create the pi-mono extension scaffold (two-file loader pattern, extension manifest, entry point) and SQLite database layer (schema, typed query helpers). The extension is loadable TypeScript with correct exports; the DB layer creates tables and supports CRUD operations for milestones, slices, tasks, requirements, and decisions.
**Demo:** After this: After this: extension loads in pi-mono, SQLite tables created, DB queries work

## Tasks
- [x] **T01: Created extension scaffold with two-file loader pattern (loader.ts → cli.ts → index.ts), extension manifest, pkg/ shim directory, and wired package.json for pi-mono discovery** — Set up the extension directory structure, install pi-mono SDK dependencies, create the two-file loader pattern (loader.ts sets PI_PACKAGE_DIR before cli.ts imports SDK), the extension entry point (index.ts), and the extension manifest. The extension exports a default function receiving ExtensionAPI but registers nothing yet — that comes in S02.
  - Estimate: 45m
  - Files: src/extension/loader.ts, src/extension/cli.ts, src/extension/index.ts, src/extension/extension-manifest.json, package.json
  - Verify: npx tsc --noEmit && test -f src/extension/index.ts && test -f src/extension/extension-manifest.json && grep -q 'export default' src/extension/index.ts
- [x] **T02: Created GSD database layer with 5 tables, typed CRUD helpers for all entities, camelCase↔snake_case mapping, constraint enforcement, and 40 Vitest tests** — Create the GSD database layer using better-sqlite3. Implement: (1) schema creation for milestones, slices, tasks, requirements, and decisions tables with proper constraints and indexes; (2) typed query helpers for all CRUD operations; (3) connection management with lazy initialization; (4) comprehensive Vitest tests covering schema creation, insert/read/update/delete, constraint enforcement, and error handling. The DB module must be importable independently from the extension.
  - Estimate: 1.5h
  - Files: src/db/gsd-db.ts, src/db/schema.ts, src/db/types.ts, tests/db/gsd-db.test.ts
  - Verify: npm run test:run -- tests/db/

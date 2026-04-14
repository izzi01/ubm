---
estimated_steps: 1
estimated_files: 4
skills_used: []
---

# T02: Implement SQLite schema and typed DB query helpers with tests

Create the GSD database layer using better-sqlite3. Implement: (1) schema creation for milestones, slices, tasks, requirements, and decisions tables with proper constraints and indexes; (2) typed query helpers for all CRUD operations; (3) connection management with lazy initialization; (4) comprehensive Vitest tests covering schema creation, insert/read/update/delete, constraint enforcement, and error handling. The DB module must be importable independently from the extension.

## Inputs

- `src/extension/loader.ts`
- `package.json`

## Expected Output

- `src/db/gsd-db.ts`
- `src/db/schema.ts`
- `src/db/types.ts`
- `tests/db/gsd-db.test.ts`

## Verification

npm run test:run -- tests/db/

# S01: Extension Scaffold + DB Layer — UAT

**Milestone:** M001
**Written:** 2026-04-07T21:48:09.302Z

# S01: Extension Scaffold + DB Layer — UAT

**Milestone:** M001
**Written:** 2026-04-08

## UAT Type

- UAT mode: artifact-driven
- Why this mode is sufficient: This slice delivers a compile-time scaffold and a database library with no runtime server or UI. Verification is fully automatable via tsc and Vitest — no running process to observe.

## Preconditions

- Node.js installed with npm
- Dependencies installed (`npm install`)
- TypeScript configured with strict mode and NodeNext module resolution

## Smoke Test

Run `npm run test:run -- tests/db/` — all 40 tests should pass green.

## Test Cases

### 1. Extension scaffold files exist and are valid TypeScript

1. Verify all expected files exist: `src/extension/loader.ts`, `src/extension/cli.ts`, `src/extension/index.ts`, `src/extension/extension-manifest.json`, `pkg/package.json`
2. Verify index.ts exports a default function: `grep -q 'export default' src/extension/index.ts`
3. Verify extension manifest has required fields: `node -e "const m = require('./src/extension/extension-manifest.json'); console.assert(m.id && m.name && m.tier)"`
4. Run `npx tsc --noEmit` against extension files — zero errors
5. **Expected:** All checks pass; extension scaffold is a valid, loadable pi-mono extension structure

### 2. Database layer compiles and types check

1. Run `npx tsc --noEmit` — verify zero errors in `src/db/` files
2. Verify type exports exist: `node -e "import('./src/db/types.js').then(t => { const keys = Object.keys(t); console.assert(keys.includes('Milestone'), 'Missing Milestone type') })"`
3. **Expected:** All TypeScript types resolve; no compilation errors

### 3. Database CRUD operations work correctly

1. Run `npm run test:run -- tests/db/`
2. Verify 40 tests pass covering: schema initialization, CRUD for milestones/slices/tasks/requirements/decisions, FK cascade deletes, CHECK constraints, camelCase↔snake_case mapping, empty updates, timestamp behavior
3. **Expected:** 40/40 tests pass in under 200ms

### 4. camelCase↔snake_case mapping correctness

1. Run tests that specifically verify mapping: `npm run test:run -- tests/db/ -t "camelCase"`
2. **Expected:** snake_case columns (milestone_id, created_at) correctly map to camelCase TypeScript properties (milestoneId, createdAt) and vice versa

### 5. Constraint enforcement

1. Run tests for constraint enforcement: `npm run test:run -- tests/db/ -t "constraint OR cascade OR CHECK"`
2. **Expected:** FK violations throw errors; cascade deletes remove dependent rows; CHECK constraints reject invalid data

## Edge Cases

### Empty database operations

1. Query a non-existent milestone by ID
2. **Expected:** Returns null/undefined (not an error)

### Insert with minimal required fields

1. Insert a milestone with only required fields, omitting optional ones
2. **Expected:** Row created successfully; optional fields default to null

## Failure Signals

- tsc errors in src/extension/ or src/db/ — indicates type breakage
- Test failures in tests/db/ — indicates DB logic regression
- Missing extension-manifest.json — pi-mono won't discover the extension

## Not Proven By This UAT

- Extension actually loads inside a running pi-mono instance (requires pi runtime, deferred to S02 integration)
- Database path resolution in production context (currently uses in-memory :memory: for tests)
- Concurrent access patterns (better-sqlite3 is synchronous so this isn't a concern, but not explicitly tested)

## Notes for Tester

- Pre-existing tsc errors in tests/workflows/ are unrelated to this slice — ignore them
- The extension index.ts is intentionally empty (just receives ExtensionAPI) — registration happens in S02
- pkg/package.json is a shim with minimal content — its purpose is to be the PI_PACKAGE_DIR target

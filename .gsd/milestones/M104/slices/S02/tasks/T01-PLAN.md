---
estimated_steps: 19
estimated_files: 5
skills_used: []
---

# T01: Port missing auto/ module and fix broken imports

## Why
S01 ported the extension source files but the tsconfig excludes `src/resources/`, so `tsc --noEmit` never validated the extension code. Two problems exist:

1. The `auto/` directory (4 files) is missing — `auto-state.ts`, `dispatcher.ts`, `renderer.ts`, `types.ts` — needed by `state-machine/index.ts`, `tools/gsd-tools.ts`, and `commands/gsd-commands.ts`.
2. `commands/gsd-commands.ts` imports `getGsdEngine` from `../extension/index.js` but the actual module is at `../index.ts` (the extension entry point).

## Steps
1. Copy 4 files from `/home/cid/projects-personal/iz-to-mo-vu/src/auto/` to `src/resources/extensions/umb/auto/`:
   - `auto-state.ts`
   - `dispatcher.ts`
   - `renderer.ts`
   - `types.ts`
2. Verify imports in copied files resolve correctly (they use relative paths like `../state-machine/index.js` and `../db/types.js` which exist in the fork).
3. Fix the import in `commands/gsd-commands.ts` line 17: change `from "../extension/index.js"` to `from "../index.js"`.
4. Run `node scripts/compile-tests.mjs` to compile all source to `dist-test/`.
5. Verify the extension module loads at runtime by running a quick smoke import from `dist-test/`:
   ```
   node -e "import('./dist-test/src/resources/extensions/umb/index.js').then(() => console.log('OK')).catch(e => console.error(e.message))"
   ```
   Note: This may fail because the extension calls `createGsdEngine('.gsd/gsd.db')` at load time — if so, that's expected. The key is that import resolution succeeds (no MODULE_NOT_FOUND errors). If better-sqlite3 fails, that's a runtime concern for T02.
6. Run `npx tsc --noEmit --project tsconfig.resources.json` or equivalent to verify the extension code type-checks. If no separate tsconfig exists for resources, create a temporary one or use `grep -r '@mariozechner' src/resources/extensions/umb/` to confirm zero stale imports remain.

## Inputs

- `/home/cid/projects-personal/iz-to-mo-vu/src/auto/auto-state.ts`
- `/home/cid/projects-personal/iz-to-mo-vu/src/auto/dispatcher.ts`
- `/home/cid/projects-personal/iz-to-mo-vu/src/auto/renderer.ts`
- `/home/cid/projects-personal/iz-to-mo-vu/src/auto/types.ts`
- `src/resources/extensions/umb/commands/gsd-commands.ts`

## Expected Output

- `src/resources/extensions/umb/auto/auto-state.ts`
- `src/resources/extensions/umb/auto/dispatcher.ts`
- `src/resources/extensions/umb/auto/renderer.ts`
- `src/resources/extensions/umb/auto/types.ts`
- `src/resources/extensions/umb/commands/gsd-commands.ts`

## Verification

1. `test -d src/resources/extensions/umb/auto/` returns 0
2. `test -f src/resources/extensions/umb/auto/auto-state.ts && test -f src/resources/extensions/umb/auto/dispatcher.ts && test -f src/resources/extensions/umb/auto/renderer.ts && test -f src/resources/extensions/umb/auto/types.ts` returns 0
3. `grep -q 'from "../index.js"' src/resources/extensions/umb/commands/gsd-commands.ts` returns 0
4. `! grep -q 'from "../extension/index.js"' src/resources/extensions/umb/commands/gsd-commands.ts` returns 0
5. `grep -rq '@mariozechner' src/resources/extensions/umb/` returns non-zero (zero stale imports)
6. `node scripts/compile-tests.mjs` succeeds (exit 0)

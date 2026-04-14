---
id: T01
parent: S01
milestone: M001
key_files:
  - src/extension/loader.ts
  - src/extension/cli.ts
  - src/extension/index.ts
  - src/extension/extension-manifest.json
  - pkg/package.json
  - package.json
  - .gsd/DECISIONS.md
key_decisions:
  - D001: Two-file loader pattern with pkg/ shim directory
  - D002: Empty ExtensionAPI entry point deferred to S02
  - D003: @mariozechner/pi-coding-agent as devDependency for types
duration: 
verification_result: passed
completed_at: 2026-04-07T21:42:51.221Z
blocker_discovered: false
---

# T01: Created extension scaffold with two-file loader pattern (loader.ts → cli.ts → index.ts), extension manifest, pkg/ shim directory, and wired package.json for pi-mono discovery

**Created extension scaffold with two-file loader pattern (loader.ts → cli.ts → index.ts), extension manifest, pkg/ shim directory, and wired package.json for pi-mono discovery**

## What Happened

Researched pi-mono extension architecture from project research docs and the GSD extension at ~/.gsd/agent/extensions/gsd/. Discovered the two-file loader pattern: loader.ts sets PI_PACKAGE_DIR before any SDK imports, then dynamic-imports cli.ts. Also discovered the pkg/ shim directory pattern — PI_PACKAGE_DIR points to pkg/ (not project root) to avoid Pi's theme resolution collision with src/.

Created all 5 expected output files plus pkg/package.json shim:
1. src/extension/loader.ts — Sets PI_PACKAGE_DIR env var, dynamic-imports cli.ts
2. src/extension/cli.ts — Re-exports the extension default from index.ts
3. src/extension/index.ts — Exports async default function receiving ExtensionAPI (empty body)
4. src/extension/extension-manifest.json — Extension metadata (id, name, tier, provides)
5. package.json — Added name, version, private, type, pi.extensions pointer, and @mariozechner/pi-coding-agent devDependency

## Verification

npx tsc --noEmit — 0 errors in src/extension/; test -f src/extension/index.ts — exists; test -f src/extension/extension-manifest.json — exists; grep -q 'export default' src/extension/index.ts — found

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `npx tsc --noEmit (extension files)` | 0 | ✅ pass | 3000ms |
| 2 | `test -f src/extension/index.ts` | 0 | ✅ pass | 50ms |
| 3 | `test -f src/extension/extension-manifest.json` | 0 | ✅ pass | 50ms |
| 4 | `grep -q 'export default' src/extension/index.ts` | 0 | ✅ pass | 50ms |

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `src/extension/loader.ts`
- `src/extension/cli.ts`
- `src/extension/index.ts`
- `src/extension/extension-manifest.json`
- `pkg/package.json`
- `package.json`
- `.gsd/DECISIONS.md`

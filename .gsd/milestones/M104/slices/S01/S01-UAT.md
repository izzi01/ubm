# S01: Port iz-to-mo-vu extension into the fork — UAT

**Milestone:** M104
**Written:** 2026-04-11T03:25:08.888Z

# S01: Port iz-to-mo-vu extension into the fork — UAT

**Milestone:** M104
**Written:** 2026-04-11

## UAT Type

- UAT mode: artifact-driven
- Why this mode is sufficient: This slice is a pure code port — copy files, fix imports, verify compilation. There is no runtime behavior, no server, no user-facing UI. The deliverable is verified entirely through filesystem checks and the TypeScript compiler.

## Preconditions

- Fork repo exists at `/home/cid/projects-personal/umb/`
- Fork builds successfully (M103 prerequisite)
- iz-to-mo-vu source exists at `/home/cid/projects-personal/iz-to-mo-vu/`

## Smoke Test

Verify the extension directory exists and contains the expected structure:
```bash
ls /home/cid/projects-personal/umb/src/resources/extensions/umb/
```
Expected: directories `commands`, `dashboard`, `db`, `import`, `model-config`, `patterns`, `skill-registry`, `state-machine`, `tools` plus files `index.ts`, `package.json`, `extension-manifest.json`.

## Test Cases

### 1. All iz-to-mo-vu source modules present

1. List contents of `/home/cid/projects-personal/umb/src/resources/extensions/umb/`
2. Verify all 10 subdirectories exist: commands, dashboard, db, import, model-config, patterns, skill-registry, state-machine, tools, extension (via index.ts)
3. Verify package.json and extension-manifest.json exist
4. **Expected:** All directories and files present

### 2. No stale import references remain

1. Run `grep -r '@mariozechner' /home/cid/projects-personal/umb/src/resources/extensions/umb/ --include='*.ts'`
2. **Expected:** Zero matches (exit code 1 from grep)

### 3. All imports use fork SDK package name

1. Run `grep -r '@gsd/pi-coding-agent' /home/cid/projects-personal/umb/src/resources/extensions/umb/ --include='*.ts' | head -5`
2. **Expected:** Multiple matches showing `import ... from '@gsd/pi-coding-agent'`

### 4. TypeScript compilation passes with zero errors

1. Run `cd /home/cid/projects-personal/umb && npx tsc --noEmit`
2. **Expected:** Exit code 0, no `error TS` lines in output

### 5. better-sqlite3 dependency installed

1. Run `grep 'better-sqlite3' /home/cid/projects-personal/umb/package.json`
2. **Expected:** Both `better-sqlite3` in dependencies and `@types/better-sqlite3` in devDependencies

## Edge Cases

### Extension files don't reference old config paths
1. Run `grep -r '\.opencode' /home/cid/projects-personal/umb/src/resources/extensions/umb/ --include='*.ts'`
2. **Expected:** Any references should be intentional (e.g., .opencode/skills/ is correct — it's the skill directory convention)

## Failure Signals

- `tsc --noEmit` produces `error TS` lines — compilation broken
- `grep` finds `@mariozechner` references — stale imports not fully migrated
- Missing directories in extension tree — incomplete file copy

## Not Proven By This UAT

- Runtime behavior: extension code compiles but is not yet wired into the TUI or command system
- Test suite: tests were intentionally excluded and will be ported in S03
- Command registration: S02 will wire up the /umb and /skill commands

## Notes for Tester

This is a compilation-only slice. The three checks that matter are: (1) files exist, (2) no stale imports, (3) tsc passes. If all three pass, the slice is good.

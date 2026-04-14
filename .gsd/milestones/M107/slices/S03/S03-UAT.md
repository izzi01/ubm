# S03: Rebrand sync and final verification — UAT

**Milestone:** M107
**Written:** 2026-04-12T04:17:12.841Z

# UAT: S03 — Rebrand sync and final verification

## Preconditions
- umb fork at `/home/cid/projects-personal/umb/` at v2.70.1
- Global `umb` binary installed (rebuilt from current source)

---

## Test Case 1: Binary version matches fork source

**Steps:**
1. Run `umb --version`

**Expected:** Output is `2.70.1`

---

## Test Case 2: Help text shows UMB branding

**Steps:**
1. Run `umb --help`
2. Read the first line

**Expected:** First line contains "UMB" and "Umbrella Blade" — NOT "gsd" or "GSD"

---

## Test Case 3: Subcommand help shows umb branding

**Steps:**
1. Run `umb config --help`
2. Run `umb sessions --help`
3. Run `umb worktree --help`

**Expected:** All subcommand help text references `umb` (not `gsd`)

---

## Test Case 4: Smoke tests pass baseline

**Steps:**
1. Run `cd /home/cid/projects-personal/umb && npm run test:smoke`

**Expected:** At least 2 tests pass (help + version). The init test failure is pre-existing (TTY requirement).

---

## Test Case 5: TypeScript compilation clean

**Steps:**
1. Run `cd /home/cid/projects-personal/umb && npx tsc --noEmit`

**Expected:** Exit code 0, no type errors

---

## Test Case 6: Package metadata correct

**Steps:**
1. Check `package.json` — name must be "umb-cli"
2. Check `dist-test/src/logo.ts` — must export UMB_LOGO
3. Check `dist-test/src/help-text.ts` — usage lines must say "umb"
4. Check `pkg/package.json` — name must be "umb-cli"

**Expected:** All checks pass. Internal `.gsd/` and `@gsd/` references are intentionally unchanged.

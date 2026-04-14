# S02: Smoke test and polish — UAT

**Milestone:** M105
**Written:** 2026-04-11T10:40:09.473Z

# UAT: S02 — Smoke test and polish

## Preconditions
- `npm install -g` has been completed (S01)
- `umb` binary is on PATH (verify with `which umb`)
- `.opencode/skills/` directory exists with at least one valid skill

---

## Test Case 1: umb binary launches without crash

### 1.1 — umb --list-models exits cleanly
```bash
umb --list-models
echo "Exit code: $?"
```
**Expected:** Exit code 0. Output lists available models (or empty if no API keys).

### 1.2 — umb --mode text launches
```bash
umb --mode text "test" 2>&1; echo "Exit code: $?"
```
**Expected:** Process launches, initializes resources, exits. Exit code 0 or 1 (1 is acceptable if no API keys configured — the important thing is no crash/segfault).

### 1.3 — umb --help shows usage
```bash
umb --help | head -5
```
**Expected:** Usage information displayed, exit code 0.

---

## Test Case 2: .umb/ config directory created on first run

### 2.1 — Agent directory exists
```bash
test -d ~/.umb/agent && echo "PASS" || echo "FAIL"
```
**Expected:** PASS

### 2.2 — Extensions directory exists
```bash
test -d ~/.umb/agent/extensions && echo "PASS" || echo "FAIL"
```
**Expected:** PASS

### 2.3 — Auth file exists
```bash
test -f ~/.umb/agent/auth.json && echo "PASS" || echo "FAIL"
```
**Expected:** PASS

---

## Test Case 3: /skill list underlying infrastructure

### 3.1 — Skill registry module loads
```bash
node -e "const m = require('/home/cid/.vfox/cache/nodejs/v-24.13.1/nodejs-24.13.1/lib/node_modules/umb-cli/src/skill-registry'); console.log(Object.keys(m).join(', '))"
```
**Expected:** Output includes `parseSkillMd`, `scanSkillDirs`, `validateSkill`.

### 3.2 — scanSkillDirs finds skills
Run from the project directory. The smoke test verifies 149 skills found.
**Expected:** At least 1 skill found, no errors thrown.

### 3.3 — validateSkill works on found skills
**Expected:** validateSkill returns `{ valid: true, errors: [], warnings: [] }` for well-formed skills.

---

## Test Case 4: Automated smoke test (all-in-one)

```bash
bash scripts/smoke-test.sh
```
**Expected:** `ALL 8/8 checks passed` in green. Exit code 0.

---

## Edge Cases

### EC-1 — Run from non-project directory
```bash
cd /tmp && umb --list-models
```
**Expected:** Exit 0. Binary works regardless of cwd (skills scan may find 0 outside project dir).

### EC-2 — Corrupted auth.json
```bash
echo "not-json" > ~/.umb/agent/auth.json && umb --list-models
```
**Expected:** Binary handles gracefully (may overwrite or warn, but does not crash).

### EC-3 — Missing .umb/ directory
```bash
mv ~/.umb ~/.umb-backup && umb --list-models && test -d ~/.umb/agent && echo "RECREATED" || echo "NOT RECREATED"
```
**Expected:** Binary recreates .umb/ structure on launch.

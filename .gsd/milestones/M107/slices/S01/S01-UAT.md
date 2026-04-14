# S01: Merge upstream v2.70.1 and resolve conflicts — UAT

**Milestone:** M107
**Written:** 2026-04-11T23:15:53.960Z

# UAT: S01 — Merge upstream v2.70.1

## Preconditions
- Fork repo exists at `/home/cid/projects-personal/umb/`
- Git remote `upstream` points to gsd-2 repo

## Test Cases

### TC1: Fork HEAD is at v2.70.1
1. `cd /home/cid/projects-personal/umb && git log --oneline HEAD -1`
2. **Expected**: Output contains `release: v2.70.1`

### TC2: No merge conflict markers
1. `cd /home/cid/projects-personal/umb && grep -r '<<<<<<<' package.json pkg/package.json src/`
2. **Expected**: No output (exit code 1)

### TC3: Umb branding preserved
1. `cd /home/cid/projects-personal/umb && grep -q 'UMB_LOGO' src/logo.ts && echo "PASS"`
2. **Expected**: `PASS`
3. `cd /home/cid/projects-personal/umb && grep -q 'umb config' src/help-text.ts && echo "PASS"`
4. **Expected**: `PASS`
5. `cd /home/cid/projects-personal/umb && grep -q 'umb-cli' package.json && echo "PASS"`
6. **Expected**: `PASS`

### TC4: TypeScript compilation succeeds
1. `cd /home/cid/projects-personal/umb && npx tsc --noEmit 2>&1 | tail -5`
2. **Expected**: No errors (empty or no output)

### TC5: Upstream commits are ancestors
1. `cd /home/cid/projects-personal/umb && git merge-base --is-ancestor c236ea44 HEAD && echo "PASS"`
2. **Expected**: `PASS`

### TC6: Umb extension directory exists and is untracked
1. `cd /home/cid/projects-personal/umb && git status --short | grep '?? src/resources/extensions/umb/'`
2. **Expected**: Line showing umb extension as untracked (not committed to fork)

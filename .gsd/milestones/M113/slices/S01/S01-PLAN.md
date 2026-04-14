# S01: .gitignore + tracking fix

**Goal:** Replace .gsd symlink with a real directory so planning artifacts (milestones/*.md, PROJECT.md, DECISIONS.md, REQUIREMENTS.md, QUEUE.md, KNOWLEDGE.md, PRD.md, CODEBASE.md, RESEARCH.md) are tracked in git while runtime files remain gitignored.
**Demo:** git ls-files shows planning artifacts tracked, runtime files untracked. git worktree add produces correct .gsd/milestones/ from branch.

## Must-Haves

- Not provided.

## Proof Level

- This slice proves: Not provided.

## Integration Closure

Not provided.

## Verification

- Not provided.

## Tasks

- [x] **T01: Replace .gsd symlink with real directory and configure git tracking** `est:15m`
  ## What

Currently `.gsd` is a symlink pointing to `~/.gsd/projects/7f9558836eeb/`. Per R023, planning artifacts must be tracked in git so they travel with branches, while runtime files stay gitignored.

The GSD extension already supports this mode:
- `ensureGsdSymlinkCore()` returns `localGsd` when it encounters a real directory in the main repo (line ~611 of repo-identity.ts)
- `ensureGitignore()` checks `hasGitTrackedGsdFiles()` and skips the `.gsd` pattern if tracked files exist
- `untrackRuntimeFiles()` removes runtime paths (gsd.db, STATE.md, activity/, runtime/, etc.) from the git index

## Steps

1. **Remove the symlink** and replace with a real directory containing the same files:
   ```bash
   # Resolve symlink target
   EXTERNAL=$(readlink .gsd)
   # Remove symlink
   rm .gsd
   # Copy all files from external location
   cp -a "$EXTERNAL" .gsd
   # Verify it's a real directory now
   test -d .gsd && ! test -L .gsd
   ```

2. **Update .gitignore** — replace the broad `.gsd` ignore rules with specific runtime patterns. The current .gitignore has `.gsd` in multiple places (two `# ── GSD baseline` blocks plus `.gsd-id`). Remove all `.gsd` top-level ignores and add specific runtime ignores instead:
   
   Remove these lines (they appear in 3 places in .gitignore):
   - `.gsd/` (under `# ── GSD project state (development-only...)`)
   - `.gsd` (under `# ── GSD baseline (auto-generated) ──` — appears twice)
   - `.gsd-id` (under `# ── GSD baseline (auto-generated) ──`)
   
   Add a new block:
   ```gitignore
   # ── GSD runtime files (planning artifacts are tracked) ──
   .gsd/gsd.db
   .gsd/gsd.db-shm
   .gsd/gsd.db-wal
   .gsd/STATE.md
   .gsd/activity/
   .gsd/runtime/
   .gsd/journal/
   .gsd/auto.lock
   .gsd/metrics.json
   .gsd/completed-units.json
   .gsd/completed-units-M104.json
   .gsd/doctor-history.jsonl
   .gsd/event-log.jsonl
   .gsd/notifications.jsonl
   .gsd/state-manifest.json
   .gsd/repo-meta.json
   .gsd/routing-history.json
   .gsd/reports/
   .gsd/research/
   .gsd/milestones/**/*-VERIFY.json
   .gsd/milestones/**/*-PRE-EXEC-VERIFY.json
   .gsd/milestones/**/*-CONTINUE.md
   .gsd/milestones/**/continue.md
   .gsd/milestones/**/anchors/
   ```

3. **Stage planning artifacts** for git tracking:
   ```bash
   git add .gsd/PROJECT.md .gsd/REQUIREMENTS.md .gsd/DECISIONS.md .gsd/KNOWLEDGE.md \
     .gsd/QUEUE.md .gsd/PRD.md .gsd/CODEBASE.md .gsd/RESEARCH.md .gsd/.gitignore
   git add .gsd/milestones/
   git add .gitignore
   ```
   Note: `git add .gsd/milestones/` will only add files not matched by the ignore patterns above.

4. **Verify** the state is correct:
   - `.gsd` is a real directory (not a symlink)
   - Planning .md files show as staged in `git status`
   - Runtime files (gsd.db, STATE.md, activity/) do NOT show as staged
   - `git check-ignore .gsd/gsd.db` returns exit 0 (ignored)
   - `git check-ignore .gsd/PROJECT.md` returns exit 1 (NOT ignored)

## Must-haves

- `.gsd` is a real directory with all files from the external state location
- All `.md` planning files are staged in git
- All runtime files are gitignored
- `.gsd-id` file is preserved (GSD uses it for project identity)
- GSD tooling continues to work (db, milestones, etc.)
  - Files: `.gitignore`, `.gsd/`
  - Verify: ```bash
# .gsd must be a real directory
test -d .gsd && ! test -L .gsd

# Planning artifacts must be staged
git ls-files --cached .gsd/PROJECT.md .gsd/REQUIREMENTS.md .gsd/DECISIONS.md .gsd/KNOWLEDGE.md .gsd/QUEUE.md .gsd/PRD.md .gsd/CODEBASE.md .gsd/RESEARCH.md | wc -l | grep -q '8'

# At least some milestone files must be staged
git ls-files --cached '.gsd/milestones/' | head -5 | wc -l | grep -qE '[1-9]'

# Runtime files must be ignored (exit 0 = ignored)
git check-ignore -q .gsd/gsd.db

# Planning files must NOT be ignored (exit 1 = not ignored)
! git check-ignore -q .gsd/PROJECT.md 2>/dev/null

# STATE.md must be ignored
git check-ignore -q .gsd/STATE.md
```

## Files Likely Touched

- .gitignore
- .gsd/

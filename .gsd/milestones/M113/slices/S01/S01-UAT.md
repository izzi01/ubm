# S01: .gitignore + tracking fix — UAT

**Milestone:** M113
**Written:** 2026-04-14T02:21:01.866Z

# UAT: S01 — .gitignore + tracking fix

## Preconditions
- Working directory is `/home/cid/projects-personal/umb`
- `.gsd` exists as a real directory (not a symlink)
- Git repo is initialized

## Test Cases

### TC1: .gsd is a real directory
1. Run `test -d .gsd && ! test -L .gsd`
2. **Expected**: Exit code 0 (no output)

### TC2: All planning artifacts are git-tracked
1. Run `git ls-files --cached .gsd/PROJECT.md .gsd/REQUIREMENTS.md .gsd/DECISIONS.md .gsd/KNOWLEDGE.md .gsd/QUEUE.md .gsd/PRD.md .gsd/CODEBASE.md .gsd/RESEARCH.md | wc -l`
2. **Expected**: Output is `8`

### TC3: Milestone files are git-tracked
1. Run `git ls-files --cached '.gsd/milestones/' | head -5 | wc -l`
2. **Expected**: Output is `5` (at least 5 milestone files tracked)

### TC4: Runtime database files are gitignored
1. Run `git check-ignore -q .gsd/gsd.db`
2. **Expected**: Exit code 0 (file is ignored)

### TC5: Planning files are NOT gitignored
1. Run `! git check-ignore -q .gsd/PROJECT.md`
2. **Expected**: Exit code 0 (file is NOT ignored)

### TC6: STATE.md is gitignored
1. Run `git check-ignore -q .gsd/STATE.md`
2. **Expected**: Exit code 0 (file is ignored)

### TC7: No runtime files leaked into git staging
1. Run `git ls-files --cached .gsd/ | grep -E '(gsd\.db|STATE\.md|activity/|runtime/|journal/|auto\.lock|metrics\.json|completed-units|doctor-history|event-log|notifications|state-manifest|repo-meta|routing-history|reports/|research/)'`
2. **Expected**: Exit code 1 (no matches — no runtime files in staging)

### TC8: GSD database is still functional
1. Run `sqlite3 .gsd/gsd.db "SELECT count(*) FROM milestones;"`
2. **Expected**: Returns a positive integer (milestones are readable)

## Edge Cases

### EC1: .gsd-id is preserved
1. Run `test -f .gsd-id`
2. **Expected**: Exit code 0

### EC2: Milestone ephemeral files are ignored
1. Run `git check-ignore -q .gsd/milestones/M001/anchors/test.md`
2. **Expected**: Exit code 0 (anchors/ is gitignored)

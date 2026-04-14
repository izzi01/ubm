# S01: Merge upstream and resolve conflicts

**Goal:** Fast-forward merge upstream v2.70.1 into the umb fork and verify the merge is clean with no conflicts.
**Demo:** Upstream merged cleanly into umb fork with all conflicts resolved

## Must-Haves

- Fork HEAD is at v2.70.1 tag\n- `git status` shows only the expected umb rebrand modifications and untracked umb extension\n- TypeScript compilation succeeds (`npx tsc --noEmit`)\n- Umb rebrand changes (UMB_LOGO, 'umb config', etc.) are intact in working tree\n- No merge conflicts

## Proof Level

- This slice proves: integration

## Integration Closure

- Upstream surfaces consumed: v2.70.1 tag (4 commits: model routing transparency PR #3962)\n- New wiring introduced: none — this is a fast-forward merge only\n- What remains: S02 (verify fork functionality post-merge) and S03 (rebrand sync)

## Verification

- none

## Tasks

- [x] **T01: Fast-forward merge v2.70.1 and verify build** `est:15m`
  Merge upstream tag v2.70.1 into the umb fork. The fork HEAD (c236ea44) is a direct ancestor of v2.70.1 — only 4 commits behind (model routing transparency PR #3962). This should be a clean fast-forward with zero conflicts.
  - Files: `package.json`, `src/resources/extensions/gsd/auto-model-selection.ts`, `src/resources/extensions/gsd/auto-start.ts`, `src/resources/extensions/gsd/guided-flow.ts`, `src/resources/extensions/gsd/tests/interactive-routing-bypass.test.ts`
  - Verify: cd /home/cid/projects-personal/umb && git log --oneline HEAD -1 | grep -q 'release: v2.70.1' && git diff --stat HEAD~4..HEAD | wc -l | grep -q '^0$' || git diff --stat HEAD~4..HEAD | wc -l

- [x] **T02: Verify umb modifications survive and fork builds clean** `est:20m`
  After the fast-forward merge, confirm that the umb rebrand modifications (uncommitted working tree changes) are intact and the fork still compiles and passes its existing tests. The rebrand changes touch different files than the 4 merged commits, so they should be unaffected.
  - Files: `src/cli.ts`, `src/logo.ts`, `src/help-text.ts`, `src/app-paths.ts`, `src/rtk.ts`, `src/welcome-screen.ts`
  - Verify: cd /home/cid/projects-personal/umb && grep -q 'UMB_LOGO' src/logo.ts && grep -q 'umb config' src/help-text.ts && grep -q 'umb-cli' package.json && npx tsc --noEmit 2>&1 | tail -5

## Files Likely Touched

- package.json
- src/resources/extensions/gsd/auto-model-selection.ts
- src/resources/extensions/gsd/auto-start.ts
- src/resources/extensions/gsd/guided-flow.ts
- src/resources/extensions/gsd/tests/interactive-routing-bypass.test.ts
- src/cli.ts
- src/logo.ts
- src/help-text.ts
- src/app-paths.ts
- src/rtk.ts
- src/welcome-screen.ts

---
estimated_steps: 8
estimated_files: 4
skills_used: []
---

# T02: Run final verification suite and confirm demo

Execute the full verification suite against the rebuilt umb fork to confirm the demo outcome: 'umb binary still shows umb branding, help text correct, all commands work'.

Steps:
1. Run TypeScript compilation check: cd /home/cid/projects-personal/umb && npx tsc --noEmit
2. Run unit tests: cd /home/cid/projects-personal/umb && npm run test:unit (expect 5821 pass, 11 pre-existing failures)
3. Run smoke tests: cd /home/cid/projects-personal/umb && npm run test:smoke (expect 2 pass, 1 pre-existing TTY failure)
4. Verify binary branding: umb --version shows 2.70.1, umb --help shows 'UMB — Umbrella Blade' header
5. Spot-check key commands: umb config --help, umb sessions --help, umb worktree --help

The 11 unit test failures and 1 smoke test failure are all pre-existing (documented in S02 summary). This task does NOT fix them — it only confirms they haven't grown.

## Inputs

- `package.json`
- `dist-test/src/logo.ts`
- `dist-test/src/loader.ts`
- `dist-test/src/help-text.ts`

## Expected Output

- Update the implementation and proof artifacts needed for this task.

## Verification

1. npx tsc --noEmit exits 0
2. npm run test:unit passes >= 5800 tests
3. npm run test:smoke passes >= 2 tests
4. umb --version outputs 2.70.1
5. umb --help output contains 'UMB' and 'umb' (not 'gsd' in header line)

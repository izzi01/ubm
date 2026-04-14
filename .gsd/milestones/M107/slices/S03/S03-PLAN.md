# S03: Rebrand sync and final verification

**Goal:** Confirm the umb fork's user-facing branding is fully intact after the upstream v2.70.1 merge, rebuild the binary, and run final verification to prove no regressions.
**Demo:** umb binary still shows umb branding, help text correct, all commands work

## Must-Haves

- umb --version returns 2.70.1 (matching fork package.json)\n- umb --help shows 'UMB — Umbrella Blade' header with 'umb' command usage\n- All user-facing branding touchpoints reference 'umb'/'UMB', not 'gsd'/'GSD'\n- Unit test pass count matches S02 baseline (5821 pass, no new failures)\n- Smoke tests pass at least 2/3 (help + version; init TTY failure is pre-existing)

## Proof Level

- This slice proves: operational

## Integration Closure

- Upstream surfaces consumed: S02's verified fork state at v2.70.1\n- New wiring introduced: rebuilt binary installed globally\n- What remains before milestone is usable end-to-end: nothing — this is the final slice

## Verification

- none

## Tasks

- [x] **T01: Audit user-facing branding and rebuild binary** `est:20m`
  Walk through every user-facing branding touchpoint in the fork source to confirm no upstream 'gsd' references leaked into the umb branding surface. Then rebuild and reinstall the binary so verification runs against the current v2.70.1 code.

Branding touchpoints to check (all in /home/cid/projects-personal/umb/):
1. package.json — name must be 'umb-cli', description must mention 'UMB', bin must be 'umb'
2. dist-test/src/logo.ts — must export UMB_LOGO (block-letter ASCII art)
3. dist-test/src/loader.ts — must reference 'UMB' in banner and version header
4. dist-test/src/help-text.ts — all usage lines must say 'umb' not 'gsd', header must say 'UMB — Umbrella Blade'
5. pkg/package.json — name must be 'umb' if it exists

Note: Internal references to '.gsd/' directory, '@gsd/pi-coding-agent' npm package, GSDState types, and GSD_HEADLESS env var are INTENTIONALLY kept as 'gsd' — they are upstream infrastructure the fork depends on. Do NOT change these.

If any user-facing branding has regressed to 'gsd', fix it.

After audit, rebuild: run `npm run build` (or equivalent) and reinstall the binary globally so subsequent verification tests the current code.
  - Files: `package.json`, `dist-test/src/logo.ts`, `dist-test/src/loader.ts`, `dist-test/src/help-text.ts`, `pkg/package.json`
  - Verify: 1. grep -q '"name": "umb-cli"' package.json && grep -q 'UMB' dist-test/src/logo.ts && grep -q 'umb' dist-test/src/help-text.ts
2. umb --version returns 2.70.1
3. umb --help first line contains 'UMB'

- [x] **T02: Run final verification suite and confirm demo** `est:15m`
  Execute the full verification suite against the rebuilt umb fork to confirm the demo outcome: 'umb binary still shows umb branding, help text correct, all commands work'.

Steps:
1. Run TypeScript compilation check: cd /home/cid/projects-personal/umb && npx tsc --noEmit
2. Run unit tests: cd /home/cid/projects-personal/umb && npm run test:unit (expect 5821 pass, 11 pre-existing failures)
3. Run smoke tests: cd /home/cid/projects-personal/umb && npm run test:smoke (expect 2 pass, 1 pre-existing TTY failure)
4. Verify binary branding: umb --version shows 2.70.1, umb --help shows 'UMB — Umbrella Blade' header
5. Spot-check key commands: umb config --help, umb sessions --help, umb worktree --help

The 11 unit test failures and 1 smoke test failure are all pre-existing (documented in S02 summary). This task does NOT fix them — it only confirms they haven't grown.
  - Verify: 1. npx tsc --noEmit exits 0
2. npm run test:unit passes >= 5800 tests
3. npm run test:smoke passes >= 2 tests
4. umb --version outputs 2.70.1
5. umb --help output contains 'UMB' and 'umb' (not 'gsd' in header line)

## Files Likely Touched

- package.json
- dist-test/src/logo.ts
- dist-test/src/loader.ts
- dist-test/src/help-text.ts
- pkg/package.json

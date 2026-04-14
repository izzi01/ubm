---
estimated_steps: 10
estimated_files: 5
skills_used: []
---

# T01: Audit user-facing branding and rebuild binary

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

## Inputs

- `package.json`
- `dist-test/src/logo.ts`
- `dist-test/src/loader.ts`
- `dist-test/src/help-text.ts`

## Expected Output

- `package.json`
- `dist-test/src/logo.ts`
- `dist-test/src/loader.ts`
- `dist-test/src/help-text.ts`

## Verification

1. grep -q '"name": "umb-cli"' package.json && grep -q 'UMB' dist-test/src/logo.ts && grep -q 'umb' dist-test/src/help-text.ts
2. umb --version returns 2.70.1
3. umb --help first line contains 'UMB'

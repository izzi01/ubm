# S02: Rebrand loader.js and app-paths — UAT

**Milestone:** M103
**Written:** 2026-04-11T03:11:55.557Z

## S02 UAT: Rebrand loader.js and app-paths

### Test 1: Version
- `cd /home/cid/projects-personal/umb && node dist/loader.js --version`
- **Expected**: Prints version number

### Test 2: Help text
- `cd /home/cid/projects-personal/umb && node dist/loader.js --help | head -1`
- **Expected**: Shows "UMB v2.70.0 — Umbrella Blade"

### Test 3: No gsd branding in core files
- `grep -ci 'gsd' src/loader.ts src/app-paths.ts src/help-text.ts src/logo.ts`
- **Expected**: 0 matches in all files

### Test 4: Config dir
- `grep '.umb' src/app-paths.ts`
- **Expected**: Shows ~/.umb path references

# S03: Strip gsd extension, keep pi SDK + shared extensions — UAT

**Milestone:** M103
**Written:** 2026-04-11T03:12:58.284Z

## S03 UAT: Verify TUI launches with rebranded config

### Test 1: Version
- `cd /home/cid/projects-personal/umb && node dist/loader.js --version`
- **Expected**: Prints 2.70.0

### Test 2: Help text
- `cd /home/cid/projects-personal/umb && node dist/loader.js --help | head -1`
- **Expected**: "UMB v2.70.0 — Umbrella Blade"

### Test 3: Process title
- `grep 'process.title' dist/loader.js`
- **Expected**: process.title = 'umb'

### Test 4: Config directory
- `grep '.umb' dist/app-paths.js`
- **Expected**: References to ~/.umb

### Test 5: Extensions present
- `ls dist/resources/extensions/`
- **Expected**: browser-tools, subagent, mcp-client, etc. all present

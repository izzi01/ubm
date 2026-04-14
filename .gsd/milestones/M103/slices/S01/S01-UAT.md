# S01: Clone gsd-2 and verify build — UAT

**Milestone:** M103
**Written:** 2026-04-11T03:07:20.101Z

## S01 UAT: Fork gsd-2 and verify build

### Test 1: Clone exists
- Open terminal
- `ls /home/cid/projects-personal/umb/` — should show src/, packages/, pkg/, scripts/, dist/
- **Expected**: Directory listing shows all expected directories

### Test 2: Build works
- `cd /home/cid/projects-personal/umb && npm run build`
- **Expected**: Build completes without errors, dist/ updated

### Test 3: Loader binary works
- `cd /home/cid/projects-personal/umb && node dist/loader.js --version`
- **Expected**: Prints version number (2.70.0)

### Test 4: Help text
- `cd /home/cid/projects-personal/umb && node dist/loader.js --help`
- **Expected**: Prints GSD help text with version info

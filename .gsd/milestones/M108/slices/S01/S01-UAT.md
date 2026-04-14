# S01: Remove update-check module and CLI integration — UAT

**Milestone:** M108
**Written:** 2026-04-12T04:52:07.048Z

## UAT: S01 — Remove update-check module and CLI integration

### Test 1: Files deleted
- [ ] `ls /home/cid/projects-personal/umb/src/update-check.ts` returns "No such file"
- [ ] `ls /home/cid/projects-personal/umb/src/update-cmd.ts` returns "No such file"

### Test 2: cli.ts is clean
- [ ] `grep -n 'checkForUpdates\|update-check\|update-cmd\|runUpdate' /home/cid/projects-personal/umb/src/cli.ts` returns no matches
- [ ] `grep -n 'gsd-pi' /home/cid/projects-personal/umb/src/cli.ts` returns no matches

### Test 3: No gsd update command
- [ ] The `gsd update` handler block is removed from cli.ts

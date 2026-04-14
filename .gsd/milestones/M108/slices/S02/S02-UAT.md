# S02: Remove update-service and inline compareSemver — UAT

**Milestone:** M108
**Written:** 2026-04-12T04:52:00.211Z

## UAT: S02 — Remove update-service and inline compareSemver

### Test 1: No update-service.ts file
- [ ] `ls /home/cid/projects-personal/umb/src/web/update-service.ts` returns "No such file"
- [ ] `ls /home/cid/projects-personal/umb/src/tests/update-check.test.ts` returns "No such file"

### Test 2: resource-loader.ts is self-contained
- [ ] `grep -n 'update-check' /home/cid/projects-personal/umb/src/resource-loader.ts` returns no matches
- [ ] `grep -n 'compareSemver' /home/cid/projects-personal/umb/src/resource-loader.ts` shows a local function definition

### Test 3: windows-portability test is clean
- [ ] `grep -n 'update-service' /home/cid/projects-personal/umb/src/tests/windows-portability.test.ts` returns no matches

### Test 4: No stale imports anywhere
- [ ] `grep -rn 'from.*update-check\|from.*update-cmd\|from.*update-service' /home/cid/projects-personal/umb/src/ --include='*.ts'` returns no matches

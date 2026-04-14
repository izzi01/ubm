# M108: Remove GSD update check mechanism

## Vision
Since this project is forked from gsd-pi and no longer depends on the upstream npm package, all update-check infrastructure is dead weight. Remove `update-check.ts`, `update-cmd.ts`, `update-service.ts`, their imports/callers in `cli.ts` and `resource-loader.ts`, related tests, and any stale references to `gsd update` or npm registry checks. Preserve `compareSemver` utility where it has non-update uses (resource-loader).

## Slice Overview
| ID | Slice | Risk | Depends | Done | After this |
|----|-------|------|---------|------|------------|
| S01 | S01 | low | — | ✅ | CLI starts without any npm registry check; `gsd update` command removed |
| S02 | S02 | low | — | ✅ | No update-service.ts file; resource-loader.ts has its own compareSemver |

# M107: Merge upstream v2.70.1

## Vision
Merge all upstream changes from gsd-2 v2.70.0 → v2.70.1 into the umb fork. This brings in ~28 commits with significant GSD state refactor, TOCTOU file-lock fixes, MCP stream ordering, secure_env_collect, TUI pinned output fixes, model routing changes, and new docs. The merge must be clean and our umb extension must remain fully functional with zero test regressions.

## Slice Overview
| ID | Slice | Risk | Depends | Done | After this |
|----|-------|------|---------|------|------------|
| S01 | S01 | high | — | ✅ | Upstream merged cleanly into umb fork with all conflicts resolved |
| S02 | S02 | medium | — | ✅ | All umb extension tests pass, smoke tests pass, no regressions from upstream changes |
| S03 | S03 | low | — | ✅ | umb binary still shows umb branding, help text correct, all commands work |

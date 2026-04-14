# M104: Port iz-to-mo-vu extension into the umb fork

## Vision
Move all iz-to-mo-vu code (skill registry, model config, bmad commands, skill commands) into the forked gsd-2 repo as a built-in extension. Fix API compatibility, wire up commands, and get the full test suite passing in the fork context. Depends on M103 (fork must build first).

## Slice Overview
| ID | Slice | Risk | Depends | Done | After this |
|----|-------|------|---------|------|------------|
| S01 | S01 | high | — | ✅ | tsc --noEmit passes for all ported extension code |
| S02 | S02 | high | — | ✅ | /umb model shows model config, /skill list shows 149 skills, /skill new test-skill works, /skill run creates a session |
| S03 | S03 | medium | — | ✅ | npx vitest run passes all umb extension tests |

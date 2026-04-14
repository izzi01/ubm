---
id: T04
parent: S01
milestone: M112
key_files:
  - src/resources/extensions/umb/commands/bmad-commands.ts
key_decisions:
  - findBmadAgents() now matches SKILL.md files inside bmad-agent-* directories instead of any .md in paths containing 'agents'
duration: 
verification_result: passed
completed_at: 2026-04-13T08:20:58.947Z
blocker_discovered: false
---

# T04: Fixed findBmadAgents() path filter bug — changed from "agents" (plural) to bmad-agent-* directory + SKILL.md match, now correctly discovers all 6 BMAD agents

**Fixed findBmadAgents() path filter bug — changed from "agents" (plural) to bmad-agent-* directory + SKILL.md match, now correctly discovers all 6 BMAD agents**

## What Happened

The `/bmad list` command was broken because findBmadAgents() filtered files by checking `rel.includes("agents")` (plural), but BMAD v6.3.0 agent directories use `bmad-agent-*` naming (singular). This caused 0 of the 6 main agents to be discovered. Initial fix to use "agent" (singular) was too broad, matching 10 files including non-SKILL.md prompt files inside agent directories. Final fix checks that the parent directory starts with `bmad-agent-` AND the file is named `SKILL.md`, yielding exactly 6 agents.

## Verification

Ran inline simulation of findBmadAgents() confirming 6 agents discovered. Verified with `find _bmad/bmm -name SKILL.md -path '*bmad-agent-*' | wc -l` returning 6. Project typecheck passes with no new errors.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `find _bmad/bmm -name SKILL.md -path '*bmad-agent-*' | wc -l` | 0 | ✅ pass (6) | 200ms |
| 2 | `npx tsx findBmadAgents simulation` | 0 | ✅ pass (6 agents) | 500ms |
| 3 | `npm run typecheck:extensions` | 0 | ✅ pass (pre-existing errors only) | 8000ms |

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `src/resources/extensions/umb/commands/bmad-commands.ts`

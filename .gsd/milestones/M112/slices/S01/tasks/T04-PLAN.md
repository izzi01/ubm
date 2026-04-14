---
estimated_steps: 1
estimated_files: 1
skills_used: []
---

# T04: Verify /bmad list discovers installed agents and skills

Run `/bmad list` command and verify it discovers all 6 agents from _bmad/ directory. The existing bmad-commands.ts findBmadAgents() scans _bmad/ for agent definitions — verify it picks up the newly installed skills. Check that the widget output shows agents grouped by module.

## Inputs

- `_bmad/ directory from T01, T02`

## Expected Output

- `/bmad list shows 6+ agents`

## Verification

grep -c 'bmad-agent-' _bmad/bmm/skills/*/SKILL.md 2>/dev/null | grep -q '6' && echo 'OK'

## Observability Impact

none

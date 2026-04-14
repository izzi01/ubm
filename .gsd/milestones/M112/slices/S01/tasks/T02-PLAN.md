---
estimated_steps: 1
estimated_files: 1
skills_used: []
---

# T02: Verify all 6 agents and 20+ skills are installed

Run `find _bmad/bmm/skills -name 'SKILL.md' | wc -l` to count installed skills. List all skill directories. Verify all 6 agent skill directories exist: bmad-agent-analyst, bmad-pm, bmad-architect, bmad-agent-dev, bmad-ux-designer, bmad-tech-writer. Verify core skills exist: bmad-help, bmad-brainstorming. Verify phase skills exist for all 4 phases (analysis, planning, solutioning, implementation).

## Inputs

- `_bmad/ directory from T01`

## Expected Output

- `skill inventory list`

## Verification

test $(find _bmad/bmm/skills -name 'SKILL.md' | wc -l) -ge 20 && echo 'OK'

## Observability Impact

none

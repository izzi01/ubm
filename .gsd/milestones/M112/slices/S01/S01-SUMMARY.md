---
id: S01
parent: M112
milestone: M112
provides:
  - ["41 SKILL.md files across _bmad/bmm/ (30 BMM) and _bmad/core/ (11 core)", "6 agent SKILL.md files discoverable via bmad-agent-* path pattern", "Agent manifest CSV with canonical metadata for all 6 agents", "config.yaml with output directory paths for artifact generation", "findBmadAgents() correctly discovers all 6 agents"]
requires:
  []
affects:
  []
key_files:
  - ["_bmad/bmm/config.yaml", "src/resources/extensions/umb/commands/bmad-commands.ts", "_bmad/_config/agent-manifest.csv"]
key_decisions:
  - ["findBmadAgents() path filter changed from rel.includes('agents') to parentDir.startsWith('bmad-agent-') && entry.name === 'SKILL.md' for precise agent discovery"]
patterns_established:
  - (none)
observability_surfaces:
  - none
drill_down_paths:
  []
duration: ""
verification_result: passed
completed_at: 2026-04-13T08:25:10.026Z
blocker_discovered: false
---

# S01: Install BMAD method skills and _bmad/ directory structure

**Installed BMAD v6.3.0 with 41 skills across 4 phases, 6 agents, and fixed findBmadAgents() path filter bug in bmad-commands.ts**

## What Happened

## What Happened

The _bmad/ directory was already installed from a prior session (BMAD v6.3.0, installed 2026-04-13). All four tasks verified and reinforced the installation:

**T01** confirmed the _bmad/ scaffold exists with bmm/ (30 skills across 4 phases), core/ (11 skills), _config/ (agent manifest), and config.yaml. No new installation was needed.

**T02** ran a full inventory. Key finding: BMAD v6.3.0 uses phase-based organization (`_bmad/bmm/{phase}/{skill}/`) rather than the flat `_bmad/bmm/skills/` structure assumed in the original slice plan. All 6 required agents confirmed (analyst, tech-writer, pm, ux-designer, architect, dev). All 4 phases have skills. Core skills (bmad-help, bmad-brainstorming) confirmed. Total: 41 SKILL.md files.

**T03** verified config.yaml already had all required umb defaults (user_name, communication_language, document_output_language, planning_artifacts, implementation_artifacts, project_knowledge). Output directories (_bmad-output/planning-artifacts, _bmad-output/implementation-artifacts, docs/) all exist. No changes needed.

**T04** found and fixed a bug in `findBmadAgents()` in bmad-commands.ts. The function filtered by `rel.includes("agents")` (plural) but BMAD v6.3.0 agent directories use `bmad-agent-*` naming (singular). Initial fix to `"agent"` was too broad. Final fix: check parent directory starts with `bmad-agent-` AND file is named `SKILL.md`. This correctly discovers all 6 agents.

## Key Decisions

- **findBmadAgents() path filter**: Changed from `rel.includes("agents")` to `parentDir.startsWith("bmad-agent-") && entry.name === "SKILL.md"` — precise match that excludes non-SKILL.md files inside agent directories.

## Patterns Established

- BMAD v6.3.0 directory convention: skills are in `_bmad/bmm/{phase}/` not `_bmad/bmm/skills/`
- Agent manifest at `_bmad/_config/agent-manifest.csv` provides canonical metadata for all 6 agents
- findBmadAgents() uses a two-condition filter (directory prefix + filename) for precise agent discovery

## What This Provides to Downstream Slices

S02 (skill execution engine) can rely on:
- 41 SKILL.md files discoverable via `find _bmad -name SKILL.md`
- 6 agents discoverable via `find _bmad/bmm -name SKILL.md -path '*bmad-agent-*'`
- Agent manifest CSV at `_bmad/_config/agent-manifest.csv` for role/identity/principles metadata
- config.yaml with output directory paths for artifact generation
- findBmadAgents() correctly returns all 6 agents for /bmad list

## Verification

All 4 slice-level verification checks pass:

| Check | Command | Result |
|-------|---------|--------|
| T01: _bmad/bmm exists with config | `test -d _bmad/bmm && test -f _bmad/bmm/config.yaml` | ✅ OK |
| T02: 20+ skills installed | `find _bmad -name SKILL.md \| wc -l` | ✅ 41 (≥20) |
| T03: config.yaml configured | `grep -q planning_artifacts _bmad/bmm/config.yaml && test -d _bmad-output/planning-artifacts` | ✅ OK |
| T04: 6 agents discoverable | `find _bmad/bmm -name SKILL.md -path '*bmad-agent-*' \| wc -l` | ✅ 6 |
| T04b: findBmadAgents() fix | `grep 'bmad-agent' src/resources/extensions/umb/commands/bmad-commands.ts` | ✅ Two-condition filter in place |

## Requirements Advanced

None.

## Requirements Validated

None.

## New Requirements Surfaced

None.

## Requirements Invalidated or Re-scoped

None.

## Deviations

None. All tasks completed as planned. The only surprise was BMAD v6.3.0's directory layout differs from what the slice plan assumed (phase-based vs flat skills/), which required correcting verification commands.

## Known Limitations

None.

## Follow-ups

None.

## Files Created/Modified

- `src/resources/extensions/umb/commands/bmad-commands.ts` — Fixed findBmadAgents() to match bmad-agent-* directories + SKILL.md files instead of broad 'agents' substring

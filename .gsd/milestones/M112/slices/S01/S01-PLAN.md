# S01: Install BMAD method skills and _bmad/ directory structure

**Goal:** Install BMAD method skills into the umb fork so they're available for /bmad commands and auto-mode. After this slice, `_bmad/` exists with 6 agents and 20+ skills, and `/bmad list` discovers them all.
**Demo:** `/bmad list` shows all 6 agents and 20+ skills. `_bmad/` directory exists with BMAD skill definitions.

## Must-Haves

- Not provided.

## Proof Level

- This slice proves: Not provided.

## Integration Closure

Not provided.

## Verification

- Not provided.

## Tasks

- [x] **T01: Run npx bmad-method install to scaffold _bmad/ directory** `est:15m`
  Run `npx bmad-method install` in the project directory with non-interactive flags to install the BMM module. Use `--directory . --modules bmm --yes` for CI-style install. Verify _bmad/ directory structure is created with config.yaml, skills/, and agents/.
  - Files: `_bmad/`
  - Verify: test -d _bmad/bmm/skills && test -f _bmad/bmm/config.yaml && echo 'OK'

- [x] **T02: Verify all 6 agents and 20+ skills are installed** `est:5m`
  Run `find _bmad/bmm/skills -name 'SKILL.md' | wc -l` to count installed skills. List all skill directories. Verify all 6 agent skill directories exist: bmad-agent-analyst, bmad-pm, bmad-architect, bmad-agent-dev, bmad-ux-designer, bmad-tech-writer. Verify core skills exist: bmad-help, bmad-brainstorming. Verify phase skills exist for all 4 phases (analysis, planning, solutioning, implementation).
  - Files: `_bmad/bmm/skills/`
  - Verify: test $(find _bmad/bmm/skills -name 'SKILL.md' | wc -l) -ge 20 && echo 'OK'

- [x] **T03: Configure _bmad/bmm/config.yaml with umb defaults** `est:10m`
  Update _bmad/bmm/config.yaml with sensible defaults for umb: user_name, communication_language: English, document_output_language: English, planning_artifacts pointing to _bmad-output/planning-artifacts, implementation_artifacts to _bmad-output/implementation-artifacts, project_knowledge to docs/. Ensure output directories exist.
  - Files: `_bmad/bmm/config.yaml`, `_bmad-output/`, `docs/`
  - Verify: test -f _bmad/bmm/config.yaml && grep -q 'planning_artifacts' _bmad/bmm/config.yaml && test -d _bmad-output/planning-artifacts && echo 'OK'

- [x] **T04: Verify /bmad list discovers installed agents and skills** `est:10m`
  Run `/bmad list` command and verify it discovers all 6 agents from _bmad/ directory. The existing bmad-commands.ts findBmadAgents() scans _bmad/ for agent definitions — verify it picks up the newly installed skills. Check that the widget output shows agents grouped by module.
  - Files: `src/resources/extensions/umb/commands/bmad-commands.ts`
  - Verify: grep -c 'bmad-agent-' _bmad/bmm/skills/*/SKILL.md 2>/dev/null | grep -q '6' && echo 'OK'

## Files Likely Touched

- _bmad/
- _bmad/bmm/skills/
- _bmad/bmm/config.yaml
- _bmad-output/
- docs/
- src/resources/extensions/umb/commands/bmad-commands.ts

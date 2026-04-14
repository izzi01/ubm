# S01: Install BMAD method skills and _bmad/ directory structure — UAT

**Milestone:** M112
**Written:** 2026-04-13T08:25:10.026Z

# UAT: S01 — Install BMAD method skills and _bmad/ directory structure

## Preconditions
- Working directory: `/home/cid/projects-personal/umb`
- Node.js available
- _bmad/ directory exists from BMAD v6.3.0 installation

---

## TC-01: _bmad directory structure is complete

**Steps:**
1. Run `ls _bmad/`
2. Verify directories: `bmm/`, `core/`, `_config/`

**Expected:** All three directories present.

---

## TC-02: All 6 BMAD agents are installed

**Steps:**
1. Run `find _bmad/bmm -name SKILL.md -path '*bmad-agent-*'`
2. Count results

**Expected:** Exactly 6 SKILL.md files found:
- bmad-agent-analyst
- bmad-agent-tech-writer
- bmad-agent-pm
- bmad-agent-ux-designer
- bmad-agent-architect
- bmad-agent-dev

---

## TC-03: 20+ skills installed across all phases

**Steps:**
1. Run `find _bmad -name SKILL.md | wc -l`

**Expected:** Count ≥ 20 (actual: 41)

---

## TC-04: All 4 BMAD phases have skills

**Steps:**
1. Run `find _bmad/bmm -maxdepth 2 -name SKILL.md -path '*/1-analysis/*' | wc -l`
2. Run `find _bmad/bmm -maxdepth 2 -name SKILL.md -path '*/2-plan-workflows/*' | wc -l`
3. Run `find _bmad/bmm -maxdepth 2 -name SKILL.md -path '*/3-solutioning/*' | wc -l`
4. Run `find _bmad/bmm -maxdepth 2 -name SKILL.md -path '*/4-implementation/*' | wc -l`

**Expected:** Each phase has ≥ 1 skill.

---

## TC-05: config.yaml has umb defaults

**Steps:**
1. Run `cat _bmad/bmm/config.yaml`

**Expected:** Contains:
- `user_name:` (non-empty)
- `communication_language: English`
- `document_output_language: English`
- `planning_artifacts:` (non-empty path)
- `implementation_artifacts:` (non-empty path)
- `project_knowledge:` (non-empty path)

---

## TC-06: Output directories exist

**Steps:**
1. Run `test -d _bmad-output/planning-artifacts && echo OK`
2. Run `test -d _bmad-output/implementation-artifacts && echo OK`

**Expected:** Both directories exist.

---

## TC-07: Core skills exist

**Steps:**
1. Run `test -f _bmad/core/bmad-help/SKILL.md && echo OK`
2. Run `test -f _bmad/core/bmad-brainstorming/SKILL.md && echo OK`

**Expected:** Both files exist.

---

## TC-08: findBmadAgents() discovers all 6 agents

**Steps:**
1. Run `grep -c 'bmad-agent-' src/resources/extensions/umb/commands/bmad-commands.ts`

**Expected:** Output shows the bmad-agent-* filter is present in the code.

---

## TC-09: Agent manifest is present

**Steps:**
1. Run `head -1 _bmad/_config/agent-manifest.csv`

**Expected:** CSV header line: `name,displayName,title,icon,capabilities,role,identity,communicationStyle,principles,module,path,canonicalId`

---

## Edge Case: No _bmad/bmm/skills/ directory (v6.3.0 uses phase-based layout)

**Steps:**
1. Run `test -d _bmad/bmm/skills && echo EXISTS || echo ABSENT`

**Expected:** ABSENT — BMAD v6.3.0 does not use a flat skills/ directory.

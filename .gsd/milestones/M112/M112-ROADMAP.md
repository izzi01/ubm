# M112: Implement BMAD method - /bmad auto with 4-phase pipeline and gsd-orchestrator integration

## Vision
Implement the full BMAD (Breakthrough Method for Agile AI Driven Development) as a native capability within umb. The BMAD method provides a structured 4-phase pipeline for software development: Analysis (research, briefs, PRD), Planning (workflows, epics), Solutioning (architecture, UX design), and Implementation (code). This milestone installs the BMAD skill definitions, builds a skill execution engine, implements phase-specific /bmad auto commands, and integrates with gsd-orchestrator so that BMAD discovery feeds directly into GSD execution. The result: `/bmad auto 'Build X'` produces all planning artifacts, then gsd-orchestrator picks them up and builds the software.

## Slice Overview
| ID | Slice | Risk | Depends | Done | After this |
|----|-------|------|---------|------|------------|
| S01 | S01 | medium | — | ✅ | `/bmad list` shows all 6 agents and 20+ skills. `_bmad/` directory exists with BMAD skill definitions. |
| S02 | S02 | high | — | ✅ | `/bmad run bmad-product-brief 'OAuth provider'` loads the analyst agent, runs the product brief workflow stages, and produces a brief artifact in `_bmad-output/` |
| S03 | S03 | medium | — | ✅ | `/bmad auto-analysis 'Build a REST API'` runs research → brief → prfaq → document-project workflows using analyst agent, produces analysis artifacts in `_bmad-output/planning-artifacts/` |
| S04 | S04 | medium | — | ✅ | `/bmad auto-planning 'Build a REST API'` runs create-prd → create-ux-design workflows using PM + UX agents, reads Phase 1 artifacts as context |
| S05 | S05 | medium | — | ✅ | `/bmad auto-solutioning 'Build a REST API'` runs create-architecture → create-epics-and-stories → implementation-readiness using architect + PM agents |
| S06 | S06 | high | — | ✅ | `/bmad auto-implementation` runs sprint-planning → create-story → dev-story → code-review cycle using dev agent, reads Phase 3 artifacts |
| S07 | S07 | medium | — | ✅ | gsd-orchestrator build-from-spec workflow runs: (1) /bmad auto for discovery, (2) reads PRD + architecture, (3) passes to `gsd headless new-milestone --context` |

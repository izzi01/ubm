---
id: M112
title: "Implement BMAD method — /bmad auto with 4-phase pipeline and gsd-orchestrator integration"
status: complete
completed_at: 2026-04-13T17:28:04.038Z
key_decisions:
  - findBmadAgents() uses two-condition filter (parentDir.startsWith('bmad-agent-') && entry.name === 'SKILL.md') for precise agent discovery
  - Regex-based YAML parsing (no library) for consistency with skill-registry pattern
  - 3-pass iterative template resolution for transitive variable references in config.yaml
  - Prompt composition order: header → config → skill body → stage prompts → agent definitions → user message
  - Refactored 4 near-identical phase handlers into shared executeAutoPipeline() with PhaseConfig + ALL_PHASES data-driven pattern
  - build-from-spec uses factory pattern with injectable pipelineRunner for testability
key_files:
  - _bmad/bmm/config.yaml
  - src/resources/extensions/umb/bmad-executor/types.ts
  - src/resources/extensions/umb/bmad-executor/loader.ts
  - src/resources/extensions/umb/bmad-executor/index.ts
  - src/resources/extensions/umb/bmad-pipeline/types.ts
  - src/resources/extensions/umb/bmad-pipeline/pipelines.ts
  - src/resources/extensions/umb/bmad-pipeline/executor.ts
  - src/resources/extensions/umb/bmad-pipeline/index.ts
  - src/resources/extensions/umb/commands/bmad-commands.ts
  - src/resources/extensions/umb/commands/gsd-commands.ts
  - src/resources/extensions/umb/tests/bmad-executor.test.ts
  - src/resources/extensions/umb/tests/bmad-pipeline.test.ts
  - src/resources/extensions/umb/tests/bmad-commands.test.ts
  - src/resources/extensions/umb/tests/gsd-commands.test.ts
lessons_learned:
  - BMAD v6.3.0 directory structure is phase-based (_bmad/bmm/{phase}/) not flat — verification commands must match actual layout
  - Pipeline infrastructure (bmad-pipeline module) proved cleanly extensible — adding phases S04-S06 required only pipeline definitions and command handlers with zero executor changes
  - The executeAutoPipeline() refactor in S07 eliminated ~200 lines of duplicated handler code — shared executor pattern should be the default for multi-variant command handlers
  - bmad-executor.test.ts uses node:test format requiring compiled .js files — vitest cannot run it directly; this is a known limitation documented in KNOWLEDGE.md
---

# M112: Implement BMAD method — /bmad auto with 4-phase pipeline and gsd-orchestrator integration

**Implemented the full BMAD 4-phase auto-pipeline (analysis → planning → solutioning → implementation) with skill execution engine, 7 /bmad commands, /gsd build-from-spec orchestration, and 118 passing tests.**

## What Happened

M112 delivered the complete BMAD (Breakthrough Method for Agile AI Driven Development) integration into umb across 7 slices:

**S01** installed BMAD v6.3.0 with 41 SKILL.md files (30 BMM + 11 core), 6 agents, and fixed findBmadAgents() path filter bug. **S02** built the bmad-executor module (findBmadSkills, loadBmadSkill, resolveBmadConfig, composeExecutionPrompt) with /bmad run and /bmad skills commands (46 tests). **S03** created the bmad-pipeline module with ANALYSIS_PIPELINE (6 stages) and runPipeline() executor with context accumulation, dry-run, and sessionFactory pattern; wired /bmad auto-analysis and /bmad auto routing (45 tests). **S04** added PLANNING_PIPELINE (bmad-create-prd → bmad-create-ux-design) and /bmad auto-planning (61 tests). **S05** added SOLUTIONING_PIPELINE (3 stages) and /bmad auto-solutioning (76 tests). **S06** added IMPLEMENTATION_PIPELINE (4 stages) and /bmad auto-implementation (92 tests). **S07** refactored 4 near-identical handlers into shared executeAutoPipeline(), added /bmad auto umbrella mode (all phases or --stop-after), and built /gsd build-from-spec BMAD→GSD orchestration with readBmadArtifacts() and composeGsdContext() helpers (118 tests).

The key architectural pattern is PhaseConfig + ALL_PHASES — phases defined as data, not code, making it trivial to add/reorder. The build-from-spec factory pattern with injectable pipelineRunner ensures testability. All 4 BMAD phases are now dispatchable from /bmad auto.

## Success Criteria Results

| Criterion | Evidence | Status |
|-----------|----------|--------|
| `/bmad list` shows 6 agents and 20+ skills | findBmadAgents() returns 6 agents; findBmadSkills() discovers 38 skills; 41 SKILL.md files in _bmad/ | ✅ Pass |
| `/bmad run` loads skill and creates session | handleBmadRun with fuzzy matching, loadBmadSkill, composeExecutionPrompt, ctx.newSession; 17 command tests | ✅ Pass |
| `/bmad auto-analysis` runs 6-stage Phase 1 pipeline | ANALYSIS_PIPELINE with domain-research → market-research → technical-research → product-brief → prfaq → document-project; runPipeline with context accumulation | ✅ Pass |
| `/bmad auto-planning` runs 2-stage Phase 2 pipeline | PLANNING_PIPELINE with bmad-create-prd → bmad-create-ux-design; reads Phase 1 artifacts as context | ✅ Pass |
| `/bmad auto-solutioning` runs 3-stage Phase 3 pipeline | SOLUTIONING_PIPELINE with architecture → epics-and-stories → implementation-readiness | ✅ Pass |
| `/bmad auto-implementation` runs 4-stage Phase 4 pipeline | IMPLEMENTATION_PIPELINE with sprint-planning → create-story → dev-story → code-review | ✅ Pass |
| gsd-orchestrator build-from-spec works | /gsd build-from-spec chains all 4 phases, reads PRD + architecture, composes GSD context, starts GSD session; readBmadArtifacts() + composeGsdContext() helpers | ✅ Pass |
| 118+ tests pass | 40 pipeline + 60 bmad-commands + 29 executor (node:test) + 18 gsd-commands = 147 total; 118 pass via vitest, 29 via node:test after compile | ✅ Pass |

## Definition of Done Results

| DoD Item | Status | Evidence |
|----------|--------|----------|
| All 7 slices complete | ✅ | All slices S01-S07 status: complete, all tasks 4/4 or 2/2 done |
| All slice summaries exist | ✅ | 7 SUMMARY.md files in .gsd/milestones/M112/slices/S*/S*-SUMMARY.md |
| Code compiles without errors | ✅ | tsc --noEmit passes; npm run test:compile succeeds (1488 files) |
| Tests pass | ✅ | 118 vitest tests pass (40 pipeline + 60 bmad-commands + 18 gsd-commands); 29 node:test executor tests pass after compile |
| No regressions in existing tests | ✅ | Each slice summary explicitly confirms zero regressions |
| Cross-slice integration works | ✅ | S04-S06 reuse S03 pipeline infrastructure; S07 consumes ALL_PHASES from bmad-commands.ts in gsd-commands.ts |

## Requirement Outcomes

No requirements changed status during M112. All work was feature-additive with no requirement coverage gaps surfaced.

## Deviations

None.

## Follow-ups

None.

# Umbrella Blade — Coding Terminal

## What This Is

A **coding agent terminal** forked from [GSD-2](https://github.com/gsd-build/gsd-2), built on the pi SDK. The key differentiator:

- **BMAD** handles the **discovery phase** — analyst research, architect design, PM roadmapping via the pro-max agent suite
- **GSD** handles the **execution phase** — milestone/slice/task decomposition, auto-mode state machine, verified delivery
- **Pro-max OpenCode skills** integrate both phases into a seamless developer workflow

## Stack

| Layer | Technology |
|-------|-----------|
| Base SDK | Forked from gsd-pi (pi-mono) |
| Execution Engine | GSD workflow (milestones → slices → tasks, auto-mode state machine) |
| Discovery | BMAD agent framework (PM, Architect, Dev, TEA, Analyst, etc.) |
| Skills | Pro-max suite (OpenCode skills for research, planning, dev, SEO) |
| Testing | Vitest |
| Database | better-sqlite3 (synchronous SQLite) |
| Language | TypeScript |

## Current State

- **Fork repo**: `/home/cid/projects-personal/umb/` (forked from gsd-2, now at v2.70.1)
- **Extension code**: `/home/cid/projects-personal/iz-to-mo-vu/` (ported into fork in M104)
- BMAD agent catalog fully built out (`_bmad/`)
- Pattern library implemented (`src/patterns/`) — agent babysitter, error retry, worktree isolation, shadow workspace, TDD guard, etc.
- OpenCode configs for multiple tiers (`opencode-config/`)
- PRD completed via BMAD (`_bmad-output/planning-artifacts/prd.md`)
- **M001 complete**: Extension scaffold (S01 ✅), state machine + gates (S02 ✅), GSD tools + commands + pattern control (S03 ✅), dashboard UI + integration tests (S04 ✅)
- **M101 complete**: Model config system (S01 ✅), BMAD discovery commands (S02 ✅), PRD import bridge (S03 ✅)
- **M102 complete**: Skill execution framework — S01 skill registry ✅ (149/169 skills indexed), S02 /skill list + /skill new ✅, S03 /skill run ✅ (session creation with model routing)
- **M103 complete**: Fork gsd-2 and rebrand to umb — S01 clone+build ✅, S02 full rebrand ✅, S03 verify ✅. Fork at `~/projects-personal/umb/`, binary `umb`, config `~/.umb/`
- **M104 complete**: Port iz-to-mo-vu extension into fork — S01 port source ✅ (tsc --noEmit zero errors), S02 wire commands ✅ (63 smoke tests passing), S03 port tests ✅ (157/157 umb tests, 682/688 total)
- **M105 complete**: Global install and final polish — S01 global install setup ✅ (npm pack validated, workspace packages fixed, umb binary works from any directory), S02 smoke test and polish ✅ (8/8 checks pass, scripts/smoke-test.sh CI gate)
- **M106 complete**: Git-based skill install — S01 /skill install <git-url> ✅ (shallow clone, skill discovery, validation, conflict-safe copy), S02 /skill remove <name> ✅ (78/78 skill tests pass)
- **M107 complete**: Merge upstream v2.70.1 — S01 merge ✅ (fast-forward, branding preserved, fork builds clean), S02 verify ✅ (zero regressions, 5821 pass, branding intact), S03 rebrand sync ✅ (all 5 branding touchpoints verified, binary rebuilt at v2.70.1, smoke tests pass)
- **M108 complete**: Remove GSD update check mechanism
- **M109 complete**: Remove legacy slice branch artifacts — SLICE_BRANCH_RE, parseSliceBranch, dead isolation prefs ('branch'/'none') removed, GitPreferences.isolation narrowed to 'worktree' | undefined
- **M110 complete**: Complete isolation mode cleanup — S01 remove 'none'/'branch' from getIsolationMode and all consumers ✅ (getIsolationMode() now constant 'worktree', ~180 lines dead code removed, 2 obsolete test files deleted)
- **M111 complete**: Fix umb pattern test compilation — S01 fix vitest imports, .js extensions, and implicit any types ✅ (34 TS errors fixed across 11 test files, zero pattern test errors remaining)
- **M112 complete**: Implement BMAD method — S01 install BMAD skills + _bmad/ ✅, S02 BMAD skill execution engine ✅, S03 auto-analysis pipeline ✅, S04 auto-planning pipeline ✅, S05 auto-solutioning pipeline ✅, S06 auto-implementation pipeline ✅, S07 gsd-orchestrator integration ✅ (/bmad auto umbrella command, executeAutoPipeline() shared executor, /gsd build-from-spec BMAD→GSD orchestration, 118 tests pass)

## Architecture Notes

This project is now a **fork of gsd-2** (not an extension on top of it):
- Forked repo at `/home/cid/projects-personal/umb/` with full pi SDK bundle
- Rebranded: binary `umb`, config dir `~/.umb/`, env vars `UMB_*`, process.title `umb`
- 9 workspace packages: native, pi-tui, pi-ai, pi-agent-core, pi-coding-agent, rpc-client, mcp-server, daemon
- Extensions in `src/resources/extensions/` — gsd extension kept (deep coupling, removal deferred)
- **umb extension ported in M104**: all iz-to-mo-vu source in `src/resources/extensions/umb/`, compiles with zero errors, 157 tests pass
- State lives on disk in `.gsd/`
- Database layer (src/db/) with 5 tables: milestones, slices, tasks, requirements, decisions
- State machine (src/state-machine/) with linear transitions, phase detection, and gate system
- Gate system wraps state machine with configurable approval policies per slice
- 10 GSD tools registered as LLM-callable tools
- ContextScout pattern indexer scans src/patterns/ and _bmad/ for LLM-consumable pattern metadata
- GSD dashboard widget renders milestone/slice/task progress with status icons
- Model config system: .umb/models.yaml schema, tier presets, loadModelConfig() with validation
- Skill registry module: scanSkillDirs() discovers 149 of 169 real skills
- /skill install command: installSkillFromGit() with shallow clone, skill discovery, validation, conflict-safe copy
- /skill remove command: handleSkillRemove() with validation and cleanup
- /skill run command: handleSkillRun() with skill validation, model routing, session creation
- 157 command + registry + model-config tests in the umb extension
- BMAD skill execution engine: findBmadSkills() discovers 38 skills, loadBmadSkill() loads SKILL.md + prompts + agents + manifest, resolveBmadConfig() resolves config.yaml with transitive template variables, composeExecutionPrompt() builds structured prompts
- /bmad run <skill> <message> command: fuzzy matching, session creation with composed prompt
- /bmad skills command: lists all discoverable skills grouped by module with prompt/agent counts
- /bmad auto-analysis command: chains Phase 1 BMAD skills (6 stages) into sequential pipeline with context accumulation, dry-run, --list
- bmad-pipeline module: PipelineStage/PipelineDefinition types, ANALYSIS_PIPELINE definition, PLANNING_PIPELINE definition (2 stages: bmad-create-prd → bmad-create-ux-design), runPipeline() executor with sessionFactory pattern
- /bmad auto-planning command: chains Phase 2 BMAD skills with context accumulation, dry-run, --list, dispatch from /bmad auto planning
- SOLUTIONING_PIPELINE (Phase 3): 3 stages — bmad-create-architecture → bmad-create-epics-and-stories → bmad-implementation-readiness
- /bmad auto-solutioning command: chains Phase 3 BMAD skills with context accumulation, dry-run, --list, dispatch from /bmad auto solutioning
- IMPLEMENTATION_PIPELINE (Phase 4): 4 stages — bmad-sprint-planning → bmad-create-story → bmad-dev-story → bmad-code-review
- /bmad auto-implementation command: chains Phase 4 BMAD skills with context accumulation, dry-run, --list, dispatch from /bmad auto implementation
- AUTO_PHASES all marked implemented: true (analysis, planning, solutioning, implementation)
- Fork-level smoke tests (63 tests) use node:test runner
- executeAutoPipeline() shared executor: single function handles flag parsing, pipeline execution, progress reporting, error display for any BMAD phase
- PhaseConfig + ALL_PHASES configuration pattern: phases defined as data (pipeline, label, icon, number), trivial to add/reorder
- /bmad auto umbrella command: 3 modes — no args (all 4 phases), phase arg (single phase), --stop-after (partial pipeline)
- /gsd build-from-spec: orchestrates BMAD→GSD workflow — runs all 4 phases, reads artifacts from _bmad-output/planning-artifacts/, composes context, starts GSD session with gsd_milestone_plan instruction
- readBmadArtifacts() and composeGsdContext() helpers exported from gsd-commands.ts for testability

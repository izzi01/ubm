# Product Requirements Document — Umbrella Blade Coding Terminal

**Author:** Umbrella Blade Team
**Date:** 2026-04-07
**Version:** 2.1 (OAC Approval Gates + Pattern Control + BMAD v6.0-alpha.23 alignment)
**Status:** Draft — BMAD Discovery Sprint

---

## 1. Executive Summary

**Umbrella Blade** is an AI coding terminal built on [pi-mono](https://github.com/badlogic/pi-mono), inspired by [GSD-2](https://github.com/gsd-build/gsd-2), with approval-gated execution inspired by [OpenAgentsControl](https://github.com/darrenhinde/OpenAgentsControl).

**Core differentiator: "Understand before code, ask before act, verify before deliver."**

Three-phase workflow:

| Phase | Engine | Behavior |
|-------|--------|----------|
| **Discovery** | BMAD v6.0 (agents, workflows, research) | Agents research, analyze, plan — produce PRD, architecture |
| **Planning** | GSD (milestones, slices, tasks) | Structured decomposition with approval gates |
| **Execution** | GSD auto-mode + Approval Gates | Agent proposes → Human approves → Agent executes → Verifies |

Inspired by OpenAgentsControl's philosophy:
- **Approval Gates**: Agent ALWAYS asks before acting. Propose → Approve → Execute.
- **Pattern Control**: Define coding patterns once, agents reuse them forever.
- **ContextScout**: Smart pattern discovery — only load what's needed (MVI principle).
- **Editable Agents**: Agent behavior defined in markdown, fully customizable.

Integrated with our existing pro-max OpenCode skill suite for specialized capabilities across all phases.

## 2. Problem Statement

Current coding agents fail in three ways:

1. **Premature execution** — They write code before understanding the problem. Result: wrong implementations, context rot, expensive rework.
2. **Unverified output** — They declare "done" when code compiles, not when it works. Result: half-finished features, silent bugs, accumulated tech debt.
3. **No approval gates** — They auto-execute without asking. Result: unexpected changes, broken builds, "what did the AI just do?" moments. OpenAgentsControl proved that approval gates are the #1 quality control mechanism for AI coding.

BMAD solves #1. GSD solves #2. OpenAgentsControl solves #3. Nothing combines all three.

## 3. Product Vision

A coding terminal where:

1. You describe what you want to build
2. BMAD agents research, analyze, and produce a spec (research → brief → PRD → architecture)
3. You review and approve the spec
4. GSD takes over — decomposing into milestones, slices, tasks
5. **Approval gates fire** — agent proposes each plan, you approve before execution starts
6. Auto-mode executes each task with fresh context, verifying as it goes
7. **Pattern Control** ensures generated code matches your existing project conventions
8. You review delivered, verified code

The human controls **every phase transition** and **every destructive action**. Agents handle the work within approved boundaries.

### Approval Gate Modes (from OpenAgentsControl)

| Mode | When | What requires approval |
|------|------|----------------------|
| `strict` | Learning the system, sensitive codebases | Every file write, bash command, agent delegation |
| `plan-only` | **Default** — production use | Phase transitions, plans, slice boundaries |
| `autonomous` | Trusted codebase, CI/CD | No approval — full auto-mode (GSD-style) |

Toggle with `/gsd gates strict|plan-only|autonomous`

## 4. Target Users

### Primary: Solo Developer / Small Team Lead
- Writes code daily, uses AI agents already (Claude Code, Cursor)
- Frustrated by agents coding before understanding
- Wants structure without enterprise ceremony
- Values verification — ships code that works

### Secondary: Technical Founder
- Building MVPs solo, needs both speed and quality
- Wants autonomous execution but needs to trust the output
- Willing to invest 30 min upfront in discovery to save hours in rework

## 5. User Journeys

### Journey 1: New Feature Build
1. Dev opens terminal in project directory
2. Runs `/bmad research "Add user authentication with OAuth"`
3. Analyst agent researches OAuth providers, compares approaches
4. Dev reviews research, runs `/bmad brief` to refine scope
5. PM agent produces PRD with requirements
6. Architect agent designs system architecture
7. Dev runs `/gsd import` to load PRD into GSD
8. Dev runs `/gsd plan` to create milestone with slices
9. Dev runs `/gsd auto` — system executes autonomously
10. Each task verified; dev reviews summaries
11. Milestone complete — tested, verified code delivered

### Journey 2: Bug Fix (Quick Flow)
1. Dev describes the bug
2. System recognizes low complexity, skips full BMAD
3. GSD creates a quick task with verification
4. Single task executes and verifies
5. Done in minutes, not hours

### Journey 3: Project Bootstrap
1. Dev starts new project with `umb init`
2. BMAD discovery runs full pipeline
3. Architecture document feeds into GSD
4. First milestone planned and executed
5. Project has tested, working foundation code

## 6. Functional Requirements

### FR1: Per-Phase Model Configuration

Different LLM models have different strengths. The system shall allow independent model selection for each phase and role. This is a core design principle, not an afterthought.

**Model characteristics to exploit:**

| Model | Strengths | Best For |
|-------|-----------|----------|
| Claude 4 Opus | Deep reasoning, long analysis, nuanced understanding | BMAD research, architecture design |
| Claude 4 Sonnet | Fast, balanced quality/cost | GSD planning, task execution |
| GPT-5 | Speed, tool calling reliability | GSD auto-mode dispatch, verification |
| Gemini 2.5 Pro | 1M token context window, free tier | Long research docs, large codebase context |
| Gemini 2.5 Flash | Ultra-fast, cheap | Simple tasks, quick fixes, pattern scanning |
| Local (Ollama) | Zero cost, offline, privacy | Pattern scanning, code review, testing |
| DeepSeek R1 | Reasoning chains, cost-effective | Architecture analysis, debugging |

| ID | Requirement | Priority |
|----|-----------|----------|
| FR1.1 | System shall support configuring a different LLM model per phase: `discovery`, `planning`, `execution` | P0 |
| FR1.2 | System shall support configuring a different model per BMAD agent role (analyst, architect, pm, dev, tea) | P0 |
| FR1.3 | System shall support configuring a different model for GSD subagent roles (scout, researcher, worker) | P1 |
| FR1.4 | Configuration shall be stored in `.umb/models.yaml` (project-level) and `~/.umb/models.yaml` (global fallback) | P0 |
| FR1.5 | Project-level config shall override global config (local wins) | P0 |
| FR1.6 | System shall provide `/umb model` command to view and change model assignments interactively | P0 |
| FR1.7 | System shall provide `/umb model <phase> <model-id>` for quick per-phase switching | P0 |
| FR1.8 | System shall validate model availability at startup and warn on missing/unreachable models | P1 |
| FR1.9 | System shall support fallback chains per phase (e.g., `opus → sonnet → flash`) when primary model is rate-limited or unavailable | P1 |
| FR1.10 | System shall track token usage and cost per model per phase for cost visibility | P2 |
| FR1.11 | Tier presets shall provide sensible defaults: `budget` (local/flash), `standard` (sonnet/gpt-4o), `premium` (opus/gpt-5) | P1 |
| FR1.12 | Model config shall be committable to repo — team uses same model assignments | P2 |

**Example `.umb/models.yaml`:**

```yaml
# Per-phase model configuration
phases:
  discovery:
    model: anthropic/claude-opus-4   # Deep reasoning for research & analysis
    fallback: anthropic/claude-sonnet-4
  planning:
    model: anthropic/claude-sonnet-4  # Balanced for decomposition
    fallback: google/gemini-2.5-pro
  execution:
    model: openai/gpt-5              # Fast, reliable tool calling
    fallback: anthropic/claude-sonnet-4

# Per-agent overrides (optional, takes precedence over phase)
agents:
  bmad:
    analyst: anthropic/claude-opus-4    # Needs deep reasoning
    architect: anthropic/claude-opus-4  # Needs deep reasoning
    pm: anthropic/claude-sonnet-4       # Structured output, balanced
    dev: openai/gpt-5                   # Fast implementation
    tea: google/gemini-2.5-flash        # Cheap test generation
  gsd:
    scout: google/gemini-2.5-flash      # Fast context gathering
    researcher: google/gemini-2.5-pro   # Long context for research
    worker: openai/gpt-5                # Fast, reliable execution

# Tier presets (uncomment one)
# tier: budget      # local + flash only
# tier: standard    # sonnet + gpt-4o
# tier: premium     # opus + gpt-5

# Fallback chain when primary is unavailable
fallback_chain:
  - primary
  - secondary
  - local
```

### FR2: Discovery Phase (BMAD)

| ID | Requirement | Priority |
|----|-----------|----------|
| FR1.1 | System shall provide `/bmad research <topic>` command that invokes analyst agent for technical/domain/market research | P0 |
| FR1.2 | System shall provide `/bmad brief` command that runs product brief workflow | P0 |
| FR1.3 | System shall provide `/bmad prd` command that runs PRD generation workflow | P0 |
| FR1.4 | System shall provide `/bmad arch` command that runs architecture design workflow | P1 |
| FR1.5 | Research output shall be saved to `_bmad-output/planning-artifacts/` as markdown | P0 |
| FR1.6 | BMAD agents shall load pro-max skills automatically on spawn | P1 |
| FR1.7 | BMAD agents shall use project's existing `_bmad/` framework without modification | P0 |

### FR3: Approval Gates (OpenAgentsControl-inspired)

The system shall implement **approval gates** at every phase transition. Agents propose, humans approve, then agents execute. No action happens without explicit user consent.

| ID | Requirement | Priority |
|----|-----------|----------|
| FR2.1 | Before writing any file, agent shall present the planned change and wait for user approval | P0 |
| FR2.2 | Before executing any bash command with side effects (git push, npm publish, rm), agent shall present the command and wait for approval | P0 |
| FR2.3 | Before starting auto-mode execution of a slice, system shall display the plan and require `/gsd approve` | P0 |
| FR2.4 | System shall track approval state — approved, rejected, modified — per gate | P0 |
| FR2.5 | Rejected proposals shall allow user to provide feedback; agent revises and re-proposes | P1 |
| FR2.6 | Approval gates shall be configurable — `strict` (every action), `plan-only` (plans only), `off` (fully autonomous) | P1 |
| FR2.7 | Dashboard shall show pending approval requests with proposed action summary | P1 |
| FR2.8 | System shall support keyboard shortcut to approve/reject pending gates (Y/N) | P2 |

### FR3: Pattern Control (Context-Aware Agents)

Agents shall learn and respect the project's coding patterns, architecture decisions, and team standards. Code matches the project from the start — no refactoring needed.

| ID | Requirement | Priority |
|----|-----------|----------|
| FR3.1 | System shall scan project files on init to discover existing patterns (naming conventions, file structure, import style, testing patterns) | P0 |
| FR3.2 | Discovered patterns shall be stored in `.umb/patterns/` as editable markdown files | P0 |
| FR3.3 | Before generating code, agent shall load relevant patterns from `.umb/patterns/` into context | P0 |
| FR3.4 | System shall provide `/umb add-context` command to manually define patterns | P1 |
| FR3.5 | System shall provide ContextScout — smart pattern discovery that loads only relevant context per task (MVI: Minimal Viable Information) | P1 |
| FR3.6 | Pattern files shall be <200 lines each (MVI principle) — scannable in 30 seconds | P1 |
| FR3.7 | Patterns shall be committable to repo — team members inherit standards automatically | P2 |
| FR3.8 | GSD DECISIONS.md and KNOWLEDGE.md shall auto-feed into pattern context | P0 |

### FR4: Execution Phase (GSD)

| ID | Requirement | Priority |
|----|-----------|----------|
| FR4.1 | System shall provide `/gsd import <prd-path>` that parses BMAD PRD into GSD requirements | P0 |
| FR4.2 | System shall provide `/gsd plan` command that creates milestone with slices from requirements | P0 |
| FR4.3 | System shall provide `/gsd auto` command that starts auto-mode execution | P0 |
| FR4.4 | Auto-mode shall dispatch fresh context window per task | P0 |
| FR4.5 | Each task shall require explicit verification before completion | P0 |
| FR4.6 | State shall persist to `.gsd/` on disk — crash recovery on restart | P0 |
| FR4.7 | System shall render dashboard overlay showing current execution state | P1 |
| FR4.8 | System shall support milestone/slice/task hierarchy with GSD DB tools | P0 |

### FR5: Integration Layer

| ID | Requirement | Priority |
|----|-----------|----------|
| FR5.1 | System shall load as a pi-mono TypeScript extension | P0 |
| FR5.2 | System shall register all GSD tools as LLM-callable tools via `pi.registerTool()` | P0 |
| FR5.3 | System shall use pi-mono subagent system for agent delegation | P0 |
| FR5.4 | System shall use pi-tui for terminal rendering | P1 |
| FR5.5 | System shall use SQLite (better-sqlite3) for structured state | P0 |
| FR5.6 | Extension shall be hot-reloadable via `/reload` command | P1 |

### FR6: Pro-Max Skills

| ID | Requirement | Priority |
|----|-----------|----------|
| FR6.1 | System shall load all pro-max skills for both BMAD and GSD phases | P1 |
| FR6.2 | Skills shall follow Agent Skills standard (SKILL.md format) | P0 |
| FR6.3 | Skill loading shall be configurable per tier (budget/standard/premium) | P2 |

## 7. Non-Functional Requirements

| ID | Requirement |
|----|-----------|
| NFR1 | Extension load time shall be <2 seconds |
| NFR2 | SQLite operations shall complete in <50ms for any query |
| NFR3 | Terminal UI shall not flicker during streaming output (pi-tui differential rendering) |
| NFR4 | State shall survive process crash — no data loss on restart |
| NFR5 | Extension shall work with pi-mono v0.65.x |
| NFR6 | All GSD tools shall have TypeBox schemas for LLM consumption |
| NFR7 | Auto-mode shall handle 20+ consecutive tasks without context degradation |

## 8. Architecture Overview

```
umb (CLI binary)
├── loader.ts          — Sets PI_PACKAGE_DIR, loads extension
├── cli.ts             — Wires SDK managers, starts InteractiveMode
└── umb-extension/     — Pi extension (our code)
    ├── index.ts           — registerUmbExtension(pi)
    ├── bmad/              — BMAD discovery integration
    │   ├── research.ts    — /bmad research command handler
    │   ├── brief.ts       — /bmad brief command handler
    │   ├── prd.ts          — /bmad prd command handler
    │   ├── arch.ts         — /bmad arch command handler
    │   └── import.ts       — /gsd import (BMAD→GSD bridge)
    ├── gsd/              — GSD execution engine
    │   ├── state-machine.ts — Auto-mode dispatcher
    │   ├── milestone.ts    — Milestone management
    │   ├── slice.ts        — Slice execution
    │   ├── task.ts         — Task runner + verification
    │   └── verifier.ts     — Verification gate logic
    ├── db/               — SQLite state
    │   ├── schema.ts       — Table definitions
    │   └── gsd-db.ts       — Query helpers
    ├── tools/            — LLM-callable tools
    │   ├── gsd_dispatch.ts
    │   ├── gsd_plan_milestone.ts
    │   ├── gsd_plan_slice.ts
    │   ├── gsd_plan_task.ts
    │   ├── gsd_complete_task.ts
    │   ├── gsd_complete_slice.ts
    │   └── gsd_complete_milestone.ts
    ├── commands/         — Slash commands
    │   ├── gsd.ts         — /gsd, /gsd auto, /gsd status
    │   ├── bmad.ts        — /bmad research/brief/prd/arch
    │   └── import.ts      — /gsd import <prd>
    ├── ui/               — TUI components
    │   ├── dashboard.ts   — Execution progress overlay
    │   └── footer.ts      — Status footer
    └── agents/           — Subagent definitions
        ├── scout.md       — Context gathering
        ├── researcher.md  — Deep research
        └── worker.md      — Implementation
    ├── models/             — Model configuration
    │   └── models.yaml   — Per-phase, per-agent model routing
```

## 9. MVP Scope (Phase 1)

| Component | Priority | Est. Effort |
|-----------|----------|-------------|
| Extension entry point + loader | P0 | 2 days |
| GSD tools (plan/complete dispatch) | P0 | 5 days |
| GSD state machine (auto-mode) | P0 | 5 days |
| SQLite schema + manager | P0 | 2 days |
| Model configuration system | P0 | 2 days |
| `/gsd` command handler | P0 | 2 days |
| `/bmad` command passthrough | P0 | 1 day |
| PRD import bridge | P0 | 2 days |
| Pattern scanner (ContextScout) | P1 | 2 days |
| Dashboard UI | P1 | 3 days |
| Subagent definitions | P1 | 2 days |

**Total MVP: ~26 days focused work**

## 10. Success Criteria

- [ ] `/bmad research "topic"` produces research document
- [ ] `/bmad prd` produces PRD with requirements
- [ ] `/gsd import` loads PRD requirements into GSD
- [ ] `/gsd plan` creates milestone with slices from requirements
- [ ] `/gsd auto` executes tasks autonomously with verification
- [ ] State survives process crash
- [ ] Dashboard shows real-time execution progress
- [ ] Works as pi-mono extension without forking
- [ ] **Per-phase model routing works** — BMAD discovery uses configured model, GSD execution uses configured model
- [ ] **Model fallback chains work** — secondary model used when primary unavailable
- [ ] **Tier presets apply** — budget/standard/premium sets sensible defaults

## 11. Out of Scope (Phase 1)

- VS Code extension
- Headless/CI mode
- Web interface
- Multi-project support
- Worktree isolation
- Payment/billing

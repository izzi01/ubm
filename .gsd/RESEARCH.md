# Research: GSD-2 × Pi-Mono × BMAD Alignment

## Source Repos

### GSD-2 (`gsd-build/gsd-2`)
- TypeScript app built ON the Pi SDK. Embeds Pi coding agent, extends with GSD workflow engine.
- `loader.ts → cli.ts` two-file loader pattern. `.gsd/` is sole source of truth on disk.
- Milestones → Slices → Tasks. Auto-mode state machine with fresh context per task.
- 23+ extensions, 100+ JS modules, SQLite state, scout/researcher/worker agents.

### Pi-Mono (`badlogic/pi-mono`)
- Minimal terminal coding harness. The SDK GSD-2 builds on.
- Packages: pi-ai (LLM), pi-agent-core (runtime), pi-coding-agent (CLI), pi-tui (terminal UI), pi-web-ui (web), pi-mom (Slack), pi-pods (vLLM)
- Extension system: TypeScript API for commands, tools, UI, lifecycle hooks (20+ events)
- Session model: JSONL tree with branching
- Skills: Agent Skills standard (SKILL.md directories)
- Philosophy: Minimal, extendable, no sub-agents built-in

### BMAD Method
- "Docs as code" — documentation IS source of truth, code is downstream derivative
- 4 phases: Analysis/Discovery → Planning → Solution Design → Implementation
- 12+ agent personas (Analyst, PM, Architect, Dev, TEA, etc.)
- Our project already has full BMAD setup in `_bmad/`

## Market Context (2025-2026)
- 62% professional devs use AI coding tools, 4% of GitHub commits by Claude Code
- Terminal-native is winning over IDE plugins
- $20/month is converged standard pricing
- No existing tool combines structured discovery with verified autonomous execution

## Architecture Decision Records

| Decision | Choice | Rationale |
|----------|--------|-----------|
| ADR-001: Extension over fork | Build as pi-mono extension | Inherit pi updates without merge conflicts; proven by GSD-2 |
| ADR-002: SQLite over JSON | SQLite for state | Complex queries, transactions, crash recovery; GSD-2 validates this |
| ADR-003: Manual BMAD→GSD handoff | `/gsd import` command | Human controls phase transitions; avoids premature automation |
| ADR-004: Pro-max skills shared | Same skills for both phases | Skills follow Agent Skills standard; no phase-specific skills needed |
| ADR-005: Two-file loader pattern | Follow GSD-2's loader.ts → cli.ts | Sets PI_PACKAGE_DIR before SDK imports evaluate |

## Technical Stack
- Runtime: Node.js ≥22 + TypeScript
- Base SDK: pi-mono (pi-ai, pi-agent-core, pi-coding-agent, pi-tui)
- State: SQLite (better-sqlite3) + markdown files on disk
- Extension: TypeScript module loaded via pi-mono jiti runtime
- Agents: Pi subagent system + BMAD persona definitions
- Testing: Vitest

## Dependencies
- `@mariozechner/pi-coding-agent` — Base runtime
- `@mariozechner/pi-tui` — Terminal UI
- `better-sqlite3` — State database
- `oh-my-opencode-linux-x64` — Already used (in package.json)

## Key Risks
| Risk | Impact | Mitigation |
|------|--------|-----------|
| pi-mono API instability (v0.65.x refactoring) | High | Pin version; abstract SDK behind interfaces |
| GSD state machine complexity | High | Start minimal (3 states), expand as needed |
| BMAD→GSD handoff friction | Medium | Keep it manual; iterate on UX later |

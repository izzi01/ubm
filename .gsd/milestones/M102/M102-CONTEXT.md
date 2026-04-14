---
status: Queued — pending auto-mode execution
---

# M102: Skill Execution Framework

**Gathered:** 2026-04-11
**Status:** Ready for planning

## Project Description

Build the `/skill` command namespace — the mechanism by which an operator can discover, validate, scaffold, and execute skills against the pi SDK's session system. This is the execution bridge that turns the 172 existing skills in `.opencode/skills/` from static instruction files into invocable agent capabilities.

## Why This Milestone

The PRD's "Revenue MVP" depends on operators being able to run specialized skills (SEO content, affiliate generation, design) via CLI. Currently, skills are discovered only by the LLM reading SKILL.md files manually — there's no programmatic way to list, validate, or execute them. This milestone builds that bridge, and the SEO Content Agent (next milestone) depends on `/skill run` to function.

## User-Visible Outcome

### When this milestone is complete, the user can:

- Run `/skill list` to see all available skills indexed from `.opencode/skills/` with names, descriptions, and metadata
- Run `/skill new my-skill "A test skill"` to scaffold a new skill directory with a valid SKILL.md template
- Run `/skill run seo-mastery "organic dog food"` to spawn a new pi session with the skill's SKILL.md content loaded and the correct model routed from `.umb/models.yaml`
- Run `/skill run` on any of the 172 existing skills and get a working agent session

### Entry point / environment

- Entry point: `/skill` slash commands in the pi coding agent terminal
- Environment: Local dev — same pi extension runtime as existing `/gsd`, `/bmad`, `/umb` commands
- Live dependencies involved: pi SDK session API (`ctx.newSession()`), `.opencode/skills/` directory, `.umb/models.yaml` config

## Completion Class

- Contract complete means: Unit tests for skill scanner (172 real skills parse), validator (Skills Spec checks), all three command handlers. ~75 new tests pass. No regressions from existing 616 tests.
- Integration complete means: `/skill run` creates a real pi session (verified via mock in tests), model routing reads from `.umb/models.yaml` via existing `loadModelConfig()`, SKILL.md content is injected into the session
- Operational complete means: none — this is a CLI extension, no long-running services

## Codebase Brief

### Technology Stack

- TypeScript with Vitest, better-sqlite3, pi SDK (@mariozechner/pi-coding-agent)
- Extension follows two-file loader pattern (loader.ts → cli.ts → index.ts)
- Commands use `ExtensionAPI.registerCommand()` and `ExtensionCommandContext` for handler execution
- Sessions created via `ctx.newSession({ setup: async (sm) => { ... } })` with `sm.appendModelChange()`, `sm.appendSessionInfo()`, `sm.appendMessage()`

### Key Modules

- `src/model-config/` — loadModelConfig(), parseSimpleYaml(), TIER_PRESETS, KNOWN_AGENTS. Maps agent keys to model strings. Needs extension for `skills:` section.
- `src/commands/discovery-commands.ts` — reference implementation for session spawning with model routing. Uses `ctx.modelRegistry.find()` for model validation and `ctx.newSession()` for session creation.
- `src/extension/index.ts` — extension entry point where new commands are registered
- `.opencode/skills/` — 172 skill directories following Agent Skills Spec (SKILL.md with YAML frontmatter)

### Patterns in Use

- Factory pattern for testability: `createXHandlers()` for tool/command handlers
- `createMockCtx()` for integration tests (same pattern across all command test files)
- Widget output via `ctx.ui.setWidget()` for persistent display, `ctx.ui.notify()` for transient messages
- Error widgets with actionable guidance (e.g., "Run `/umb model` to configure")

## Architectural Decisions

### Skill registry as separate module

**Decision:** Create `src/skill-registry/` as a standalone module with types, scanner, validator, and index barrel.

**Rationale:** Follows the same modular pattern as `src/model-config/`. Keeps scanning/parsing logic separate from command handlers, making both independently testable. The scanner is a pure function — no SDK dependency needed.

**Evidence:** model-config/ uses this exact pattern (types.ts, loader.ts, tier-presets.ts, index.ts).

**Alternatives Considered:**
- Inline scanning in command handlers — would mix I/O with presentation logic, harder to test
- Extend model-config module — conflates model routing with skill discovery, different concerns

### Model routing via skills: section in models.yaml

**Decision:** Add a `skills:` key to `.umb/models.yaml` for skill-specific model assignments (e.g., `skills: { seo-mastery: openai/gpt-4o }`).

**Rationale:** Skills don't map naturally to BMAD agent keys (analyst, pm, dev). A separate `skills:` section is explicit, doesn't conflate skill identity with BMAD agent identity, and the existing YAML parser already handles arbitrary key-value pairs.

**Evidence:** The `parseSimpleYaml()` parser in model-config/loader.ts treats top-level keys generically — adding `skills:` requires no parser changes, just a new field in the TypeScript interface.

**Alternatives Considered:**
- Skills declare agent type in SKILL.md metadata and inherit that agent's model — requires convention, less explicit
- No model routing for skills, always use current session model — loses the tier/agent routing capability

### Skills Spec validation (not full BMAD compliance)

**Decision:** Validate against the Agent Skills Spec only (required `name` + `description` in YAML frontmatter, directory name matches skill name, valid characters).

**Rationale:** The Agent Skills Spec is the machine-readable contract. Full BMAD compliance (four-field persona, module assignment, manifest registration) is a separate concern that belongs to the BMAD framework, not the skill execution bridge.

**Evidence:** The Agent Skills Spec at `.opencode/skills/agent_skills_spec.md` defines exactly two required frontmatter fields.

**Alternatives Considered:**
- Full BMAD persona validation — requires loading BMAD manifests, understanding module structure, much larger scope
- No validation at all — allows broken skills to fail cryptically at runtime

## Interface Contracts

### SkillMetadata (from scanner)

```typescript
interface SkillMetadata {
  name: string;           // from frontmatter
  description: string;    // from frontmatter
  license?: string;       // optional frontmatter
  metadata?: Record<string, string>;  // optional frontmatter
  path: string;           // absolute path to skill directory
  skillMdPath: string;    // absolute path to SKILL.md
}
```

### SkillValidationResult (from validator)

```typescript
interface SkillValidationResult {
  valid: boolean;
  errors: string[];    // hard failures (missing required fields)
  warnings: string[];  // soft issues (non-standard but parseable)
}
```

### Model routing extension

```yaml
# .umb/models.yaml — existing + new skills section
tier: standard
agents:
  dev: google/antigravity-gemini-3-pro
  analyst: openai/gpt-4o
skills:
  seo-mastery: openai/gpt-4o
  pro-max-seo-writing: anthropic/claude-sonnet-4
```

The `loadModelConfig()` function needs to parse and expose the `skills:` section alongside the existing `agents:` section.

## Error Handling Strategy

All errors follow the discovery-commands pattern: actionable error widgets via `ctx.ui.setWidget()`, transient notifications via `ctx.ui.notify()`.

| Error | Handler | User sees |
|-------|---------|-----------|
| Skill not found | `/skill run` | Error widget listing available skills |
| Invalid SKILL.md | scanner (warn) / run (error) | Warning during list, error with specific missing field during run |
| No model configured | `/skill run` | Error directing to `/umb model` |
| Model not in registry | `/skill run` | Error with provider/model string |
| Name collision | `/skill new` | Error suggesting different name |
| Invalid skill name | `/skill new` | Error explaining naming rules |
| Empty skills dir | `/skill list` | "No skills found" with guidance |
| Session cancelled | `/skill run` | Warning notification |
| Session creation failure | `/skill run` | Error with exception details |

## Final Integrated Acceptance

To call this milestone complete, we must prove:

- `/skill list` indexes all 172 real skills in `.opencode/skills/` without crashing
- `/skill new test-skill "description"` creates a directory with valid SKILL.md that passes validation
- `/skill run` creates a pi session (verified via mock) with SKILL.md content injected and model routing applied
- Error states produce actionable user guidance, not stack traces

## Testing Requirements

- **Unit tests** for scanner (~15 tests): parsing valid SKILL.md, missing frontmatter, malformed YAML, empty directory, 172 real skills smoke test
- **Unit tests** for validator (~15 tests): valid skill, missing name, missing description, name/path mismatch, invalid characters
- **Integration tests** for commands (~20-25 tests): `/skill list` widget output, `/skill new` creation + validation + collision, `/skill run` session creation + model routing + all error paths
- **Mock pattern**: `createMockCtx()` with `newSession()`, `modelRegistry.find()`, `ui.notify()`, `ui.setWidget()` — same as discovery-commands tests
- **No E2E needed** — CLI extension with no runtime server

## Acceptance Criteria

### S01: Skill Registry
- `scanSkillDirs()` returns SkillMetadata[] for all directories containing SKILL.md
- `parseSkillMd()` extracts name, description, license, metadata from YAML frontmatter
- `validateSkill()` returns valid=true for compliant skills, valid=false with specific errors for non-compliant
- All 172 existing skills in `.opencode/skills/` parse without crashing

### S02: /skill list + /skill new
- `/skill list` renders widget showing skill count and each skill's name + description
- `/skill new valid-name "description"` creates `.opencode/skills/valid-name/SKILL.md` with valid template
- `/skill new` rejects names with invalid characters (uppercase, spaces, special chars)
- `/skill new` rejects names that already exist as skill directories

### S03: /skill run
- `/skill run seo-mastery "topic"` creates a session with SKILL.md content and "topic" as user message
- Model routing reads `skills:` section from `.umb/models.yaml`
- Falls back to current session model when no skill-specific config exists
- All error paths (not found, invalid, no model, model not in registry, cancelled) produce actionable widgets

## Risks and Unknowns

- **172 real skills may have edge cases in SKILL.md format** — some may have non-standard frontmatter. Mitigated by making the parser lenient (skip invalid, log warning) rather than strict (fail on first error).
- **pi SDK session API may have undocumented constraints** — `ctx.newSession()` setup function behavior is inferred from discovery-commands usage. If session setup has limits (e.g., message size), large SKILL.md files could be a problem. Mitigated by testing with real skill files including large ones (pro-max-seo-writing is substantial).
- **Model config parser needs extension for `skills:` section** — the existing `parseSimpleYaml()` handles top-level keys generically, but the TypeScript types need updating. Low risk since the parser is state-machine based and already handles `tier:` and `agents:`.

## Existing Codebase / Prior Art

- `src/model-config/loader.ts` — YAML parser and loadModelConfig() that needs extension for `skills:` section (verified: parser handles arbitrary top-level keys, type-only change needed)
- `src/model-config/types.ts` — TypeScript types that need `skills?: Record<string, string>` added to ModelConfig (verified: current interface)
- `src/commands/discovery-commands.ts` — reference implementation for session spawning with model routing (verified: ctx.newSession, ctx.modelRegistry.find patterns at lines 171-200)
- `src/commands/umb-commands.ts` — reference for widget formatting patterns
- `tests/commands/discovery-commands.test.ts` — reference for createMockCtx() pattern with session mocking
- `.opencode/skills/agent_skills_spec.md` — the Agent Skills Spec defining required SKILL.md format (verified: requires name + description)
- `.opencode/skills/` — 172 existing skill directories to validate against (verified: ls count, all have SKILL.md)

> See `.gsd/DECISIONS.md` for all architectural and pattern decisions — it is an append-only register; read it during planning, append to it during execution.

## Relevant Requirements

- FR1 — Skill skeleton generation (covered by S02 `/skill new`)
- FR2 — Skill installation from local directory (partially covered — scaffold only; Git deferred)
- FR3 — Skill execution via CLI (covered by S03 `/skill run`)
- FR4 — Skill configuration validation (covered by S01 validator)

## Scope

### In Scope

- Skill registry module: scanner, parser, validator, cached index
- `/skill list` command: discover and display available skills
- `/skill run <name> [args]` command: execute skill with model routing
- `/skill new <name> [description]` command: scaffold new skill directory
- Skills Spec validation (name + description frontmatter)
- Model routing via `skills:` section in `.umb/models.yaml`
- Extension of model-config types to support `skills:` key

### Out of Scope / Non-Goals

- Git-based skill installation (deferred to Phase 2)
- Full BMAD compliance validation (four-field persona, module assignment)
- Skill versioning or marketplace
- Skill dependency management (skills loading other skills)
- Skill execution history or state persistence
- The actual SEO Content Agent (next milestone)

## Technical Constraints

- Must follow the two-file loader pattern for pi-mono extensions
- Must use `better-sqlite3` ESM default import if any DB changes needed (none anticipated)
- Must use Vitest (not Jest) for all tests
- Must use `createMockCtx()` pattern for integration tests
- SKILL.md parsing must handle the existing 172 skills without breaking
- YAML parsing reuses existing `parseSimpleYaml()` from model-config — no new YAML dependency

## Integration Points

- `src/model-config/loader.ts` — extend to parse `skills:` section from .umb/models.yaml
- `src/model-config/types.ts` — add `skills` field to ModelConfig interface
- `src/extension/index.ts` — register skill commands via `registerSkillCommands(pi)`
- pi SDK `ctx.newSession()` — session creation for skill execution
- pi SDK `ctx.modelRegistry.find()` — model validation before session creation
- `.opencode/skills/` — filesystem source for skill discovery

## Ecosystem Notes

- The Agent Skills Spec (`.opencode/skills/agent_skills_spec.md`) defines the minimal contract: SKILL.md with YAML frontmatter containing `name` and `description`. No other fields are required.
- Skills range from minimal (template-skill is just a name + placeholder) to substantial (pro-max-seo-writing is a multi-page orchestration guide). The parser must handle this range.
- The pi SDK's `newSession()` API was reverse-engineered from discovery-commands.ts usage — it takes a `setup` callback that receives a session manager with `appendModelChange()`, `appendSessionInfo()`, and `appendMessage()`.

## Open Questions

- None remaining — all resolved during discussion.

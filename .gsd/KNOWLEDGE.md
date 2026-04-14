# Knowledge Base

<!-- Agent-learned patterns, gotchas, and non-obvious lessons.
     Append only. Each entry must save future agents from repeating investigation. -->

## Extension Development

### Two-file loader pattern is mandatory for pi-mono extensions
- loader.ts MUST set `PI_PACKAGE_DIR` to the `pkg/` directory before any SDK imports
- loader.ts uses dynamic `import('./cli.js')` to defer SDK loading until after env is set
- Pi's theme resolution collides with src/ — that's why pkg/ shim directory exists
- cli.ts re-exports from index.ts (the actual extension entry point)

### better-sqlite3 ESM import
- Use `import Database from 'better-sqlite3'` (ESM default), NOT `require()`
- `require()` causes TS strict mode errors with moduleResolution: NodeNext
- @types/better-sqlite3 provides full type coverage

### camelCase↔snake_case mapping
- DB columns use snake_case (milestone_id, created_at, success_criteria)
- TypeScript uses camelCase (milestoneId, createdAt, successCriteria)
- Generic `toCamel<T>()` helper provides type-safe conversion — don't use `as` casts
- Arrays of objects must be mapped individually: `rows.map(r => toCamel<EntityType>(r))`

## State Machine

### Linear transition model (pick first valid next state)
- `advance()` picks the first valid transition from the TRANSITIONS map — deterministic, no branching
- This means a task goes pending→active→complete in sequence; there's no way to skip steps
- Milestone completion accepts complete OR skipped slices — skipped is a terminal state equivalent to complete

### Phase detection is top-down hierarchical
- `getPhase()` checks the milestone first, then slices, then tasks
- If the milestone has pending slices, phase is "plan" even if some tasks are active
- A task completing while its slice is still pending returns "plan" (not "execute") because the slice hasn't been advanced yet

### Gate system wraps the state machine, doesn't extend it
- `GsdGateManager` wraps `GsdStateMachine.advance()` — it's a decorator pattern
- Gate configs stored in a runtime Map, not in DB schema — no migration needed
- Gate lookup resolves task→slice hierarchy so task gates inherit from parent slice config
- Milestones are not directly gated — their transitions depend on slice-level gates
- Double-approval is idempotent (no-op) rather than throwing

### Engine factory pattern
- `createGsdEngine(dbPath, config?)` wires GsdDb + GsdStateMachine + GsdGateManager into one object
- Engine stored in module-scoped variable with `getGsdEngine()` accessor — no generic context bag in ExtensionAPI
- S03 will register tools/commands against this engine instance

## Tool & Command Registration (S03)

### Factory pattern for testability
- Tool handlers created via `createGsdToolHandlers(engine)` factory, not inline in registerGsdTools()
- Same factory pattern used for commands: `createGsdCommandHandlers(engine)`
- This allows tests to instantiate handlers directly without needing the full ExtensionAPI mock
- Registration function (`registerGsdTools(pi, engine)`) is a thin wrapper that calls `pi.registerTool()` for each

### pi SDK AgentToolResult shape
- Tool returns use `{content, details}` not `{isError, content}`
- `content` is the human-readable summary string
- `details` is optional structured data (object or string)
- Errors are thrown from execute(), not returned as isError

### ExtensionCommandContext limitations
- Does NOT expose `sendUserMessage()` — that's on a different context type
- Use `ctx.ui.notify()` for transient messages and `ctx.ui.setWidget()` for persistent output
- Commands receive `{args, ui}` — args is the parsed string, ui has notify/setWidget

### ContextScout pattern indexing
- Synchronous fs operations (consistent with better-sqlite3 pattern)
- Regex-based extraction (not AST parsing) for zero dependencies
- Scans src/patterns/ for TS files (JSDoc @module tags + exports)
- Scans _bmad/ for YAML agent definitions (frontmatter extraction)
- Gracefully handles missing directories (logs warning, returns empty)

## Model Config (S01 / M101)

### Simple YAML parser for flat configs — no dependency needed
- `.umb/models.yaml` uses a deliberately flat structure: `tier:` + `agents:` with key-value pairs
- Line-based state machine parser (~50 lines) handles this without js-yaml or similar
- If nested structures are needed later, swap the loader internals — TypeScript interface stays the same
- `parseSimpleYaml()` in `src/model-config/loader.ts` is the reusable parser

### Tier presets sourced from opencode-config directories
- Three tiers (budget/standard/premium) with real model assignments from `opencode-config/01-budget`, `03-standard`, `05-premium`
- 20 known BMAD agents validated against `_bmad/` agent manifests
- User overrides always win over tier defaults during merge

### /umb command registration follows existing pattern
- `registerUmbCommands(pi)` mirrors `registerBmadCommands(pi)` and `registerGsdCommands(pi)`
- Commands use `createMockCtx()` pattern for integration tests (same as /gsd and /bmad tests)
- Widget output uses `ctx.ui.setWidget()` — NOT `ctx.ui.notify()` for persistent display

## Dashboard (S04)

### Dashboard is a pure function, not a TUI component
- `renderGsdDashboard(engine: GsdEngine): string[]` takes engine, returns string array
- No TUI or Theme imports needed — string arrays are sufficient for v1 widget rendering
- Auto-refresh wired via two events: `session_start` (initial render) and `tool_result` (after any gsd_* tool call)
- Gate-blocked state shown via `engine.gates.isAwaitingApproval()` — renders 🔒 icon

### Vitest toContain() checks element equality, not substring
- `expect(['hello world']).toContain('hello')` FAILS — toContain checks for exact array element match
- Use `expect(array.some(el => el.includes('hello'))).toBe(true)` or a helper like `expectContainsSubstring()`
- This catches people who assume toContain works like Jest's string toContain for arrays

### Integration test execTool helper pattern
- Tool handler execute() returns `AgentToolResult` which has union content type
- Extract text once in the helper: `execTool()` returns `{ result, text }` where text is the string content
- Avoids TS2339 errors from accessing `.content[0].text` on union types

## Skill Registry (S01 / M102)

### Regex-based YAML frontmatter parsing — no yaml library needed
- `parseSkillMd()` uses `/^---\n([\s\S]*?)\n---/` to extract frontmatter between `---` delimiters
- Only handles flat `key: value` pairs — multi-line values and nested structures not supported
- Consistent with existing `parseSimpleYaml()` philosophy: simple line-based state machine
- 16 of 169 real skills have SKILL.md without parseable frontmatter — skipped gracefully with console.warn

### parseSimpleYaml() extensibility pattern for new top-level blocks
- To add a new top-level block (like `skills:`), add an `inXxx` boolean flag alongside existing `inAgents`
- The parser is a line-by-line state machine: detect block start line, parse indented key: value pairs, detect transition to next block
- Skills entries are NOT added to KNOWN_AGENTS — skill names are dynamic, not a fixed set
- loadModelConfig() merges skill assignments with `source: 'user'` and skips KNOWN_AGENTS validation for skill entries

### Registry module pattern: types + scanner + validator + barrel
- `src/skill-registry/` follows a clean separation: types.ts (interfaces), scanner.ts (I/O), validator.ts (pure logic), index.ts (barrel)
- `validateSkill()` is a pure function — no I/O, no SDK dependency, returns `{ valid, errors[], warnings[] }`
- This pattern is reusable for any future registries (e.g., patterns, templates)

### Real skill count: 149 valid from 169 directories
- 149 skills have parseable YAML frontmatter with name + description
- 16 skipped (SKILL.md exists but no parseable frontmatter)
- 4 missing SKILL.md entirely (silently skipped)
- Smoke test in scanner.test.ts is the canonical source of truth for this count

## Vitest vs Jest CLI

### Vitest does NOT support --grep flag
- `npm test -- --grep 'pattern'` throws CACError: Unknown option `--grep` — that's a Jest flag
- Use `npx vitest run -t 'pattern'` for test name filtering in Vitest
- The `--grep` flag caused a verification gate failure in S02; always use `-t` for this project

### dist-test/ directory contains fork-compiled tests incompatible with Vitest
- The fork's `dist-test/` directory has 1228 compiled JS test files using `node:test` APIs
- Vitest picks these up and fails — they must be excluded in `vitest.config.ts` alongside `dist/`
- Exclude pattern: `'**/dist-test/**'` in the `test.exclude` array
- Without this exclusion, Vitest reports 1200+ failing test files instead of ~45

## Global Install / Packaging (M105/S01)

### native/ directory is build-time-only — never ship it in the tarball
- `native/` contains Rust source code for better-sqlite3 bindings; compiled artifacts ship via `packages/native/`
- Prebuilt binaries come through `optionalDependencies` in package.json
- Do NOT add `native/` to the `files` whitelist — it would bloat the tarball with useless source

### npm install -g needs ./ prefix for local tarball paths
- `npm install -g dist-test/umb-cli-2.70.0.tgz` fails — npm interprets bare paths as git URLs
- Must use `npm install -g ./dist-test/umb-cli-2.70.0.tgz` (with `./` prefix) or absolute path
- The error message is misleading: "Could not read from remote repository" when it's actually a path resolution issue

### Workspace packages in the fork tarball need package.json files
- The fork (dist-test/) ships compiled JS in packages/*/src/ but npm needs package.json for each workspace package
- Without package.json, Node can't resolve @gsd/* bare specifiers → ERR_MODULE_NOT_FOUND
- Each package.json needs: `type: "module"`, `main: "src/index.js"`, and explicit `exports` maps for subpath imports

### Node 24 rejects hybrid CJS/ESM in files with import statements
- `native.js` had `const { createRequire } = require('module')` alongside `import` statements — Node 24 throws SyntaxError
- Fix: use `import { createRequire } from 'module'` then `const require = createRequire(import.meta.url)`
- Rule: if a file has any `import` statement, ALL module loading must use ESM syntax

### Env var controls for optional heavy downloads during global install
- `GSD_SKIP_RTK_INSTALL=1` — skips RTK (React Testing Library) download in postinstall
- `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` — skips Playwright browser download
- Use these in CI to keep `npm install -g` fast (373 packages in ~16s vs minutes with full downloads)
- Users can opt-in to full installs by omitting these env vars

## Git-based Skill Install (M106/S01)

### installSkillFromGit() pattern: clone → scan → validate → copy → cleanup
- Uses `git clone --depth 1 --quiet` for shallow clones (fast, minimal bandwidth)
- 60-second timeout on git clone via `childProcess.spawn` with timer kill
- Scans root level and one level deep for skill directories (handles both flat and nested repos)
- Reuses existing `scanSkillDirs()` and `validateSkill()` — no duplication
- Temp directory always cleaned up in `finally` block — even on errors
- Returns structured `InstallResult { installed: string[], skipped: Map<string, string[]>, errors: string[] }` for partial success handling

### Git clone failures can be transient (network-dependent)
- Tests that hit real GitHub URLs for clone failures may flake in CI/offline
- Clone failure tests use obviously fake URLs (nonexistent-user/nonexistent-repo-12345)
- The `fatal: could not read Username` error is normal — git tries HTTP auth before failing

## Fork Merge (M107)

### Verification checks must target the fork directory, not the extension workspace
- The GSD workspace is at `/home/cid/projects-personal/iz-to-mo-vu/` but the fork repo is at `/home/cid/projects-personal/umb/`
- Verification commands that check fork files (package.json, src/logo.ts, etc.) MUST `cd /home/cid/projects-personal/umb` first
- Running these checks from the GSD workspace causes false "file not found" failures

### Stash-pop conflicts during upstream merge are expected
- The umb fork has uncommitted branding modifications (11 files) that are stashed before merge
- Stash pop after fast-forward merge can produce conflicts in package.json/pkg/package.json if upstream changed those files
- These are trivially resolved by keeping fork branding (umb-cli) with the new upstream version number

## Dead Code Removal (M109)

### Narrowing type unions can surface stale defaults in MODE_DEFAULTS
- When removing union members from a type (e.g., 'branch' | 'none' from isolation), grep for those literal strings across the codebase
- MODE_DEFAULTS objects may still reference removed literals — tsc won't catch these if the type was narrowed but the default object wasn't updated
- Always run `grep -rn "'branch'\|'none'" src/` after type narrowing to find stale references

### Removing a function used as a branch guard may lose side-effect guards
- When removing parseSliceBranch(), the captureIntegrationBranch() function lost its guard that skipped slice-branch names
- The guard must be reimplemented with a simpler check (e.g., `branch.startsWith('gsd/')`) rather than deleted entirely
- tsc catches missing imports but NOT lost conditional logic — manual review of callers is required

## Isolation Mode Cleanup (M109–M110)

### Narrowing union types to single variant — use constants, not dead branches
- When only one variant remains in a union (e.g., 'worktree' | 'none' | 'branch' → 'worktree'), convert accessor functions to constant returns
- This forces ALL consumers to simplify and makes the narrowing visible at the type level
- Leaving dead conditional branches is worse than removing them — they create false paths for future readers

### Deprecation warnings for config narrowing
- When narrowing accepted config values (e.g., isolation: 'none' | 'branch' → removed), use warnings (not errors) in validation
- Users with old config files should see a deprecation message, not a hard failure
- This applies to any config schema narrowing across milestones

### Mock updates are the bulk of test cleanup for type narrowing
- When narrowing a return type, most test changes are mock return values and assertion string updates
- Budget ~60% of test task effort for mock updates, ~40% for deleting dead test blocks
- grep -rn for the old values in test files is the fastest way to find all affected mocks

## Pattern Test Infrastructure (M111/S01)

### vitest/globals does NOT export named members — install vitest as devDependency instead
- The original plan was to switch `from 'vitest'` to `from 'vitest/globals'` to avoid installing vitest
- However, `vitest/globals` only provides ambient type declarations via tsconfig `types: ["vitest/globals"]` — it does NOT export `describe`, `it`, `expect` etc.
- The correct fix is to install vitest as a devDependency so `from 'vitest'` resolves properly
- This lesson saves future agents from trying the vitest/globals import path

### ESM .js extensions required on relative imports in test files
- tsconfig.extensions.json uses `moduleResolution: "NodeNext"` which requires explicit `.js` extensions on relative imports
- All test files importing from sibling/parent source files must use `../source-file.js` (not `../source-file`)
- All test files importing from sibling/parent source files must use `../source-file.js` (not `../source-file`)
- This applies to any new test files added under extensions/

## BMAD Method (M112)

### BMAD v6.3.0 directory structure is phase-based, not flat skills/
- Skills are organized under `_bmad/bmm/{phase}/` (e.g., `1-analysis/`, `2-plan-workflows/`, `3-solutioning/`, `4-implementation/`)
- Agent definitions are SKILL.md files in `bmad-agent-*` directories within phase folders (e.g., `_bmad/bmm/1-analysis/bmad-agent-analyst/SKILL.md`)
- Core skills (bmad-help, bmad-brainstorming, etc.) live in `_bmad/core/`, NOT in bmm/
- There is NO `_bmad/bmm/skills/` directory — the slice plan's original verification commands assumed a flat structure that doesn't exist in v6.3.0
- Agent manifest CSV at `_bmad/_config/agent-manifest.csv` has canonical agent metadata (role, identity, communication style, principles)
- Total: 41 SKILL.md files (30 BMM + 11 core), 6 BMM agents

### findBmadAgents() must match bmad-agent-* directories + SKILL.md
- Original filter `rel.includes('agents')` (plural) missed all agents because BMAD v6.3.0 uses singular 'agent' in directory names
- Fix: check that parent directory starts with `bmad-agent-` AND file is named `SKILL.md`
- A broader `rel.includes('agent')` (singular) was too loose — matched non-SKILL.md files inside agent directories
- This applies to any new test files added under extensions/

### BMAD skill executor: template resolution needs iterative passes for transitive references
- `_bmad/bmm/config.yaml` has variables that reference other variables (e.g., `{planning_artifacts}` references `{project-root}`)
- Single-pass replacement misses transitive references — must iterate until no more `{...}` patterns remain (with max iteration guard)
- The 3-pass approach used in resolveBmadConfig() handles the real config.yaml's depth; max-iteration guard prevents infinite loops

### BMAD skill executor: prompt composition order matters for downstream consumption
- composeExecutionPrompt() uses strict section ordering: header → config → skill body → stage prompts → agent definitions → user message
- Stage prompts and agent definitions are sorted alphabetically for deterministic output
- The composed prompt is injected as a single string into ctx.newSession() — no structured metadata
- Downstream slices (S03-S06) building /bmad auto-* commands will consume this same composition pipeline

### BMAD skill count is 38, not 35 — the plan estimate was approximate
- findBmadSkills() discovers 38 skills (27 from _bmad/bmm/ phase directories + 11 from _bmad/core/)
- The plan's "35 non-agent BMAD skills" was an underestimate; no agent filtering is applied (agents are SKILL.md files in bmad-agent-* dirs, which are included)

## BMAD Auto Pipeline (S07 / M112)

### executeAutoPipeline() shared executor pattern
- 4 near-identical phase handlers were refactored into thin wrappers delegating to a single `executeAutoPipeline(phase: PhaseConfig, args, ctx)` function
- PhaseConfig defines: pipeline (PipelineDefinition), label (string), icon (string), number (string)
- ALL_PHASES constant exports the ordered list — consumed by both bmad-commands (umbrella) and gsd-commands (build-from-spec)
- This pattern makes adding a new phase trivial: add to ALL_PHASES, register command — no new handler code needed

### /bmad auto routing logic: phase detection before umbrella
- First token is checked against known phase names (pipeline.id) BEFORE falling through to umbrella mode
- This means a message like "Build an analysis tool" would NOT trigger analysis phase (first token "build" doesn't match any phase)
- --stop-after flag must be the first argument (parsed before phase detection)

### /gsd build-from-spec uses injectable pipelineRunner
- Factory pattern: `createGsdCommandHandlers(engine, opts?)` accepts optional `pipelineRunner` override
- Tests inject a mock pipelineRunner to avoid executing real BMAD pipelines
- Same pattern as gsd-tools factory — proven testability approach in this codebase

## Git Tracking (M113)

### .gsd real directory vs symlink for branch-portable planning artifacts
- `.gsd` was a symlink to `~/.gsd/projects/<hash>/` — planning artifacts lived outside the repo and didn't travel with branches
- Converted to a real directory so `git worktree add` and `git checkout` give correct milestone state automatically
- `.gitignore` uses 25 specific runtime patterns instead of blanket `.gsd/` ignore — this is the key pattern for tracked-but-not-noisy
- Planning artifacts: PROJECT.md, REQUIREMENTS.md, DECISIONS.md, KNOWLEDGE.md, QUEUE.md, PRD.md, CODEBASE.md, RESEARCH.md + all milestones/*.md
- Runtime files ignored: gsd.db*, STATE.md, activity/, runtime/, journal/, auto.lock, metrics.json, completed-units*.json, doctor-history.jsonl, event-log.jsonl, notifications.jsonl, state-manifest.json, repo-meta.json, routing-history.json, reports/, research/, milestones/**/*-VERIFY.json, milestones/**/*-PRE-EXEC-VERIFY.json, milestones/**/*-CONTINUE.md, milestones/**/continue.md, milestones/**/anchors/
- The GSD extension already supported this mode (ensureGsdSymlinkCore returns localGsd for real dirs)

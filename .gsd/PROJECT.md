# Project

## What This Is

Umb is a fork of gsd-2 built on the pi SDK. It is a coding terminal that combines BMAD for discovery and planning with GSD for milestone/slice/task execution, then exposes that through the `umb` CLI, packaged resources, built-in extensions, and a web mode.

In plain language: this project is trying to be a real AI coding app, not just a codebase that compiles.

## Core Value

Even if everything else is cut, `umb` must still be usable to make software end-to-end: inspect a repo, change code, run commands, manage a dev process, verify behavior, and finish a small task with the shipped product.

## Current State

- Fork repo lives at `/home/cid/projects-personal/umb/`
- Binary is `umb`; config directory is `~/.umb/`
- BMAD discovery assets are present under `_bmad/`
- GSD execution workflow, milestone state, and planning artifacts are integrated
- Global install, packaging, workspace resolution, and rebrand work are already complete
- The branchless worktree architecture from M113 is complete, including removal of the old sync layer
- Existing smoke, integration, packaging, live, and live-regression harnesses already exist
- M114 assembled the core coding-loop parity gate: deterministic repo/dev and installed-mode recorded lanes, canonical baseline report/diagnostics, human UAT, and a release-facing gate with optional live metadata
- The strict release gate is green when the deterministic repo/dev and installed coding-loop lanes are green, even if non-required baseline lanes still show existing gaps
- The canonical baseline remains truthfully `partial` because optional live coverage skips unless explicitly enabled/configured and broader secondary surfaces are intentionally tracked as not yet closed
- M115/S01 is complete: the repo has a tracked secondary-surface inventory, a secondary parity lane/fixture manifest, and canonical `secondaryParity` wiring in `tests/parity/artifacts/baseline-report.json` covering `web-mode`, `mcp`, `workflow-bmad`, and `worktree-session-recovery`
- M115/S02 is complete: web-mode parity has a tracked deterministic fixture/manifest contract plus a locking integration contract that verifies the baseline report emits a truthful web-mode secondary parity row with explicit present fixtures, planned release-readable artifact path, and actionable uncovered-gap metadata
- M115/S03 is complete: MCP parity now has a deterministic stdio fixture server, tracked manifest contract, dedicated `mcpParity` report block, machine-readable artifacts at `tests/parity/artifacts/mcp-parity.json` and `tests/fixtures/recordings/mcp-parity.json`, and locked diagnostics for discovery, schema inspection, successful invocation, and intentional failure attribution
- M115/S04 is complete: workflow/BMAD parity now has a deterministic planning-to-execution manifest, a dedicated `workflowParity` block in the canonical baseline report, tracked artifacts at `tests/parity/artifacts/workflow-parity.json` and `tests/fixtures/recordings/workflow-parity.json`, resolver-backed execution that keeps the parity runner stable, and operator-facing diagnostics for missing artifacts, invalid transitions, and absent verification evidence
- Workflow parity is intentionally scoped to one representative GSD planning-to-execution loop — milestone plan, slice plan, and task completion with persisted state transitions — instead of claiming every BMAD workflow template is covered
- MCP and workflow are now release-readable through dedicated parity blocks even while the broader `secondaryParity` matrix remains partial for other secondary surfaces and still carries unreconciled gap metadata pending S05
- The remaining M115 work is the integrated secondary-surface release gate (S05)

## Architecture / Key Patterns

- TypeScript monorepo with workspace packages under `packages/`
- Bundled resources and extensions under `src/resources/`
- CLI entrypoint built through `dist/loader.js`
- SQLite via `better-sqlite3`, with snake_case database columns and camelCase TypeScript mapping helpers
- GSD planning artifacts tracked in `.gsd/`; runtime state kept gitignored
- Existing verification lanes already split by intent:
  - `tests/smoke/*` for quick CLI checks
  - `src/tests/integration/*.test.ts` for built black-box integration tests
  - `src/tests/integration/pack-install.test.ts` for packaging/install behavior
  - `tests/live/*` for opt-in live behavior
  - `tests/live-regression/*` for post-build installed-binary regression coverage
- M114/M115 use `tests/parity/` as the proof inventory and reporting layer:
  - `tests/parity/baseline-lanes.ts` declares the fixed allowlisted lane matrix and emits the canonical `secondaryParity` payload into `tests/parity/artifacts/baseline-report.json`
  - `tests/parity/run.ts` emits a machine-readable baseline report even when the verdict is partial/failing, so consumers can inspect truthful parity gaps
  - `tests/parity/diagnostics.ts` renders operator-facing summaries from the canonical baseline report rather than introducing a second parity harness
  - `tests/parity/human-uat.md` is a tracked human-readable UAT script tied to repo-local fixture, report, and diagnostics artifacts
  - `tests/parity/release-gate.ts` is the release-facing contract over the canonical baseline report: it requires the repo/dev and installed coding-loop lanes and publishes explicit `optionalLive` metadata without exposing secrets
  - `tests/parity/secondary-surface-inventory.ts` is the source-of-truth audit for secondary surfaces, current evidence, uncovered areas, and rebrand drift
  - `tests/parity/secondary-lanes.ts` is the source-of-truth contract for secondary parity proof classes, lane metadata, deterministic fixtures, and uncovered-surface semantics
  - `tests/fixtures/parity-web-task-manifest.json` is the tracked source of truth for the core coding-loop acceptance contract
  - `tests/fixtures/secondary-parity-manifest.json` is the tracked source of truth for the four secondary surfaces and their required/optional proof lanes
  - `tests/fixtures/web-mode-parity-manifest.json` is the tracked source of truth for deterministic web-mode startup, project selection/switching, and browser-visible observables
  - `tests/fixtures/mcp-parity-manifest.json` is the tracked source of truth for deterministic MCP discovery, tool schema inspection, successful invocation, and intentional failure diagnostics
  - `tests/fixtures/workflow-parity-manifest.json` is the tracked source of truth for the representative workflow/BMAD planning-to-execution contract
  - `tests/parity/mcp-parity.ts` runs the dedicated MCP parity lane and writes tracked MCP parity artifacts for downstream release/report consumers
  - `tests/parity/workflow-parity.ts` runs the representative workflow parity lane and writes tracked workflow parity artifacts for downstream release/report consumers
  - `tests/parity/workflow-parity-worker.ts` isolates deep GSD runtime imports behind a resolver-backed subprocess so the main parity runner can stay on plain `--experimental-strip-types`
  - `src/tests/integration/web-mode-parity-contract.test.ts` locks the current truthful web-mode parity row in the canonical baseline report so downstream release work cannot silently change fixture paths, missing required lanes, or gap semantics
  - `src/tests/integration/mcp-parity-contract.test.ts` and `src/tests/integration/mcp-parity-diagnostics-contract.test.ts` lock the MCP report block, artifact paths, and operator-facing failure attribution contract
  - `src/tests/integration/workflow-parity-fixture-contract.test.ts`, `src/tests/integration/workflow-parity-contract.test.ts`, and `src/tests/integration/workflow-parity-diagnostics-contract.test.ts` lock the workflow manifest, canonical baseline report row, artifact paths, persisted transition expectations, and operator-facing workflow diagnostics
  - deterministic coding-loop proof is represented as recorded-artifact lanes (`repo-mode-coding-loop` and `pack-install`) with explicit `inspect`, `edit`, `test`, `dev-server`, and `browser` phase diagnostics
  - `repoInstalledComparison` gives downstream slices and release operators a stable repo-vs-installed diff surface with artifact paths and per-phase matches/divergence
- Current parity policy is truthfulness-first: secondary surfaces stay `partial` until dedicated release-readable proof lanes/artifacts exist, even if scattered lower-level tests already cover important behavior

## Capability Contract

See `.gsd/REQUIREMENTS.md` for the explicit capability contract, requirement status, and coverage mapping.

## Milestone Sequence

- [x] M001: Extension scaffold and GSD foundation — establish extension loading, state machine, approval gates, tools, commands, and dashboard
- [x] M002: Auto-mode execution loop — add automated milestone/slice/task execution flow
- [x] M100: Integration test milestone — validate the combined system behavior
- [x] M101: Model config and BMAD discovery — add model routing, BMAD discovery, and PRD import support
- [x] M102: Skill execution framework — add skill registry, `/skill list`, `/skill new`, and `/skill run`
- [x] M103: Fork and rebrand to umb — turn the upstream project into the umb fork and binary
- [x] M104: Port iz-to-mo-vu extension — move extension code and tests into the fork
- [x] M105: Global install and final polish — make packaged/global install work reliably
- [x] M106: Git-based skill install — add repository-backed skill installation and removal
- [x] M107: Merge upstream v2.70.1 — resync the fork while preserving branding and behavior
- [x] M108: Remove update check mechanism — strip the old GSD update check flow
- [x] M109: Remove legacy slice-branch artifacts — delete dead isolation preferences and branch-era code
- [x] M110: Complete isolation cleanup — remove remaining `none` / `branch` isolation consumers
- [x] M111: Fix pattern test compilation — repair vitest imports, ESM paths, and test typing
- [x] M112: Implement BMAD method — add BMAD skill execution and multi-phase auto pipelines
- [x] M113: Branchless worktree architecture — track planning artifacts in git and remove the sync layer
- [ ] M114: AI coding app parity gate — core coding-loop proof and release-gate surfaces are assembled in code and recorded artifacts; milestone-level validation/completion remains pending
- [ ] M115: UMB secondary-surface parity gate — S01 inventory/contracts, S02 web-mode parity proof, S03 MCP parity proof, and S04 workflow/BMAD parity proof are complete; S05 integrated secondary-surface release reporting remains ahead

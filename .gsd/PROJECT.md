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
- The canonical baseline remains truthfully `failing`/`partial` because non-required lanes such as `fixtures-runner` and opt-in live coverage remain explicit context rather than hidden pass-throughs
- M115 is now fully built in code through S05: S01 created the secondary-surface inventory/contracts, S02 added release-readable web-mode parity, S03 added deterministic MCP parity artifacts/diagnostics, S04 added representative workflow/BMAD parity artifacts/diagnostics, and S05 added the integrated secondary-surface release gate, diagnostics mode, human UAT, worktree/session contract, and scoped rebrand-drift contract
- The integrated secondary release gate now passes on required lanes: web-mode, MCP, workflow/BMAD, worktree/session/recovery, and scoped rebrand drift
- The secondary release artifact is written to `tests/parity/artifacts/secondary-release-report.json` and stays truthful about required-lane verdicts, failed surfaces/phases, artifact paths, optional planned-proof lanes, and provider/live skip semantics
- Worktree/session/recovery parity is intentionally represented as a deterministic manifest plus integration contracts, while remaining old-brand user-facing strings in the scoped surface are tracked as explicit expected drift rather than silently treated as fixed
- Shared parity diagnostics now support both baseline and secondary-surface report rendering from tracked artifacts, and `tests/parity/human-uat-secondary.md` provides the operator-facing UAT path for the secondary band
- Milestone M115 now has all slices complete in execution terms; milestone-level validation/completion remains the next bookkeeping step

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
  - `tests/parity/diagnostics.ts` renders operator-facing summaries from tracked report artifacts and now supports both baseline and secondary-surface views
  - `tests/parity/human-uat.md` is the tracked human-readable UAT script for the core coding-loop parity fixture
  - `tests/parity/human-uat-secondary.md` is the tracked human-readable UAT script for the secondary-surface parity band
  - `tests/parity/release-gate.ts` is the release-facing contract over the canonical baseline report: it requires the repo/dev and installed coding-loop lanes and publishes explicit `optionalLive` metadata without exposing secrets
  - `tests/parity/secondary-surface-inventory.ts` is the source-of-truth audit for secondary surfaces, current evidence, uncovered areas, and rebrand drift
  - `tests/parity/secondary-lanes.ts` is the source-of-truth contract for secondary parity proof classes, lane metadata, deterministic fixtures, and uncovered-surface semantics
  - `tests/parity/secondary-release-gate.ts` composes the integrated secondary release verdict from the canonical baseline report, dedicated MCP/workflow artifacts, and the worktree-session/rebrand contracts without introducing a separate runner stack
  - `tests/fixtures/parity-web-task-manifest.json` is the tracked source of truth for the core coding-loop acceptance contract
  - `tests/fixtures/secondary-parity-manifest.json` is the tracked source of truth for the four secondary surfaces and their required/optional proof lanes
  - `tests/fixtures/web-mode-parity-manifest.json` is the tracked source of truth for deterministic web-mode startup, project selection/switching, and browser-visible observables
  - `tests/fixtures/mcp-parity-manifest.json` is the tracked source of truth for deterministic MCP discovery, tool schema inspection, successful invocation, and intentional failure diagnostics
  - `tests/fixtures/workflow-parity-manifest.json` is the tracked source of truth for the representative workflow/BMAD planning-to-execution contract
  - `tests/fixtures/worktree-session-parity-manifest.json` is the tracked source of truth for branchless worktree/session/recovery parity and scoped operator-visible rebrand drift
  - `tests/parity/mcp-parity.ts` runs the dedicated MCP parity lane and writes tracked MCP parity artifacts for downstream release/report consumers
  - `tests/parity/workflow-parity.ts` runs the representative workflow parity lane and writes tracked workflow parity artifacts for downstream release/report consumers
  - `tests/parity/workflow-parity-worker.ts` isolates deep GSD runtime imports behind a resolver-backed subprocess so the main parity runner can stay on plain `--experimental-strip-types`
  - `src/tests/integration/web-mode-parity-contract.test.ts` locks the current truthful web-mode parity row in the canonical baseline report so downstream release work cannot silently change fixture paths, missing required lanes, or gap semantics
  - `src/tests/integration/mcp-parity-contract.test.ts` and `src/tests/integration/mcp-parity-diagnostics-contract.test.ts` lock the MCP report block, artifact paths, and operator-facing failure attribution contract
  - `src/tests/integration/workflow-parity-fixture-contract.test.ts`, `src/tests/integration/workflow-parity-contract.test.ts`, and `src/tests/integration/workflow-parity-diagnostics-contract.test.ts` lock the workflow manifest, canonical baseline report row, artifact paths, persisted transition expectations, and operator-facing workflow diagnostics
  - `src/tests/integration/worktree-session-parity-contract.test.ts` and `src/tests/integration/rebrand-surface-contract.test.ts` lock the branchless worktree/session/recovery contract and the scoped old-brand drift inventory used by the integrated secondary release gate
  - `src/tests/integration/secondary-release-gate-contract.test.ts` and `src/tests/integration/secondary-parity-diagnostics-contract.test.ts` lock the integrated secondary release artifact shape, required-lane failure semantics, diagnostics output, and human-readable UAT/report wiring
  - deterministic coding-loop proof is represented as recorded-artifact lanes (`repo-mode-coding-loop` and `pack-install`) with explicit `inspect`, `edit`, `test`, `dev-server`, and `browser` phase diagnostics
  - `repoInstalledComparison` gives downstream slices and release operators a stable repo-vs-installed diff surface with artifact paths and per-phase matches/divergence
- Current parity policy is truthfulness-first: required release lanes drive the verdict, while optional planned-proof or live/provider-driven lanes remain visible and non-blocking rather than being hidden or upgraded prematurely

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
- [ ] M115: UMB secondary-surface parity gate — all slices through S05 are now complete in execution terms; milestone-level validation/completion remains pending

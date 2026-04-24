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
- M114/S01 is complete: the repo has a tracked baseline parity lane matrix, one machine-readable parity report command, M113 cleanup reconciliation recorded as closed foundation metadata, and a fixture acceptance manifest that explicitly marked the core coding-loop capabilities still uncovered before repo-mode proof landed
- M114/S02 is now complete: the repo has a deterministic parity web-task fixture, a recorded repo-mode coding-loop artifact, repo-mode fixture/parity contract tests, and parity-report wiring that surfaces inspect/edit/test/dev-server/browser diagnostics plus artifact paths for the repo-mode lane
- The next gap is installed packaged parity: S03 must prove the shipped `umb` binary can pass the same fixture contract, then S04/S05 must add richer diagnostics, human UAT, and the strict integrated release gate

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
- M114 uses `tests/parity/` as the baseline proof inventory layer:
  - `tests/parity/baseline-lanes.ts` declares the fixed allowlisted lane matrix, report schema, reconciliation metadata, and manifest loading/validation
  - `tests/parity/run.ts` emits a machine-readable baseline report even when the verdict is failing, so consumers can inspect truthful parity gaps
  - `tests/fixtures/parity-web-task-manifest.json` is the tracked source of truth for the downstream coding-loop acceptance contract
  - deterministic coding-loop proof is represented as a recorded-artifact lane (`repo-mode-coding-loop`) with explicit `inspect`, `edit`, `test`, `dev-server`, and `browser` phase diagnostics
- M114 follows a deterministic-main-proof pattern: a purpose-built fixture drives the main parity gate, while live-model checks stay secondary and non-blocking

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
- [ ] M114: AI coding app parity gate — prove umb can actually be used to make software through a strict core-loop parity suite in both repo/dev and installed `umb` modes
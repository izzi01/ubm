# M114: AI Coding App Parity Gate

**Gathered:** 2026-04-23
**Status:** Ready for planning

## Project Description

This milestone exists to prove that umb is not just a fork that builds or a CLI that prints help text. The user wants smoke tests and UAT that make sure the software really works — specifically, that it indeed can be used to make software and that it is an AI coding app that works like current gsd2 works.

The proof target is the real coding loop, not a narrow startup check: open a repo, inspect and edit files, run commands and tests, manage a dev process, use browser verification when needed, and finish a small software task.

## Why This Milestone

The codebase already has a lot of infrastructure: BMAD flows, GSD workflows, packaged install work, branchless worktrees, smoke tests, integration tests, and live harnesses. What it does not yet have is a strict parity gate that proves the shipped product can actually be used the way the current gsd2 session can.

This milestone solves the trust gap. It turns "the repo has done so far" into a product claim that can be re-checked. It also gives the project a release-quality gate for future upstream merges and refactors.

## User-Visible Outcome

### When this milestone is complete, the user can:

- run umb against a purpose-built small web-task fixture and watch it complete the real coding loop in repo/dev mode
- run the same proof against the installed `umb` binary and see that packaged behavior matches the repo/dev behavior closely enough to trust the shipped product

### Entry point / environment

- Entry point: `umb` CLI, built CLI entrypoint, smoke/integration test runners, and a human-readable UAT script
- Environment: local dev, installed packaged CLI, temporary fixture repo, browser-based verification against a local dev server
- Live dependencies involved: local filesystem, git repo, subprocess/dev server lifecycle, browser tooling; optional live-model check when secrets/models are available

## Completion Class

- Contract complete means: deterministic smoke/integration/fixture-based parity checks exist, run, and assert the agreed coding-loop behaviors
- Integration complete means: the same core proof works in both repo/dev and installed `umb` modes, including dev-server and browser-assisted verification flows
- Operational complete means: packaged install, process startup, background process handling, failure diagnostics, and live-check skip behavior all work under real command execution conditions

## Final Integrated Acceptance

To call this milestone complete, we must prove:

- umb can complete a small web-task fixture end-to-end in repo/dev mode: inspect code, make edits, run tests, start/manage the app, and verify the result in the browser
- the installed `umb` binary can complete the same parity proof without falling back on repo-only assumptions
- the milestone produces one strict release-style parity gate plus a human-readable UAT path that demonstrates "umb can be used to make software"

## Scope

### In Scope

- strict proof that umb can perform the core coding loop as an AI coding app
- both repo/dev-mode parity and installed-binary packaged parity
- a deterministic small web-task fixture under `tests/fixtures/`
- reuse and extension of existing smoke, integration, package-install, live, and live-regression harnesses
- actionable diagnostics for parity failures
- one human-readable UAT script
- cleanup and reconciliation of the stale M113 requirement state for R026 if still reflected incorrectly in project artifacts

### Out of Scope / Non-Goals

- perfect one-milestone parity with every gsd2 capability
- broad all-surface parity across BMAD, MCP, web mode, and every secondary surface
- making optional live-model checks block milestone completion when the deterministic parity gate is healthy

## Architectural Decisions

### Deterministic main proof with live reality check

**Decision:** Use a deterministic fixture as the main parity proof, plus one smaller live-model spot-check.

**Rationale:** The main gate needs to be stable enough to serve as a release-quality signal. A deterministic fixture provides repeatability, while one live check keeps the milestone honest about real agenting behavior.

**Evidence:** Existing deterministic harnesses already exist in `tests/smoke/`, `src/tests/integration/`, and `tests/live-regression/`. Existing live harnesses already separate opt-in real-environment checks under `tests/live/`.

**Alternatives Considered:**
- Fully deterministic only — more stable, but weaker evidence that umb behaves like a real AI coding app
- Live-model primary proof — stronger realism, but too flaky and secret-dependent for the main release gate

### Small web-task fixture as the parity target

**Decision:** Make the parity fixture a small web task, not just a library or CLI-only fixture.

**Rationale:** The user’s bar is that umb can be used to make software. A small web task exercises the full loop more honestly: file edits, tests, dev server lifecycle, and browser verification.

**Evidence:** The product already exposes browser tools, background process control, and packaged CLI flows; the milestone should prove those user-relevant surfaces work together.

**Alternatives Considered:**
- CLI/library-only fixture — simpler, but weaker proof of real coding-app usefulness
- Dual fixtures — broader, but too large for the first parity milestone

### Extend existing lanes instead of creating a new harness framework

**Decision:** Reuse and extend the existing smoke, integration, pack/install, live, and live-regression lanes.

**Rationale:** The project already has good test-entrypoint separation. Reusing it keeps the milestone focused on parity proof rather than harness reinvention.

**Evidence:** Current files already cover loader/bootstrap, built CLI black-box runs, packaging/install behavior, and opt-in live flows.

**Alternatives Considered:**
- New standalone parity framework — cleaner in isolation, but duplicate maintenance and weaker integration with current verification culture

### Strict parity gate for completion

**Decision:** M114 is done only when the deterministic core-loop parity proof passes in both repo/dev and installed `umb` modes.

**Rationale:** The milestone exists to close a trust gap. A soft or partial gate would not support the product claim that umb works as an AI coding app like current gsd2 works.

**Evidence:** The user explicitly accepted a strict parity gate and packaged parity as non-negotiable for this milestone.

**Alternatives Considered:**
- Medium gate — faster, but weaker product confidence
- Broad but softer audit — covers more surfaces, but weakens the central proof

## Error Handling Strategy

Use pragmatic defaults rather than designing a large failure taxonomy.

- Deterministic smoke and integration checks fail fast.
- Failures must preserve actionable diagnostics that identify what failed and whether it happened in repo/dev mode or installed `umb` mode.
- Browser and dev-server failures should keep enough evidence to debug quickly.
- Optional live-model checks are opt-in and must skip cleanly when secrets or model configuration are absent.
- Packaged parity failures count as first-class parity failures, not secondary packaging issues.
- Milestone completion is blocked by core-loop parity failures, not by optional live checks.

## Risks and Unknowns

- Existing harnesses may overlap awkwardly or encode assumptions that work for gsd2 but not for umb — this could create false confidence or duplicate proof paths
- Installed-binary behavior may diverge from repo/dev behavior in subtle ways — this is the core packaged-parity risk the milestone must retire early
- Browser-assisted verification in a fixture repo may expose timing or process-lifecycle instability — if unmanaged, that would make the release gate noisy instead of trustworthy
- The stale R026 state in REQUIREMENTS.md indicates artifact drift is possible — the milestone should avoid building new proof on top of stale contract state

## Existing Codebase / Prior Art

- `tests/smoke/run.ts` and `tests/smoke/test-*.ts` — current quick smoke runner and entrypoint checks
- `src/tests/integration/e2e-smoke.test.ts` — built black-box CLI smoke coverage for help/version/headless/worktree paths
- `src/tests/integration/pack-install.test.ts` — tarball, install, launch, and packaged-resource verification
- `tests/live/run.ts` — opt-in live test harness
- `tests/live-regression/run.ts` — installed-binary regression harness and post-build state-machine verification
- `.gsd/milestones/M113/M113-SUMMARY.md` — evidence that R026 was already delivered, useful for requirement reconciliation

## Relevant Requirements

- R026 — reconciles the stale requirement state from M113 so the capability contract matches delivered evidence
- R027 — proves core coding-loop parity in repo/dev mode
- R028 — proves packaged parity in installed `umb` mode
- R029 — establishes the deterministic fixture-based release gate
- R030 — adds the human-readable UAT path
- R031 — requires actionable parity diagnostics
- R032 — keeps a live-model spot-check without making the main gate flaky

## Technical Constraints

- The main proof must be deterministic enough to serve as a reliable gate
- The proof must cover both repo/dev and installed-binary paths
- The fixture should live under project test assets, not depend on an unrelated external repo
- Existing harnesses should be extended rather than replaced unless a hard blocker appears
- Optional live checks must never require secrets for the main milestone gate to pass

## Integration Points

- `dist/loader.js` / installed `umb` binary — packaged entrypoints that must behave like repo/dev execution
- `tests/fixtures/` — new fixture home for the deterministic parity target
- browser tooling — verifies the small web task through real browser behavior when needed
- background process handling — manages the fixture app’s dev server lifecycle
- existing smoke/integration/live runners — host the proof lanes rather than being bypassed

## Testing Requirements

The milestone should verify at four levels:

1. **Smoke** — quick CLI and harness sanity checks stay fast and explicit.
2. **Deterministic parity integration** — the fixture-based coding loop passes in repo/dev mode and then in installed `umb` mode.
3. **Packaged parity** — packaged install and runtime behavior remain part of the main proof, not an afterthought.
4. **Live spot-check** — opt-in real-model proof exists and either passes or skips cleanly.

The acceptance path must include a human-readable UAT script that mirrors the product promise in plain language.

## Acceptance Criteria

### Scope
- M114 proves umb can actually be used to make software, not just that commands exist or the binary starts.
- The milestone proves the core coding loop, not full parity with every gsd2 surface.
- The parity target is current gsd2 usefulness, especially the ability to complete a real small coding task.

### Architectural Decisions
- Main proof is deterministic, with a smaller live-model spot-check.
- The primary fixture is a purpose-built small web task.
- Existing smoke/integration/packaged/live lanes are extended instead of replaced.
- Repo/dev and installed `umb` parity are both mandatory.

### Error Handling Strategy
- Deterministic parity failures fail fast and preserve actionable diagnostics.
- Packaged parity failures are blockers.
- Live checks are optional and skip cleanly when not configured.

### Quality Bar
- The deterministic parity fixture passes.
- Repo/dev mode passes.
- Installed `umb` mode passes.
- Smoke, pack/install, and parity suite are green.
- Human-readable UAT exists.
- Live-model spot-check is optional, but if enabled it must pass or skip cleanly.

## Open Questions

- How much of the existing smoke and integration structure can be reused directly versus needing consolidation under the new parity gate?
- What is the smallest good small web-task fixture that still exercises the loop honestly without making the gate noisy?
- Whether the final release gate should emit a single aggregated report artifact or remain a thin command wrapper around existing lanes plus the new fixture proof

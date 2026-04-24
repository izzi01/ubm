---
verdict: needs-attention
remediation_round: 0
---

# Milestone Validation: M114

## Success Criteria Checklist
## Success Criteria Checklist

- [x] **umb proves the agreed core coding loop on a purpose-built small web-task fixture in repo/dev mode.** Evidence: S02 summary verifies the deterministic parity web-task fixture and `tests/parity/run.ts --format json` with `summary.provesCodingLoop: true` and passing inspect/edit/test/dev-server/browser phase diagnostics for `repo-mode-coding-loop`.
- [x] **The installed packaged `umb` binary proves the same core coding-loop behavior on the same fixture.** Evidence: S03 summary verifies installed-mode parity on the same fixture, passing `pack-install`, installed-mode parity contract tests, and `repoInstalledComparison` with no divergence.
- [x] **The project has a strict release-style parity gate plus a human-readable UAT path.** Evidence: S04 summary adds `tests/parity/human-uat.md` and diagnostics contracts; S05 summary adds `tests/parity/release-gate.ts`, `npm run test:parity:release-gate`, and the include-live variant.
- [x] **Parity failures preserve actionable diagnostics instead of noisy or ambiguous output.** Evidence: S02 summary establishes explicit `failedPhase`, `phaseResults`, artifact-path, and browser expected/actual diagnostics; S04 summary adds `tests/parity/diagnostics.ts` to render lane/mode/phase/artifact evidence.
- [x] **Optional live-model proof remains available without becoming the main source of release flakiness.** Evidence: S05 summary verifies opt-in live behavior with explicit `optionalLive.*` metadata and clean skip semantics when no provider is configured.

### Acceptance-Criteria Notes

- Scope, architecture, packaged parity, deterministic fixture, repo/dev parity, installed parity, diagnostics, human-readable UAT, and optional live skip behavior are all evidenced in S02–S05 and `M114-CONTEXT.md`.
- **Needs attention:** `M114-CONTEXT.md` includes the quality-bar item "Smoke, pack/install, and parity suite are green," but Reviewer C found that S04 and S05 explicitly preserve a truthfully red canonical baseline because `smoke-runner` still fails. The release gate is green for the required deterministic lanes, but the broader baseline/parity suite is not fully green.


## Slice Delivery Audit
## Slice Delivery Audit

| Slice | Summary Present | Assessment Present | Status | Notes |
|---|---|---|---|---|
| S01 | Yes (`.gsd/milestones/M114/slices/S01/S01-SUMMARY.md`) | No | Needs-attention | `gsd_milestone_status` shows slice complete with all 3/3 tasks done. Reviewer C found no `ASSESSMENT` files under the slice directories. |
| S02 | Yes (`.gsd/milestones/M114/slices/S02/S02-SUMMARY.md`) | No | Needs-attention | Complete in `gsd_milestone_status` with 3/3 tasks done; no slice assessment artifact found. |
| S03 | Yes (`.gsd/milestones/M114/slices/S03/S03-SUMMARY.md`) | No | Needs-attention | Complete in `gsd_milestone_status` with 3/3 tasks done; no slice assessment artifact found. |
| S04 | Yes (`.gsd/milestones/M114/slices/S04/S04-SUMMARY.md`) | No | Needs-attention | Complete in `gsd_milestone_status` with 2/2 tasks done; no slice assessment artifact found. |
| S05 | Yes (`.gsd/milestones/M114/slices/S05/S05-SUMMARY.md`) | No | Needs-attention | Complete in `gsd_milestone_status` with 2/2 tasks done; no slice assessment artifact found. |

All roadmap slices have SUMMARY artifacts and are marked complete in milestone status, but MV02 is not fully satisfied because no slice-level `ASSESSMENT` artifacts were found for S01–S05.


## Cross-Slice Integration
## Cross-Slice Integration

| Boundary | Producer Summary | Consumer Summary | Status |
|---|---|---|---|
| S01 → S02 | S01 summary confirms the baseline parity command/report, fixture acceptance manifest, and reconciled foundation metadata via `tests/parity/baseline-lanes.ts`, `tests/parity/run.ts`, and `tests/fixtures/parity-web-task-manifest.json`. | S02 summary confirms it extended the parity runner/manifest contract and turned the planned fixture contract into an actual repo/dev proof surface using those shared artifacts. | PASS |
| S02 → S03 | S02 summary confirms it produced the deterministic parity web-task fixture, repo-mode recording, and phase-diagnostic parity lane. | S03 summary explicitly requires and reuses the deterministic fixture, repo-mode recording, and repo-mode coding-loop contract for installed-mode parity. | PASS |
| S03 → S04 | S03 summary confirms installed-mode artifact data, packaged failure surfaces, and `repoInstalledComparison`. | S04 summary explicitly requires the installed-mode parity artifact, comparison data, and packaged failure surfaces, and uses them in the diagnostics renderer and UAT flow. | PASS |
| S03 → S05 | S03 summary confirms a validated `pack-install` proof lane and stable comparison surface. | S05 summary explicitly requires packaged installed-mode parity inputs and makes `repo-mode-coding-loop` plus `pack-install` the required release lanes. | PASS |
| S04 → S05 | S04 summary confirms actionable diagnostics, tracked human-readable UAT, and stable report semantics. | S05 summary explicitly requires and reuses the diagnostics renderer, human-readable UAT path, and failure-surface contract. | PASS |
| S05 → milestone-complete | S05 summary confirms one strict pre-release command and stable release-gate contract. | No milestone-complete consumer summary exists yet, so downstream consumption cannot be confirmed from a consumer artifact. | NEEDS-ATTENTION |

Cross-slice composition is strong across S01–S05, with a clear end-to-end flow from baseline contract through repo proof, installed proof, diagnostics/UAT, and final release gate. The only residual attention item is that the final consumer is milestone validation/completion itself, so there is no downstream consumer summary to audit.


## Requirement Coverage
## Reviewer A — Requirements Coverage

| Requirement | Status | Evidence |
|---|---|---|
| R027 — umb can complete the core coding loop in repo/dev mode on a purpose-built small web-task fixture | COVERED | `S02-SUMMARY.md` says S02 “delivered the repo/dev coding-loop parity proof” and that `tests/parity/run.ts --format json` reports `summary.provesCodingLoop: true` with explicit inspect/edit/test/dev-server/browser phase diagnostics for `repo-mode-coding-loop`. |
| R028 — The same core coding-loop proof passes against the installed and packaged `umb` binary | COVERED | `S03-SUMMARY.md` says S03 “finished the installed-binary half” and verified `pack-install` plus installed-mode parity contract tests, with both `repo-mode-coding-loop` and `pack-install` passing and `repoInstalledComparison` showing no divergence. |
| R029 — A deterministic parity fixture under `tests/fixtures/` provides a stable release gate for the core coding loop | COVERED | `S02-SUMMARY.md` says S02 added/stabilized the tracked `tests/fixtures/parity-web-task/` app, `tests/fixtures/recordings/repo-mode-parity-web-task.json`, and wired the fixture into the parity report as a deterministic recorded-artifact proof lane. |
| R030 — The project includes a human-readable UAT script demonstrating “umb can be used to make software” on the parity fixture | COVERED | `S04-SUMMARY.md` says S04 added `tests/parity/human-uat.md` as a tracked product-level walkthrough for repo and installed modes, with passing contract tests proving the UAT surface. |
| R031 — Parity failures preserve actionable diagnostics showing what failed, in which mode, with enough evidence to debug quickly | COVERED | `S04-SUMMARY.md` says S04 added `tests/parity/diagnostics.ts` and that it renders failing/skipped lane, mode, failed phase, artifact path, command/browser evidence, and repo-vs-installed comparison from the canonical baseline report. |
| R032 — A live-model spot-check exists, is non-blocking, and must pass or skip cleanly when config/secrets are absent | COVERED | `S05-SUMMARY.md` says S05 integrated the live harness as an opt-in spot-check, exposed `optionalLive.*` metadata, and verified clean skip behavior (`configured: false`, `skipReason: no-provider-configured`) without affecting the deterministic release verdict. |
| R033 — Broader parity with secondary gsd2 feature surfaces remains planned work, but not part of M114 | COVERED | `S05-SUMMARY.md` explicitly says the release gate only requires deterministic `repo-mode-coding-loop` and `pack-install` lanes, and that non-required lanes remain visible without broadening the milestone scope. `S01-SUMMARY.md` and `S02-SUMMARY.md` also frame the work around the core coding loop rather than a wider parity audit. |
| R034 — Full parity across BMAD flows, MCP integrations, web mode, and every secondary surface is deferred until after the core-loop parity gate exists | COVERED | Across the slice summaries, M114 stays tightly scoped to the deterministic parity fixture and core coding loop. `S05-SUMMARY.md` describes the final pattern as a strict pre-release verdict over the agreed repo/dev and installed coding-loop proof, not an all-surface parity audit. |
| R035 — M114 does not attempt perfect one-milestone parity with every gsd2 capability | COVERED | `S05-SUMMARY.md` explicitly states the slice assembled the final release-facing parity gate around the agreed required lanes only, while `S01-SUMMARY.md` describes a “truthful parity inventory” of what is and is not yet proven. |
| R036 — Optional live-model checks do not block milestone completion without a deterministic parity failure | COVERED | `S05-SUMMARY.md` explicitly says the release gate treats the live spot-check as opt-in and non-blocking, and that skipped live status does not affect the required deterministic release verdict. |

Reviewer A verdict: PASS. All M114-scoped requirements are covered by slice evidence.


## Verification Class Compliance
| Class | Planned Check | Evidence | Verdict |
|---|---|---|---|
| Contract | Deterministic smoke/integration/fixture-based parity checks exist, run, and assert the agreed coding-loop behaviors. | `M114-CONTEXT.md` defines this class. `S01-SUMMARY.md` establishes the baseline parity matrix/report. `S02-SUMMARY.md` and `S03-SUMMARY.md` prove repo/dev and installed coding-loop behaviors. But `S04-SUMMARY.md` and `S05-SUMMARY.md` state the canonical baseline/parity suite is still red because `smoke-runner` fails. | NEEDS-ATTENTION |
| Integration | The same core proof works in both repo/dev and installed `umb` modes, including dev-server and browser-assisted verification flows. | `S02-SUMMARY.md` shows repo-mode inspect/edit/test/dev-server/browser proof. `S03-SUMMARY.md` shows installed-mode proof on the same fixture with `repoInstalledComparison` and zero divergence phases. `S05-SUMMARY.md` makes these the required release lanes. | PASS |
| Operational | Packaged install, process startup, background process handling, failure diagnostics, and live-check skip behavior all work under real command execution conditions. | `S03-SUMMARY.md` passes `pack-install` and live-regression checks. `S02-SUMMARY.md`/`S03-SUMMARY.md` preserve ordered phase diagnostics including dev-server behavior. `S04-SUMMARY.md` adds actionable diagnostics. `S05-SUMMARY.md` verifies clean live skip semantics in release output. | PASS |
| UAT | The acceptance path includes a human-readable UAT script that mirrors the product promise in plain language. | `M114-CONTEXT.md` requires a human-readable UAT path. `S04-SUMMARY.md` adds `tests/parity/human-uat.md` and passing contract coverage; `S05-SUMMARY.md` keeps it in the final operator workflow. | PASS |


## Verdict Rationale
Overall verdict is `needs-attention` because the parallel review did not find missing requirement evidence or broken slice-to-slice composition across the milestone’s core proof path, but it did find two unresolved validation gaps. First, MV02 is incomplete because all roadmap slices have SUMMARY artifacts and completed task state, yet no slice-level ASSESSMENT artifacts were present. Second, the milestone acceptance/Contract-class evidence remains mixed because the canonical baseline/parity suite is still truthfully red due to `smoke-runner`, even though the strict release gate for the required deterministic repo-mode and installed-mode lanes is passing.

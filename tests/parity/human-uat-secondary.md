# Human-readable secondary-surface parity UAT

This guide explains the release-facing claim for the secondary parity band in plain language: **umb publishes one integrated secondary-surface release artifact that tells an operator which secondary lanes are proven now, which optional/provider-driven lanes remain non-blocking, and exactly where to inspect failures when one of the required surfaces breaks.**

The proof is intentionally release-readable and deterministic. Instead of asking an operator to manually replay MCP, workflow, web-mode, and worktree/session checks one by one, it uses the tracked integrated release report, the shared diagnostics renderer, the unified release-facing summary artifact, and the underlying tracked artifacts already emitted by the secondary parity band.

## Preconditions

Confirm these tracked inputs exist before evaluating the claim:

- `tests/parity/artifacts/baseline-report.json`
- `tests/parity/artifacts/secondary-release-report.json`
- `tests/parity/artifacts/secondary-surface-inventory.json`
- `tests/parity/artifacts/release-facing-summary.json`
- `tests/parity/artifacts/mcp-parity.json`
- `tests/parity/artifacts/workflow-parity.json`
- `tests/fixtures/worktree-session-parity-manifest.json`
- `tests/parity/secondary-release-gate.ts`
- `tests/parity/diagnostics.ts`
- `tests/parity/release-facing-summary.ts`
- `tests/parity/human-uat-secondary.md`

## Deterministic release commands

Use these tracked commands for the secondary parity band:

```bash
node --experimental-strip-types tests/parity/secondary-release-gate.ts --report tests/parity/artifacts/baseline-report.json --format text
node --experimental-strip-types tests/parity/diagnostics.ts --surface secondary --report tests/parity/artifacts/secondary-release-report.json
```

Policy:

- The integrated secondary release gate is the release-facing machine-readable verdict.
- The diagnostics command is the operator-facing human-readable failure and inspection surface.
- Required secondary lanes drive the verdict.
- Optional lanes remain visible and auditable, but they do not flip the release verdict by themselves.
- Provider/live coverage remains explicit and non-blocking.
- Existing partial secondary parity coverage must stay truthful; the report should say what is missing rather than imply full closure.

## Unified release-facing source

Read `tests/parity/artifacts/release-facing-summary.json` before drafting milestone-facing prose. It is the authoritative source for the release-facing parity story and exposes the exact fields milestone completion should quote:

- `milestoneSummaryInput.authoritativeSource`
- `milestoneSummaryInput.whatUmbProvesNow`
- `milestoneSummaryInput.whatRemainsOptional`
- `milestoneSummaryInput.whatRemainsOutOfScope`
- `baselineExplanation`
- `whyPartialIsTruthful`
- `residualInventory`
- `scopedOutSurfaces`

Tracked milestone-facing files that must stay aligned to this source are:

- `.gsd/milestones/M116/M116-ROADMAP.md`
- `.gsd/milestones/M116/slices/S02/S02-SUMMARY.md`
- `.gsd/milestones/M116/slices/S03/S03-SUMMARY.md`
- `.gsd/milestones/M116/slices/S04/S04-SUMMARY.md`
- the final DB-rendered milestone completion summary for M116

Do not restate release status from memory or from ad hoc sentence fragments. Quote the unified summary fields so the milestone-facing story stays consistent with the tracked parity artifacts.

## What the integrated artifact is proving

Read `tests/parity/artifacts/secondary-release-report.json` first. The artifact must expose:

- `requiredLaneNames`
- `requiredLanesPassed`
- `failedRequiredLanes`
- `failedSurfaces`
- `failedPhases`
- `artifactPaths`
- `baselineSummary`
- `secondaryParitySummary`
- `requiredLanes`
- `optionalLanes`
- `optionalLive`

The required secondary surfaces are:

- `web-mode`
- `mcp`
- `workflow-bmad`
- `worktree-session-recovery`
- `rebrand-drift`

If those required lanes remain green, the integrated secondary verdict is green even if optional proof remains planned or live coverage is skipped.

## Generate the current release-facing secondary report

Run the integrated gate command:

```bash
node --experimental-strip-types tests/parity/secondary-release-gate.ts --report tests/parity/artifacts/baseline-report.json --format text
```

Expected outcome:

- The command prints `Secondary parity release gate: verdict=passed` when all required secondary lanes are green.
- The text output names `requiredLaneNames`, `failedSurfaces`, `failedPhases`, and `diagnosticsCommand`.
- The output points at `tests/parity/artifacts/secondary-release-report.json` as the integrated artifact.
- The output keeps `optionalLive` explicit.

## Human-readable diagnostics path

Run the shared diagnostics renderer in secondary mode:

```bash
node --experimental-strip-types tests/parity/diagnostics.ts --surface secondary --report tests/parity/artifacts/secondary-release-report.json
```

Expected diagnostic surface:

- `Secondary parity diagnostics: verdict=...`
- `requiredLanesPassed: yes|no`
- `requiredLaneNames: web-mode, mcp, workflow-bmad, worktree-session-recovery, rebrand-drift`
- `failedSurfaces` and `failedPhases`
- `baselineReportPath`
- `secondaryReleaseReportPath`
- `secondarySurfaceInventoryPath`
- `worktreeSessionManifestPath`
- required secondary lane sections with `summary`, `reportPath`, `artifactPaths`, and `detail:` lines
- optional secondary lane sections with explicit `blocking=no`
- `optionalLive.status`, `optionalLive.includeLiveRequested`, and live skip/configuration semantics

This command is the human-auditable path for the secondary parity band. It should help an operator decide what is proven now and which tracked artifact explains the current state.

## Pass interpretation

A passing secondary-surface verdict means all of the following are true:

- `requiredLanesPassed` is `true`.
- `failedRequiredLanes` is empty.
- `failedSurfaces` is `none`.
- `failedPhases` is `none`.
- Each required lane section includes a stable `reportPath` or `artifactPaths` pointer back to the tracked underlying proof.
- Optional planned proof stays visible as `planned` instead of being silently dropped.
- Live/provider coverage stays explicit and non-blocking.

When those conditions hold, a human operator can truthfully say: **umb currently has one integrated, release-readable secondary-surface parity artifact covering web mode, MCP, workflow/BMAD, worktree/session/recovery, and scoped rebrand drift, with optional/live coverage still explicit but non-blocking.**

## Partial interpretation

Secondary parity can still be truthfully partial even when the integrated required verdict is green.

Use these interpretation rules:

- `baselineSummary` describes the overall baseline lane state.
- `secondaryParitySummary.partial` counts surfaces that are still only partially release-readable.
- Optional planned proof such as `repo-recording:web-mode`, `installed-recording:web-mode`, `integration:mcp-session`, `repo-recording:workflow-bmad`, and `installed-recording:worktree-session-recovery` must remain visible rather than being reported as completed proof.
- `optionalLive.status=skipped` is acceptable when live coverage was not requested or no provider is configured.
- Partial coverage is truthful when the report names the exact gap instead of collapsing it into an ambiguous green summary.

## Fail interpretation

If the secondary release gate is red, the operator should expect:

- `requiredLanesPassed: no`
- one or more entries in `failedRequiredLanes`
- concrete `failedSurfaces`
- concrete `failedPhases`
- lane-local `artifactPaths`
- lane-local `detail:` diagnostics that explain what drifted

Typical truthful failure patterns include:

- `mcp` failing with `failedPhases: mcp-parity`
- `workflow-bmad` failing with `failedPhases: workflow-verification`
- `worktree-session-recovery` failing with `failedPhases: contract`
- `rebrand-drift` failing when tracked expected drift is no longer line-stable or explicit

## Failure inspection order

When the secondary report is red, inspect in this order:

1. `tests/parity/artifacts/secondary-release-report.json` — find `failedRequiredLanes`, `failedSurfaces`, `failedPhases`, and lane-local `artifactPaths`.
2. `node --experimental-strip-types tests/parity/diagnostics.ts --surface secondary --report tests/parity/artifacts/secondary-release-report.json` — read the human-readable summary.
3. The lane artifact named by `artifactPaths` — such as `tests/parity/artifacts/mcp-parity.json`, `tests/parity/artifacts/workflow-parity.json`, or `tests/fixtures/worktree-session-parity-manifest.json`.
4. `tests/parity/artifacts/baseline-report.json` when you need the broader parity context behind the secondary summary.
5. `tests/parity/artifacts/secondary-surface-inventory.json` when you need to confirm which gaps are intentionally still partial or planned.

Use the following concrete questions:

- Which required secondary surface failed?
- Which phase failed?
- Which tracked artifact recorded that failure?
- Is the failure in a blocking required lane or a non-blocking optional lane?
- Is live/provider evidence merely skipped, or did a required deterministic surface actually regress?

## Optional/live interpretation

The live/provider lane is intentionally non-blocking here too.

Use these interpretation rules:

- If `optionalLive.status` is `passed`, the optional live lane succeeded.
- If `optionalLive.status` is `failed`, the deterministic secondary verdict still comes from the required lanes, but the operator should inspect live/provider behavior separately.
- If `optionalLive.status` is `skipped` and `optionalLive.skipReason` is `not-enabled`, the operator ran the deterministic default path.
- If `optionalLive.status` is `skipped` and the reason indicates missing provider configuration, live coverage was requested but unavailable.
- The report must describe live/provider status without exposing secret values.

## Current truthful reading

The current secondary artifact may report a green required-lane verdict while still showing partial release-readable coverage in the broader secondary parity summary. That is expected and truthful. The operator should rely on the integrated gate plus diagnostics to answer:

- what is required and passing now,
- what remains optional or planned,
- and where to look next when a required lane breaks.

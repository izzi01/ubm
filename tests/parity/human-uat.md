# Human-readable parity fixture UAT

This guide demonstrates the product claim in plain language: **umb can complete a small tracked software task in both repo mode and installed mode using the same deterministic parity fixture, and the release workflow can optionally attach a live-model spot-check without making the deterministic release proof flaky.**

The proof surface is intentionally deterministic. Instead of asking the operator to re-stage the whole coding loop by hand, it uses the tracked fixture brief, tracked repo-mode and installed-mode recordings, and the generated parity report/diagnostics so the same claim can be inspected repeatedly.

## Preconditions

Confirm these tracked inputs exist before evaluating the claim:

- `tests/fixtures/parity-web-task/TASK.md`
- `tests/fixtures/parity-web-task-manifest.json`
- `tests/fixtures/recordings/repo-mode-parity-web-task.json`
- `tests/fixtures/recordings/installed-mode-parity-web-task.json`
- `tests/parity/artifacts/baseline-report.json`
- `tests/parity/diagnostics.ts`
- `tests/parity/run.ts`
- `tests/parity/release-gate.ts`

## Deterministic release commands

Use these tracked commands for release-facing parity checks:

```bash
npm run test:parity:release-gate
npm run test:parity:release-gate:live
```

Policy:

- `npm run test:parity:release-gate` is the default pre-release command.
- `npm run test:parity:release-gate:live` is the explicit include-live variant.
- The deterministic repo/dev and installed packaged coding-loop lanes remain the only required release proof.
- The optional live spot-check is reported as `passed`, `failed`, or `skipped` without changing the required-lane release verdict.
- A skipped live spot-check must explain whether it was skipped because `GSD_LIVE_TESTS` was not enabled or because no live provider API key was configured.
- Live configuration reporting must stay redacted: report status/reason only, never secret values.

## What the fixture is proving

Read `tests/fixtures/parity-web-task/TASK.md` first. The fixture asks the agent to update the app so the browser-visible copy reads exactly `Build status: Complete`, keep the change in tracked application source, run `npm test`, start `npm run dev`, and verify the page in the browser.

Read `tests/fixtures/parity-web-task-manifest.json` next. It names the capability claim being exercised by the fixture:

- inspect repository context
- edit application code
- run targeted tests
- manage dev-server lifecycle
- verify browser behavior

If both parity modes cover those steps on the same fixture, the plain-language claim is satisfied for this deterministic coding-loop proof.

## Generate the current parity report

Run the tracked parity report command:

```bash
node --experimental-strip-types tests/parity/run.ts --format json
```

Expected outcome:

- The command prints JSON for all parity lanes.
- The JSON includes `summary`, `lanes`, and `repoInstalledComparison`.
- The `repo-mode-coding-loop` lane and the `pack-install` lane are present.
- The output points at `tests/parity/artifacts/baseline-report.json` as the report artifact path.

## Repo-mode proof path

Use `tests/fixtures/recordings/repo-mode-parity-web-task.json` as the tracked repo-mode coding-loop artifact.

Read the repo-mode recording and confirm it shows this ordered path:

1. `inspect` — reads the fixture brief and tracked source/test files.
2. `edit` — updates the tracked application code so the required copy becomes `Build status: Complete`.
3. `test` — runs `npm test`.
4. `dev-server` — runs `npm run dev` and waits for the ready URL.
5. `browser` — checks `#status-message` with an explicit browser assertion.

Expected repo-mode success condition:

- The artifact status is `passed`.
- Every phase from `inspect` through `browser` is present.
- The `browser` phase records expected and actual values of `Build status: Complete`.

## Installed-mode proof path

Use `tests/fixtures/recordings/installed-mode-parity-web-task.json` as the tracked installed-mode coding-loop artifact.

Read the installed-mode recording and confirm it shows the same ordered path:

1. `inspect`
2. `edit`
3. `test`
4. `dev-server`
5. `browser`

Expected installed-mode success condition:

- The artifact status is `passed`.
- Every phase from `inspect` through `browser` is present.
- The `browser` phase records expected and actual values of `Build status: Complete`.
- The installed-mode path proves the packaged workflow can complete the same fixture task, not just the repo/dev workflow.

## Release-gate interpretation

Run the release gate when you want the release-style verdict:

```bash
node --experimental-strip-types tests/parity/release-gate.ts --format json
node --experimental-strip-types tests/parity/release-gate.ts --format json --include-live
```

Expected release-gate outcome:

- `requiredLaneNames` stays anchored to `repo-mode-coding-loop` and `pack-install`.
- `failedRequiredLanes` and `failedPhases` explain only deterministic required-lane failures.
- `optionalLive` reports the live lane separately.
- `optionalLive.includeLiveRequested` distinguishes the default release command from the explicit include-live variant.
- `optionalLive.skipReason` reports `not-enabled` when live was not requested and `no-provider-configured` when `--include-live` was requested without live model configuration.
- `diagnosticsCommand`, `baselineReportPath`, `artifactPath`, and `repoInstalledComparison` continue to point the operator back to the canonical deterministic artifacts.

## Plain-language claim check

The deterministic fixture claim is satisfied when all of the following are true:

- `tests/fixtures/parity-web-task/TASK.md` describes a real software-editing task with test, dev-server, and browser verification.
- `tests/fixtures/recordings/repo-mode-parity-web-task.json` shows umb completing that task in repo mode.
- `tests/fixtures/recordings/installed-mode-parity-web-task.json` shows umb completing the same task in installed mode.
- `node --experimental-strip-types tests/parity/run.ts --format json` reports both artifacts inside the parity report.
- `repoInstalledComparison` shows no divergence phases between repo mode and installed mode.

When those conditions hold, a human operator can truthfully say: **umb completed the parity web-task fixture in both repo mode and installed mode using the same observable coding-loop steps.**

## Optional live spot-check interpretation

The live spot-check is intentionally non-blocking.

Use these interpretation rules:

- If `optionalLive.status` is `passed`, the include-live release workflow observed at least one successful real-provider round-trip.
- If `optionalLive.status` is `failed`, the deterministic release verdict still comes from the required repo/dev and installed packaged lanes, but the operator should inspect the live lane failure separately before release.
- If `optionalLive.status` is `skipped` and `optionalLive.skipReason` is `not-enabled`, the operator ran the default deterministic release command.
- If `optionalLive.status` is `skipped` and `optionalLive.skipReason` is `no-provider-configured`, the operator explicitly requested `--include-live` but no supported live-provider API key was configured.
- The report must never echo `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, or any secret value; it should only state whether live configuration was present.

## When parity is red

If the report is red, render the operator-facing diagnostics with:

```bash
node --experimental-strip-types tests/parity/diagnostics.ts --report tests/parity/artifacts/baseline-report.json
```

Expected diagnostic surface when parity is red:

- the failing lane name
- the lane `mode` (`repo-mode` or `installed-mode`)
- the `failedPhase`
- the `artifactPath`
- the highest-signal command or browser evidence already stored in the deterministic artifact
- `repoInstalledComparison` divergence phases

## Failure inspection path

When the parity report fails, inspect in this order:

1. `tests/parity/artifacts/baseline-report.json` — find the failing lane, lane status, `failedPhase`, `artifactPath`, `phaseResults`, and `repoInstalledComparison`.
2. `node --experimental-strip-types tests/parity/diagnostics.ts --report tests/parity/artifacts/baseline-report.json` — read the human-readable failure summary.
3. The lane artifact named by `artifactPath` — inspect the exact phase-local command snippet or browser expected/actual values.
4. Compare `tests/fixtures/recordings/repo-mode-parity-web-task.json` and `tests/fixtures/recordings/installed-mode-parity-web-task.json` if `repoInstalledComparison` reports divergence.

Use the following interpretation rules:

- If `failedPhase` is `inspect`, the workflow did not reliably ground itself in the tracked task brief/source files.
- If `failedPhase` is `edit`, the workflow did not apply the required tracked source change.
- If `failedPhase` is `test`, inspect the recorded `npm test` command result and snippet.
- If `failedPhase` is `dev-server`, inspect the recorded `npm run dev` readiness evidence.
- If `failedPhase` is `browser`, inspect the recorded assertion plus expected and actual UI values.

## Current baseline interpretation

The current deterministic baseline may still be truthfully red outside this document because other parity lanes are allowed to surface existing gaps, and the repo-mode versus installed-mode comparison can also expose a real divergence phase. That is not a reason to discard the guide. The operator should use the diagnostics output to answer these concrete questions:

- Which mode failed?
- Which phase failed?
- Where is the artifact that recorded the failure?
- Which command snippet or browser assertion explains the divergence?

This keeps the parity claim inspectable without exposing secrets or unrelated machine state.

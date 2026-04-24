# S05: S05 — UAT

**Milestone:** M114
**Written:** 2026-04-24T08:06:15.424Z

# S05 UAT — Release parity gate and optional live spot-check

## Preconditions

1. Work from the repo root: `/home/cid/projects-personal/umb`.
2. Confirm these tracked inputs exist:
   - `tests/parity/release-gate.ts`
   - `tests/parity/run.ts`
   - `tests/parity/diagnostics.ts`
   - `tests/parity/human-uat.md`
   - `tests/parity/artifacts/baseline-report.json`
   - `tests/fixtures/recordings/repo-mode-parity-web-task.json`
   - `tests/fixtures/recordings/installed-mode-parity-web-task.json`
3. Assume no live provider secrets are configured unless intentionally testing the live-enabled edge case.

## Test Case 1 — Default deterministic release gate

1. Run `npm run test:parity:release-gate`.
2. Expected outcome:
   - Command exits 0.
   - Output begins with `Parity release gate: verdict=passed`.
   - `requiredLaneNames` are `repo-mode-coding-loop, pack-install`.
   - `requiredLanesPassed: yes` is present.
   - `optionalLive: status=skipped` is present.
   - `optionalLiveSkipReason: not-enabled` is present.
   - `baselineReportPath: tests/parity/artifacts/baseline-report.json` is present.
   - `repoArtifactPath` points to `tests/fixtures/recordings/repo-mode-parity-web-task.json`.
   - `installedArtifactPath` points to `tests/fixtures/recordings/installed-mode-parity-web-task.json`.
   - `diagnosticsCommand` points back to `tests/parity/diagnostics.ts --report tests/parity/artifacts/baseline-report.json`.

## Test Case 2 — Include-live variant skips cleanly without provider configuration

1. Run `node --experimental-strip-types tests/parity/release-gate.ts --format json --include-live`.
2. Expected outcome:
   - Command exits 0.
   - JSON `verdict` remains `passed`.
   - JSON `requiredLanesPassed` is `true`.
   - `optionalLive.includeLiveRequested` is `true`.
   - `optionalLive.enabled` is `true`.
   - `optionalLive.configured` is `false` when no supported provider key is present.
   - `optionalLive.status` is `skipped`.
   - `optionalLive.skipReason` is `no-provider-configured`.
   - No secret values are echoed anywhere in the output.

## Test Case 3 — Diagnostics path remains actionable from canonical artifact

1. Run `node --experimental-strip-types tests/parity/diagnostics.ts --report tests/parity/artifacts/baseline-report.json`.
2. Expected outcome:
   - Output begins with `Parity diagnostics:`.
   - It reports lane counts and `provesCodingLoop: yes`.
   - It shows actionable summaries for `repo-mode-coding-loop` and `pack-install` with mode labels and artifact paths.
   - It includes browser evidence for the deterministic fixture and the `Build status: Complete` assertion.
   - It includes the `repo-installed comparison` block with both artifact paths and `divergencePhases: none`.

## Test Case 4 — Canonical baseline remains inspectable even when not the release verdict

1. Run `node --experimental-strip-types tests/parity/run.ts --format json`.
2. Expected outcome:
   - The command emits the full baseline JSON report.
   - `summary.provesCodingLoop` is `true`.
   - `repoInstalledComparison.comparableWithoutRerun` is `true`.
   - `repo-mode-coding-loop` and `pack-install` are present as passed lanes.
   - It is acceptable if overall `summary.verdict` remains `failing` because non-required lanes such as `smoke-runner` or `live-runner` still report truthful red/skip state.

## Test Case 5 — Human-readable workflow stays aligned to tracked release semantics

1. Open `tests/parity/human-uat.md`.
2. Expected outcome:
   - The guide references both `npm run test:parity:release-gate` and `npm run test:parity:release-gate:live`.
   - It explains that deterministic repo/dev and installed packaged lanes are the only required release proof.
   - It explains the two skip cases for live (`not-enabled` and `no-provider-configured`).
   - It states that live configuration reporting must stay redacted.
   - It points operators back to `tests/parity/diagnostics.ts` and `tests/parity/artifacts/baseline-report.json` for failure inspection.

## Edge Cases

### Edge Case A — Required lane failure should turn the release gate red

1. Use a synthetic or edited baseline report where either `repo-mode-coding-loop` or `pack-install` is not `passed`, then run `node --experimental-strip-types tests/parity/release-gate.ts --report <that-report> --format json`.
2. Expected outcome:
   - Command exits non-zero.
   - `verdict` becomes `failed`.
   - `failedRequiredLanes` is non-empty.
   - Each failed required lane preserves `mode`, `status`, `failedPhase`, and `artifactPath` where available.

### Edge Case B — Default run should not inherit stale live semantics from an earlier include-live run

1. Run the include-live command once.
2. Then run `npm run test:parity:release-gate` again without `--include-live`.
3. Expected outcome:
   - The second run reports `optionalLive.includeLiveRequested: false` / text equivalent.
   - The second run reports `optionalLiveSkipReason: not-enabled`, not `no-provider-configured`.
   - This confirms release-gate live skip semantics are derived from the current invocation policy and environment rather than stale artifact text.


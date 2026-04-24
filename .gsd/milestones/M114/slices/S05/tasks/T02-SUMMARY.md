---
id: T02
parent: S05
milestone: M114
key_files:
  - tests/live/run.ts
  - tests/parity/release-gate.ts
  - tests/parity/baseline-lanes.ts
  - src/tests/integration/parity-live-spot-check-contract.test.ts
  - src/tests/integration/parity-release-gate-contract.test.ts
  - src/tests/integration/parity-human-uat-contract.test.ts
  - tests/parity/human-uat.md
  - package.json
key_decisions:
  - Derived optional live skip semantics from the current release-gate invocation (`--include-live` plus env) instead of trusting whatever skip text was last written into the baseline artifact.
  - Kept the release verdict strictly tied to the deterministic repo/dev and installed packaged coding-loop lanes, while surfacing live participation as explicit pass/skip/fail metadata.
duration: 
verification_result: passed
completed_at: 2026-04-24T08:01:28.699Z
blocker_discovered: false
---

# T02: Integrated the optional live parity spot-check into the release gate with explicit include-live semantics, precise skip reporting, and operator-facing workflow updates.

**Integrated the optional live parity spot-check into the release gate with explicit include-live semantics, precise skip reporting, and operator-facing workflow updates.**

## What Happened

Extended the existing parity release-gate flow instead of introducing a separate live harness. In `tests/live/run.ts` I added an importable live spot-check summary surface that distinguishes three real states without leaking secrets: not enabled, enabled but no supported provider key configured, and executed live checks. In `tests/parity/baseline-lanes.ts` I aligned the live-lane skip policy so the canonical baseline report records a precise skip when `GSD_LIVE_TESTS` is enabled but neither `OPENAI_API_KEY` nor `ANTHROPIC_API_KEY` is configured. In `tests/parity/release-gate.ts` I added `--include-live`, carried that invocation intent into the report contract, bumped the report version, and exposed `optionalLive.includeLiveRequested`, `optionalLive.enabled`, `optionalLive.configured`, and `optionalLive.skipReason` so operators can see whether live was passed, failed, or skipped and why, while the release verdict still depends only on the required repo/dev and installed coding-loop lanes. I updated `tests/parity/human-uat.md` to document the default release command, the explicit include-live variant, the skip-policy semantics, and the redaction boundary. I also added `src/tests/integration/parity-live-spot-check-contract.test.ts`, strengthened the existing release-gate and human-UAT contract tests, and added the `test:parity:release-gate:live` package script. During verification I hit one real contract bug: the release report originally reused the baseline artifact’s prior live skip reason, so a previous include-live rerun could make a later default run report the wrong semantics. I fixed that by deriving optional-live skip metadata from the current release-gate invocation policy plus current environment rather than trusting stale artifact text.

## Verification

Ran the task-plan verification command `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/parity-live-spot-check-contract.test.ts src/tests/integration/parity-human-uat-contract.test.ts src/tests/integration/parity-release-gate-contract.test.ts`, which passed all nine contract tests after fixing skip-reason precedence in the release report builder. Then ran `node --experimental-strip-types tests/parity/release-gate.ts --format json --include-live`, which exited successfully and produced a release-gate JSON report with `verdict: passed`, required deterministic lanes green, and `optionalLive` explicitly marked `status: skipped`, `includeLiveRequested: true`, `enabled: true`, `configured: false`, `skipReason: no-provider-configured` in the current environment.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/parity-live-spot-check-contract.test.ts src/tests/integration/parity-human-uat-contract.test.ts src/tests/integration/parity-release-gate-contract.test.ts` | 0 | ✅ pass | 25020ms |
| 2 | `node --experimental-strip-types tests/parity/release-gate.ts --format json --include-live` | 0 | ✅ pass | 38747ms |

## Deviations

Made one small supporting change outside the narrow file list by updating `tests/parity/baseline-lanes.ts` so the canonical baseline report can truthfully distinguish the enabled-but-unconfigured live skip case that the release gate now exposes. This was required to keep the release report and baseline artifact semantics aligned.

## Known Issues

The canonical baseline remains truthfully red overall because `smoke-runner` is currently failing in this repo state, and the live lane remains skipped in environments without supported provider keys. The release gate intentionally keeps those surfaces explicit without treating the optional live skip as a required-lane failure.

## Files Created/Modified

- `tests/live/run.ts`
- `tests/parity/release-gate.ts`
- `tests/parity/baseline-lanes.ts`
- `src/tests/integration/parity-live-spot-check-contract.test.ts`
- `src/tests/integration/parity-release-gate-contract.test.ts`
- `src/tests/integration/parity-human-uat-contract.test.ts`
- `tests/parity/human-uat.md`
- `package.json`

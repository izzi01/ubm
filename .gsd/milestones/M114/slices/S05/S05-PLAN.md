# S05: Release gate and live spot-check

**Goal:** Assemble the final release-style parity gate around the canonical baseline report so one pre-release command proves repo/dev and installed packaged coding-loop parity, while the live-model spot-check stays opt-in, non-blocking, and explicitly reported as passed or skipped.
**Demo:** After this: one strict parity command/report can be run before release to prove umb behaves like a usable AI coding app for the agreed core loop in repo/dev and installed modes, with an optional live-model spot-check.

## Must-Haves

- A tracked release-gate command consumes the canonical parity report and fails only when the required repo/dev or installed coding-loop proof is missing, red, or diagnostically incomplete.
- The release gate preserves actionable diagnostics by carrying forward mode, failedPhase, artifactPath, repoInstalledComparison, and the existing diagnostics/UAT surfaces instead of inventing a second harness.
- The optional live spot-check is integrated into the release workflow as opt-in and non-blocking: when not enabled or not configured it records a clean skip, and when enabled it reports the live result without downgrading deterministic release proof.
- Contract tests and package scripts lock the release gate semantics so S05 completion can be verified mechanically from tracked files and commands.

## Proof Level

- This slice proves: final-assembly

## Integration Closure

Compose `tests/parity/run.ts`, `tests/parity/diagnostics.ts`, `tests/parity/human-uat.md`, and `tests/live/run.ts` into one release-facing gate and report flow. After this slice, nothing remains inside M114 except milestone-level validation and completion against the assembled gate.

## Verification

- Surface a release verdict that explicitly names required-lane failures, optional-live status, artifact paths, and failed phases.
- Keep `tests/parity/artifacts/baseline-report.json` as the canonical machine-readable artifact, and add a release-gate surface that points operators back to the existing diagnostics/UAT evidence.
- Preserve redaction boundaries by reporting live configuration state as pass/skip/fail metadata without echoing secret values.

## Tasks

- [x] **T01: Assemble the strict release parity gate over the canonical report** `est:1h30m`
  Build a release-facing parity gate command on top of the existing baseline report instead of creating a second harness. The command should rerun or consume the canonical parity report, require the deterministic repo/dev and installed packaged coding-loop lanes to pass, preserve actionable artifactPath/failedPhase/repoInstalledComparison surfaces, and publish a stable report/CLI contract that downstream release checks can call directly.
  - Files: `tests/parity/release-gate.ts`, `tests/parity/baseline-lanes.ts`, `tests/parity/diagnostics.ts`, `src/tests/integration/parity-release-gate-contract.test.ts`, `package.json`
  - Verify: node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/parity-release-gate-contract.test.ts

- [ ] **T02: Integrate the optional live spot-check and lock release workflow semantics** `est:1h15m`
  Wire the existing live harness into the release gate as an opt-in, non-blocking spot-check. Document and test the policy so missing `GSD_LIVE_TESTS` or missing live model configuration yields a precise skip instead of a flaky release failure, while enabled live runs still appear in the release report. Update the human/operator workflow and package scripts so one release command and one explicit include-live variant exist.
  - Files: `tests/live/run.ts`, `tests/parity/release-gate.ts`, `tests/parity/human-uat.md`, `src/tests/integration/parity-live-spot-check-contract.test.ts`, `src/tests/integration/parity-human-uat-contract.test.ts`, `package.json`
  - Verify: node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/parity-live-spot-check-contract.test.ts src/tests/integration/parity-human-uat-contract.test.ts src/tests/integration/parity-release-gate-contract.test.ts && node --experimental-strip-types tests/parity/release-gate.ts --format json --include-live

## Files Likely Touched

- tests/parity/release-gate.ts
- tests/parity/baseline-lanes.ts
- tests/parity/diagnostics.ts
- src/tests/integration/parity-release-gate-contract.test.ts
- package.json
- tests/live/run.ts
- tests/parity/human-uat.md
- src/tests/integration/parity-live-spot-check-contract.test.ts
- src/tests/integration/parity-human-uat-contract.test.ts

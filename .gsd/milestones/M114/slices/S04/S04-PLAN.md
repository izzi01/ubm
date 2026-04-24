# S04: Diagnostics and human UAT

**Goal:** Turn the deterministic repo/installed parity evidence from S02/S03 into operator-facing failure diagnostics plus a tracked human-readable UAT path that demonstrates the parity fixture claim in plain language.
**Demo:** After this: parity failures tell you what broke and where, and there is a human-readable UAT script that demonstrates the claim that umb can be used to make software on the parity fixture.

## Must-Haves

- Parity failures can be rendered into a human-readable diagnostic summary that names the failing lane, mode, phase, artifact path, and the highest-signal command/browser evidence.
- A tracked UAT script walks a human through proving the parity fixture claim in repo and installed modes using only tracked files and existing commands.
- Contract tests lock the diagnostics/UAT surfaces so S05 can consume them without re-deriving report semantics from raw JSON.

## Proof Level

- This slice proves: integration

## Integration Closure

Consume the tracked repo-mode and installed-mode artifacts plus `repoInstalledComparison` from `tests/parity/baseline-lanes.ts`, then add operator-facing rendering and UAT guidance without introducing a second parity harness. After this slice, S05 only needs to assemble the strict release command and optional live spot-check around these deterministic surfaces.

## Verification

- Runtime signals: parity lane status, mode, failedPhase, artifactPath, phaseResults, browser expected/actual values, and repoInstalledComparison divergence phases are promoted into human-readable diagnostics.
- Inspection surfaces: `tests/parity/run.ts --format json`, a new diagnostics-rendering command/script under `tests/parity/`, and the tracked human-readable UAT document.
- Failure visibility: operators can see which mode failed, what phase failed, where the evidence artifact lives, and which command/browser assertion diverged.
- Redaction constraints: keep output limited to fixture-local paths, lane metadata, and command/browser snippets already present in deterministic artifacts; do not surface secrets or unrelated environment state.

## Tasks

- [x] **T01: Render actionable parity diagnostics from the recorded report** `est:1h15m`
  Add an operator-facing diagnostics renderer on top of the existing parity JSON contract instead of inventing a second harness. It should consume the baseline report plus recorded repo/installed artifacts, summarize the failing mode and phase, preserve artifact paths, and surface the highest-signal command/browser evidence for synthetic failure cases. Lock this with integration tests that exercise both passing and failing artifact/report inputs so R031 stays debuggable.
  - Files: `tests/parity/baseline-lanes.ts`, `tests/parity/run.ts`, `tests/parity/diagnostics.ts`, `src/tests/integration/parity-diagnostics-contract.test.ts`, `tests/parity/artifacts/baseline-report.json`
  - Verify: node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/parity-diagnostics-contract.test.ts

- [ ] **T02: Publish the human-readable parity fixture UAT path** `est:1h`
  Write a tracked human-readable UAT guide that proves the product claim in plain language using the deterministic parity fixture and the diagnostics surface from T01. The document should cover preconditions, repo-mode steps, installed-mode steps, expected outcomes, and how to inspect actionable failure evidence when parity is red. Add a contract test that verifies the guide references tracked files/commands and includes both modes so R030 cannot silently drift into a placeholder.
  - Files: `tests/parity/human-uat.md`, `tests/parity/diagnostics.ts`, `tests/fixtures/parity-web-task/TASK.md`, `tests/fixtures/parity-web-task-manifest.json`, `src/tests/integration/parity-human-uat-contract.test.ts`
  - Verify: node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/parity-human-uat-contract.test.ts src/tests/integration/parity-diagnostics-contract.test.ts && node --experimental-strip-types tests/parity/run.ts --format json

## Files Likely Touched

- tests/parity/baseline-lanes.ts
- tests/parity/run.ts
- tests/parity/diagnostics.ts
- src/tests/integration/parity-diagnostics-contract.test.ts
- tests/parity/artifacts/baseline-report.json
- tests/parity/human-uat.md
- tests/fixtures/parity-web-task/TASK.md
- tests/fixtures/parity-web-task-manifest.json
- src/tests/integration/parity-human-uat-contract.test.ts

# S01: Baseline parity audit and residual cleanup

**Goal:** Establish a truthful baseline parity contract for M114 by inventorying the existing smoke/integration/pack-install/live proof lanes, wiring one baseline parity command/report that labels what the repo already proves versus what remains uncovered, reconciling stale M113 cleanup bookkeeping so the baseline is honest, and publishing a fixture acceptance manifest that downstream repo-mode parity work can implement against.
**Demo:** After this: one baseline parity command/report shows what the repo already proves, what it does not, and the stale M113 cleanup drift is reconciled so downstream work starts from a truthful contract.

## Must-Haves

- ## Must-Haves
- One tracked baseline parity runner exists and can execute the current smoke, integration, pack-install, fixture, live, and live-regression lanes as classified proof classes rather than ad-hoc commands.
- The baseline runner emits a machine-readable report that marks each lane as pass/fail/skip plus whether it proves repo-mode parity, installed-binary parity, live spot-check behavior, or only partial infrastructure coverage.
- Stale M113 cleanup drift is reconciled so M113-delivered requirement state and baseline reporting agree on what was already proven.
- A tracked fixture acceptance manifest defines the exact inspect → edit → test → dev-server → browser-verification loop that S02 must satisfy, and the baseline report calls out that this contract is still uncovered until S02 lands.
- Package scripts and integration tests make the baseline contract mechanically runnable in CI and locally.
- ## Threat Surface
- **Abuse**: baseline command must not become an arbitrary shell passthrough; it should run a fixed allowlisted lane matrix only.
- **Data exposure**: reports may mention whether live lanes were skipped, but must not print secret values or raw provider credentials.
- **Input trust**: only trusted in-repo lane definitions and tracked fixture manifest files should feed the baseline report.
- ## Requirement Impact
- **Requirements touched**: R026 bookkeeping reconciliation, R027 downstream repo-mode proof contract, and the forthcoming parity requirements described in M114 context.
- **Re-verify**: M113 requirement state, current smoke/integration/pack-install/live lane coverage, and downstream fixture acceptance assumptions.
- **Decisions revisited**: D007, D008, D009, D010.
- ## Verification
- `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/parity-baseline-contract.test.ts src/tests/integration/parity-m113-reconciliation.test.ts src/tests/integration/parity-fixture-manifest.test.ts`
- `node --experimental-strip-types tests/parity/run.ts --format json`
- `npm run test:parity:baseline`
- ## Done-When Checks
- The baseline report truthfully shows which existing lanes prove only startup/packaging infrastructure versus actual coding-loop parity.
- The report and requirement bookkeeping no longer claim M113 cleanup work is still merely active when the summary and validation already proved it.
- The fixture acceptance manifest is specific enough that a fresh S02 executor can build the repo-mode proof without reopening milestone-level planning debates.

## Proof Level

- This slice proves: contract
- Real runtime required: yes
- Human/UAT required: no

## Integration Closure

- Upstream surfaces consumed: `tests/smoke/run.ts`, `tests/fixtures/run.ts`, `tests/live/run.ts`, `tests/live-regression/run.ts`, `src/tests/integration/e2e-smoke.test.ts`, `src/tests/integration/e2e-headless.test.ts`, `src/tests/integration/pack-install.test.ts`, `.gsd/milestones/M113/M113-SUMMARY.md`, `.gsd/milestones/M113/M113-VALIDATION.md`, `.gsd/REQUIREMENTS.md`.
- New wiring introduced in this slice: a tracked parity lane matrix plus package script that turns existing verification lanes into one baseline command/report, and a tracked fixture acceptance manifest consumed by downstream parity slices.
- What remains before the milestone is truly usable end-to-end: S02 must make the repo/dev coding loop pass on the fixture, S03 must prove installed-binary parity on the same fixture, and later slices must add actionable diagnostics plus human-readable UAT.

## Verification

- Runtime signals: per-lane status, proof-class label, skip reason, exit code, duration, and baseline summary verdict.
- Inspection surfaces: `npm run test:parity:baseline`, `node --experimental-strip-types tests/parity/run.ts --format json`, and generated report artifacts written by the baseline runner.
- Failure visibility: the failing lane name, whether the gap is repo-mode vs installed-mode vs live-only, and the manifest capability still uncovered.
- Redaction constraints: do not echo API keys, provider env var values, or raw live-test secrets in the report.

## Tasks

- [x] **T01: Build the baseline parity lane matrix and executable report runner** `est:90m`
  Skills to load before coding: `test`, `verify-before-complete`.

Create a tracked baseline parity runner that inventories the existing proof lanes instead of introducing a new harness family. The runner should define a fixed allowlisted lane matrix for `tests/smoke/run.ts`, `tests/fixtures/run.ts`, `tests/live/run.ts`, `tests/live-regression/run.ts`, `src/tests/integration/e2e-smoke.test.ts`, `src/tests/integration/e2e-headless.test.ts`, and `src/tests/integration/pack-install.test.ts`, then execute or classify them into proof classes such as smoke, repo-infra, installed-binary, live-spot-check, and uncovered-coding-loop.

Steps:
1. Add a small parity module under `tests/parity/` that declares the lane definitions, proof labels, skip semantics, and report schema without accepting arbitrary external commands.
2. Add a runner entrypoint and package script so one command emits a machine-readable baseline report summarizing pass/fail/skip, duration, proof class, and whether each lane actually proves the coding loop claimed by M114.
3. Add an integration test that exercises the runner in a temp workspace, asserts the report shape and labels, and proves the lane matrix stays tied to the real in-repo test files.

Must-haves:
- Fixed allowlisted lane definitions; no arbitrary shell passthrough.
- Machine-readable baseline report with explicit proof-class labels.
- Package script wired for local and CI use.
- Integration test covers success and skipped-lane classification.

Failure Modes (Q5): dependency process spawn failures should surface the lane name and exit code; timeouts should mark the lane timed_out rather than hanging the report; malformed lane definitions should fail the integration test before runtime.
Load Profile (Q6): shared resources are local subprocess slots and temporary directories; per operation cost is one child process per lane; at 10x load the first breakpoint is process churn and runtime, so the runner must stay sequential and bounded.
Negative Tests (Q7): invalid lane metadata, missing script targets, and skipped live lanes without secrets must all be covered.
  - Files: `package.json`, `tests/parity/run.ts`, `tests/parity/baseline-lanes.ts`, `src/tests/integration/parity-baseline-contract.test.ts`
  - Verify: node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/parity-baseline-contract.test.ts

- [ ] **T02: Reconcile stale M113 cleanup bookkeeping and baseline truth claims** `est:60m`
  Skills to load before coding: `test`, `verify-before-complete`, `debug-like-expert`.

Use M113’s summary and validation evidence to reconcile the stale cleanup contract that M114 explicitly calls out. The implementation should update the project requirement bookkeeping and make the baseline report truthfully reflect that M113 already delivered its cleanup work, instead of letting S01 build new parity claims on top of known drift.

Steps:
1. Read `.gsd/milestones/M113/M113-SUMMARY.md`, `.gsd/milestones/M113/M113-VALIDATION.md`, and `.gsd/REQUIREMENTS.md` to identify which requirement rows or notes still misstate the delivered state.
2. Update the requirement bookkeeping through the GSD requirement tool during execution, then reflect the reconciled state in the parity baseline module or report annotations so the baseline distinguishes closed M113 cleanup from open M114 parity work.
3. Add an integration test that proves the baseline contract stays aligned with the reconciled requirement/bookkeeping state and fails if the old drift reappears.

Must-haves:
- The stale M113 cleanup drift called out in M114 context is concretely resolved, not merely documented.
- Baseline reporting no longer treats already-validated M113 cleanup as an open parity gap.
- Regression coverage guards the bookkeeping/report alignment.

Failure Modes (Q5): if requirement update tooling fails, stop and surface the exact requirement id and error; if source evidence is inconsistent, fail the test with the mismatched files called out; if the report annotation drifts from bookkeeping, the contract test must fail.
Load Profile (Q6): shared resources are the tracked `.gsd` requirement artifacts and baseline schema; per operation cost is trivial file parsing; at 10x scale the main risk is human confusion from stale state, not runtime load.
Negative Tests (Q7): stale active status, missing validation note, and inconsistent M113 summary-vs-report labeling should all fail deterministically.
  - Files: `.gsd/REQUIREMENTS.md`, `tests/parity/baseline-lanes.ts`, `src/tests/integration/parity-m113-reconciliation.test.ts`
  - Verify: node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/parity-m113-reconciliation.test.ts

- [ ] **T03: Publish the fixture acceptance manifest and wire uncovered capability reporting** `est:75m`
  Skills to load before coding: `test`, `verify-before-complete`.

Define the exact downstream contract for the purpose-built small web-task fixture and wire it into the baseline report so S02 starts from a truthful acceptance target instead of milestone prose. This task should publish a tracked manifest describing the required inspect, edit, test, dev-server, and browser-verification steps, then make the baseline report explicitly mark those capabilities as not-yet-proven in S01.

Steps:
1. Add a tracked acceptance manifest under `tests/fixtures/` describing the purpose-built web-task parity contract, observable completion criteria, and which current lanes do or do not cover each capability.
2. Extend the parity runner to load the manifest and include uncovered-capability rows or summary fields so the report states exactly what remains for S02.
3. Add an integration test that validates the manifest shape and verifies the baseline runner surfaces the uncovered coding-loop capabilities rather than over-claiming parity.

Must-haves:
- Manifest uses concrete capability names matching M114’s coding-loop promise.
- Baseline report marks uncovered capabilities explicitly instead of implying they already pass.
- The manifest is tracked in git and readable by downstream test code without depending on `.gsd/runtime` artifacts.

Failure Modes (Q5): malformed manifest should fail fast in tests; missing capability-to-lane mapping should fail validation; report generation should surface manifest parse errors with file path context.
Load Profile (Q6): shared resources are tracked manifest JSON and the baseline runner; per operation cost is trivial parsing and summary generation; at 10x scale the likely breakpoint is contract sprawl, so keep the manifest minimal and bounded to the agreed core loop.
Negative Tests (Q7): missing required capability keys, unknown proof labels, and a report that marks uncovered capabilities as covered must all fail.
  - Files: `tests/fixtures/parity-web-task-manifest.json`, `tests/parity/baseline-lanes.ts`, `tests/parity/run.ts`, `src/tests/integration/parity-fixture-manifest.test.ts`
  - Verify: node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/parity-fixture-manifest.test.ts

## Files Likely Touched

- package.json
- tests/parity/run.ts
- tests/parity/baseline-lanes.ts
- src/tests/integration/parity-baseline-contract.test.ts
- .gsd/REQUIREMENTS.md
- src/tests/integration/parity-m113-reconciliation.test.ts
- tests/fixtures/parity-web-task-manifest.json
- src/tests/integration/parity-fixture-manifest.test.ts

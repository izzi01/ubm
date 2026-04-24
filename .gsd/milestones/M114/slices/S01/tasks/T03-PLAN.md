---
estimated_steps: 13
estimated_files: 4
skills_used: []
---

# T03: Publish the fixture acceptance manifest and wire uncovered capability reporting

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

## Inputs

- ``tests/fixtures/run.ts``
- ``tests/fixtures/provider.ts``
- ``tests/parity/baseline-lanes.ts``
- ``.gsd/milestones/M114/M114-CONTEXT.md``
- ``.gsd/milestones/M114/M114-ROADMAP.md``

## Expected Output

- ``tests/fixtures/parity-web-task-manifest.json``
- ``tests/parity/baseline-lanes.ts``
- ``tests/parity/run.ts``
- ``src/tests/integration/parity-fixture-manifest.test.ts``

## Verification

node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/parity-fixture-manifest.test.ts

## Observability Impact

Extends the baseline report with uncovered capability names so later failures can say which coding-loop step still lacks proof, not just which lane ran.

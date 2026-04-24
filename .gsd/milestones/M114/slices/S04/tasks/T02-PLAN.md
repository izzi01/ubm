---
estimated_steps: 1
estimated_files: 5
skills_used: []
---

# T02: Publish the human-readable parity fixture UAT path

Write a tracked human-readable UAT guide that proves the product claim in plain language using the deterministic parity fixture and the diagnostics surface from T01. The document should cover preconditions, repo-mode steps, installed-mode steps, expected outcomes, and how to inspect actionable failure evidence when parity is red. Add a contract test that verifies the guide references tracked files/commands and includes both modes so R030 cannot silently drift into a placeholder.

## Inputs

- ``tests/parity/diagnostics.ts``
- ``tests/fixtures/parity-web-task/TASK.md``
- ``tests/fixtures/parity-web-task-manifest.json``
- ``tests/fixtures/recordings/repo-mode-parity-web-task.json``
- ``tests/fixtures/recordings/installed-mode-parity-web-task.json``
- ``tests/parity/artifacts/baseline-report.json``

## Expected Output

- ``tests/parity/human-uat.md``
- ``src/tests/integration/parity-human-uat-contract.test.ts``

## Verification

node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/parity-human-uat-contract.test.ts src/tests/integration/parity-diagnostics-contract.test.ts && node --experimental-strip-types tests/parity/run.ts --format json

## Observability Impact

Makes the deterministic evidence usable by a human operator by naming the exact commands, report files, and failure-inspection path to follow when repo or installed parity breaks.

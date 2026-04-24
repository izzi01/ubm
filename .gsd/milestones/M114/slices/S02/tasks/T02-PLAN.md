---
estimated_steps: 14
estimated_files: 4
skills_used: []
---

# T02: Prove the repo-mode coding loop against the fixture

Skills to load before coding: `test`, `agent-browser`, `verify-before-complete`.

Turn the fixture into a real repo-mode proof by driving the repo/dev `umb` entrypoint through the deterministic coding loop in a temp workspace. Reuse the existing fixture replay approach instead of introducing a second harness family, but make the test assert on actual side effects: file edits, fixture test execution, dev-server readiness, browser assertions, and cleanup.

Steps:
1. Add a tracked deterministic conversation/command script that makes `umb` inspect the fixture files, edit the intended source file, run the fixture test command, start the dev server, verify the browser state, and stop the server.
2. Add an integration helper/test that materializes the fixture into a temp git repo, runs the repo/dev CLI against it, and records high-signal artifacts for each phase.
3. Assert the completed run changed the expected tracked files, observed passing fixture tests, captured browser assertion evidence, and cleaned up the dev server before exit.

Must-haves:
- [ ] The proof runs the repo/dev entrypoint from this repository, not the installed binary.
- [ ] The agent path includes inspect → edit → test → dev-server → browser verify → cleanup.
- [ ] Browser verification uses explicit assertions, not prose-only success text.
- [ ] Failure output names the phase that broke and where to inspect artifacts.

Failure Modes (Q5): CLI spawn failures must preserve stdout/stderr and the invoked args; dev-server timeouts must fail with the ready check and port; browser assertion failures must preserve the selector/text expectation and screenshot or DOM evidence; cleanup failures must surface the orphaned process id/command.
Load Profile (Q6): shared resources are one repo-mode child process, one dev server, and one browser session; per run cost is one full coding-loop execution; at 10x load the first breakpoint is browser/server startup time, so the harness must serialize execution and aggressively clean temp state.
Negative Tests (Q7): cover wrong-file edits, fixture tests still failing after the scripted run, dev server never reaching readiness, and browser assertions against stale UI.

## Inputs

- ``tests/fixtures/parity-web-task/package.json``
- ``tests/fixtures/parity-web-task/src/main.ts``
- ``tests/fixtures/parity-web-task/src/task.ts``
- ``tests/fixtures/parity-web-task/tests/task.spec.ts``
- ``tests/fixtures/parity-web-task/TASK.md``
- ``tests/fixtures/provider.ts``
- ``src/tests/integration/e2e-smoke.test.ts``
- ``src/tests/integration/e2e-headless.test.ts``

## Expected Output

- ``tests/fixtures/recordings/repo-mode-parity-web-task.json``
- ``src/tests/integration/helpers/repo-mode-parity.ts``
- ``src/tests/integration/repo-mode-coding-loop.test.ts``

## Verification

node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/repo-mode-coding-loop.test.ts

## Observability Impact

Expose per-phase repo-mode artifacts (selected files, command results, ready signal, browser assertion result, cleanup status) so failures localize to inspect/edit/test/dev-server/browser instead of a generic parity miss.

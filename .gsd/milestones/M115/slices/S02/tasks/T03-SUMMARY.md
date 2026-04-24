---
id: T03
parent: S02
milestone: M115
key_files:
  - src/tests/integration/web-mode-diagnostics-contract.test.ts
key_decisions:
  - When the planned artifact already exists, verify its contract against current local reality instead of recreating or replacing it.
duration: 
verification_result: mixed
completed_at: 2026-04-24T10:14:13.152Z
blocker_discovered: false
---

# T03: Verified the existing web-mode diagnostic and report contract test locks truthful artifact paths plus expected/actual browser evidence.

**Verified the existing web-mode diagnostic and report contract test locks truthful artifact paths plus expected/actual browser evidence.**

## What Happened

I began by querying project memory and reading the task plan, prior T01/T02 summaries, the parity runner surfaces, and the task-summary template. Local inspection showed that `src/tests/integration/web-mode-diagnostics-contract.test.ts` already exists, so I treated the task as an inspect-and-verify execution rather than creating a duplicate artifact. I read the full contract test and confirmed it covers the intended operator-facing proof surface: the web-mode secondary surface stays truthfully partial until its report lane exists, browser-phase evidence preserves assertion plus expected/actual details, lane summaries retain the web-mode artifact path, `renderParityDiagnostics()` prints actionable browser evidence and snippets, and `collectActionableLaneDiagnostics()` keeps passing web-mode evidence when phase detail exists. I then ran the task verification command directly against the current repository state. The suite passed all five checks, confirming that the web-mode report/diagnostic contract is already implemented and currently green. Because the required artifact and assertions were already present and passing, no repository files needed modification during this execution.

## Verification

Ran the task-plan verification command exactly as specified: `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/web-mode-diagnostics-contract.test.ts`. The test suite passed all 5 contract checks, proving the repository already locks the web-mode release-readable surface, preserves browser-facing expected/actual diagnostics, and keeps artifact-path reporting truthful for partial, failing, and evidence-bearing passing lanes. I also checked for editor diagnostics, but no language server was available for this file in the current environment.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/web-mode-diagnostics-contract.test.ts` | 0 | ✅ pass | 115ms |
| 2 | `lsp diagnostics src/tests/integration/web-mode-diagnostics-contract.test.ts` | 1 | ❌ fail | 20ms |

## Deviations

No code changes were required because the expected output file already existed and the contract it encodes already passed in local verification.

## Known Issues

None in the verified contract surface. LSP diagnostics were unavailable because no language server was running for this file, but the authoritative task verification command passed.

## Files Created/Modified

- `src/tests/integration/web-mode-diagnostics-contract.test.ts`

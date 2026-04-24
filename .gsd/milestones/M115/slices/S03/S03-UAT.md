# S03: S03 — UAT

**Milestone:** M115
**Written:** 2026-04-24T10:38:18.083Z

# S03 UAT — MCP parity proof

## Preconditions

1. Work from the repo root.
2. Use the deterministic fixture shipped in `tests/fixtures/mcp-parity-server/` and the tracked contract in `tests/fixtures/mcp-parity-manifest.json`.
3. Ensure Node can run strip-types tests with the repo’s existing command pattern.

## Test Case 1 — Fixture server proves deterministic MCP contract

1. Run:
   - `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/mcp-parity-fixture-contract.test.ts`
2. Expect the test run to pass.
3. Confirm the assertions cover:
   - server discovery over stdio
   - tool list containing `fixture_status`, `sum_numbers`, and `fixture_failure`
   - schema inspection for `sum_numbers` requiring `left` and `right`
   - successful invocation of `sum_numbers`
   - intentional failure attribution from `fixture_failure`
4. Expected outcome: the MCP parity fixture behaves deterministically without external servers or secrets.

## Test Case 2 — Shared parity runner emits release-readable MCP artifact

1. Run:
   - `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/mcp-parity-contract.test.ts && node --experimental-strip-types tests/parity/run.ts --format json`
2. Expect the integration contract to pass and the parity runner to finish successfully.
3. Inspect the JSON output and confirm:
   - a top-level `mcpParity` block exists
   - `mcpParity.parityStatus` is `passed`
   - `mcpParity.releaseReadableStatus` is `covered`
   - `mcpParity.parityArtifactPath` is `tests/parity/artifacts/mcp-parity.json`
   - `mcpParity.recordingPath` is `tests/fixtures/recordings/mcp-parity.json`
4. Expected outcome: downstream release/report tooling can consume MCP-specific proof without rerunning interactive MCP sessions.

## Test Case 3 — Operator-facing diagnostics stay actionable

1. Run:
   - `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/mcp-parity-diagnostics-contract.test.ts`
2. Expect the diagnostics contract suite to pass.
3. Then render the current report diagnostics:
   - `node --experimental-strip-types tests/parity/diagnostics.ts --report tests/parity/artifacts/baseline-report.json`
4. Confirm the rendered MCP section includes:
   - the MCP artifact path
   - the recording path
   - configured server name/transport/ready status
   - discovered tool names
   - schema-inspection details for `sum_numbers`
   - a successful-call line for `sum_numbers`
   - an invocation-failure line for `fixture_failure` with `tool-call` phase attribution
5. Expected outcome: if MCP parity regresses later, operators can tell whether the failure is startup, schema, or tool-invocation related.

## Edge Case 1 — Missing-server or schema-mismatch drift remains human-debuggable

1. Rely on the synthetic degraded variants exercised by `src/tests/integration/mcp-parity-diagnostics-contract.test.ts`.
2. Confirm the tests assert wording for:
   - missing configured server readiness
   - schema mismatch attribution
   - reporting drift on successful call details
   - reporting drift on failure attribution
3. Expected outcome: future regressions do not collapse to opaque stderr-only output.

## Edge Case 2 — Broader baseline may still be partial while MCP lane is complete

1. Review the output from `tests/parity/run.ts --format json`.
2. Note that other secondary surfaces may remain partial or failing in the overall baseline report.
3. Confirm that this does not invalidate S03 so long as the dedicated `mcpParity` block remains passed/covered and the S03 verification commands above are green.
4. Expected outcome: MCP parity is closed truthfully without pretending web/workflow/worktree parity is also complete.


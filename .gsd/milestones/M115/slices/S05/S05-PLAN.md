# S05: Integrated secondary-surface release gate

**Goal:** Assemble the secondary-surface proofs into one release-facing report/gate, close the remaining rebrand/worktree/session drift in the scoped band, and keep optional/provider-driven behavior explicitly non-blocking.
**Demo:** After this: one integrated parity command/report truthfully composes web mode, MCP, worktree/session/recovery, rebrand smoke checks, and the representative workflow proof into a release-facing secondary-surface parity gate.

## Must-Haves

- The integrated gate/report distinguishes required secondary-surface lanes from optional/live coverage, worktree/session/recovery and umb-brand smoke surfaces are truthfully verified, and failures preserve actionable diagnostics instead of ambiguous red summaries.

## Proof Level

- This slice proves: Passing release-style gate over the required secondary-surface lanes with stable report artifacts and skip semantics for optional coverage.

## Integration Closure

Release consumers can rely on a single report/gate for the secondary parity band without re-running every slice-level command manually.

## Verification

- Extends the parity report/release gate to compose web, MCP, workflow, worktree/session, and rebrand diagnostics into one release-facing artifact.

## Tasks

- [x] **T01: Define worktree/session and rebrand parity contracts** `est:1 day`
  Audit the current worktree/session/recovery and operator-facing rebrand surfaces that still matter for parity, then encode them into deterministic checks. Focus on create/resume/merge or equivalent current branchless flows plus help/package/runtime messaging that users actually see, ensuring the final release gate can treat them as explicit required or optional lanes rather than informal expectations.
  - Files: `src/resources/extensions/gsd/auto-worktree.ts`, `src/resources/extensions/gsd/auto-recovery.ts`, `src/help-text.ts`, `src/cli.ts`, `src/worktree-cli.ts`, `tests/fixtures/worktree-session-parity-manifest.json`, `src/tests/integration/worktree-session-parity-contract.test.ts`, `src/tests/integration/rebrand-surface-contract.test.ts`
  - Verify: node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/worktree-session-parity-contract.test.ts src/tests/integration/rebrand-surface-contract.test.ts

- [x] **T02: Implement integrated secondary-surface release gate** `est:1-1.5 days`
  Extend the parity runner and release-gate plumbing so the M115 report composes web, MCP, workflow, worktree/session, and rebrand lanes into one secondary-surface verdict. Required lanes must drive the verdict; optional/live/provider-driven lanes must remain explicit but non-blocking. Preserve artifact paths, failed surfaces/phases, and operator-facing diagnostics in both text and JSON output.
  - Files: `tests/parity/secondary-lanes.ts`, `tests/parity/run.ts`, `tests/parity/diagnostics.ts`, `tests/parity/secondary-release-gate.ts`, `src/tests/integration/secondary-release-gate-contract.test.ts`
  - Verify: node --experimental-strip-types tests/parity/secondary-release-gate.ts --format text && node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/secondary-release-gate-contract.test.ts

- [ ] **T03: Publish secondary-surface UAT and diagnostics contract** `est:0.5 day`
  Add a human-readable UAT/reporting path for the secondary-surface parity band and confirm the final diagnostics stay truthful under pass/partial/fail outcomes. The output should help an operator understand what is proven now, what remains optional, and where to look when a lane breaks.
  - Files: `tests/parity/diagnostics.ts`, `tests/parity/human-uat-secondary.md`, `src/tests/integration/secondary-parity-diagnostics-contract.test.ts`
  - Verify: node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/secondary-parity-diagnostics-contract.test.ts

## Files Likely Touched

- src/resources/extensions/gsd/auto-worktree.ts
- src/resources/extensions/gsd/auto-recovery.ts
- src/help-text.ts
- src/cli.ts
- src/worktree-cli.ts
- tests/fixtures/worktree-session-parity-manifest.json
- src/tests/integration/worktree-session-parity-contract.test.ts
- src/tests/integration/rebrand-surface-contract.test.ts
- tests/parity/secondary-lanes.ts
- tests/parity/run.ts
- tests/parity/diagnostics.ts
- tests/parity/secondary-release-gate.ts
- src/tests/integration/secondary-release-gate-contract.test.ts
- tests/parity/human-uat-secondary.md
- src/tests/integration/secondary-parity-diagnostics-contract.test.ts

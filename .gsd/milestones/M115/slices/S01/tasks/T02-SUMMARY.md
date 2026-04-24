---
id: T02
parent: S01
milestone: M115
key_files:
  - tests/parity/secondary-lanes.ts
  - tests/fixtures/secondary-parity-manifest.json
  - src/tests/integration/secondary-parity-manifest.test.ts
key_decisions:
  - Represent the secondary parity matrix as a typed lane-definition module plus a tracked JSON manifest artifact so downstream slices consume one stable source of truth.
  - Keep every scoped secondary surface marked partial unless it still shows both existing deterministic evidence and an explicitly missing planned proof lane or planned deterministic fixture; do not over-claim closure from scattered current tests.
duration: 
verification_result: mixed
completed_at: 2026-04-24T09:49:30.196Z
blocker_discovered: false
---

# T02: Added a secondary parity manifest, typed lane definitions, and contract tests that lock deterministic fixture/report scope for web, MCP, workflow/BMAD, and worktree-session parity surfaces.

**Added a secondary parity manifest, typed lane definitions, and contract tests that lock deterministic fixture/report scope for web, MCP, workflow/BMAD, and worktree-session parity surfaces.**

## What Happened

I turned the T01 audit into a tracked parity contract by adding `tests/parity/secondary-lanes.ts` as the TypeScript source of truth for the secondary parity matrix. That module defines the secondary proof classes, required vs optional lane metadata, deterministic fixture references, per-surface scope contracts, summary derivation, JSON loading, and validation rules for the new machine-readable manifest. I then rendered the matching tracked artifact to `tests/fixtures/secondary-parity-manifest.json`, keeping the repo’s existing pattern of TypeScript source plus checked-in JSON artifact so downstream slices can consume a stable release-readable shape instead of editing report JSON ad hoc. Finally, I added `src/tests/integration/secondary-parity-manifest.test.ts` to lock artifact/source identity, the four planned surfaces, lane counts, proof-class taxonomy, required/optional lane wiring, present-vs-planned deterministic fixture paths, and the uncovered-surface semantics that keep all four surfaces truthfully marked `partial` until a required planned proof lane or planned fixture is retired. During verification, the first pass failed because my negative test case reached the summary checksum before the semantic guard; I adjusted the test to preserve derived summary values and then strengthened the invalid case to remove both the planned fixture and planned required lane for one surface, which reflects the real invariant the validator is meant to enforce. I did not replan or expand into report-runner wiring here because T03 owns that downstream integration; this task’s deliverable is the stable manifest/lane contract surface that T03 and later proof slices can extend without redefining scope.

## Verification

Ran the exact task verification command with Node’s test runner against both the pre-existing inventory contract test and the new secondary parity manifest contract test. The first run surfaced one targeted failing assertion in the new manifest test: the mutated negative case changed fixture counts without updating the derived summary, so validation correctly failed on the summary checksum before reaching the intended semantic invariant. I corrected only that test case, reran the same verification command, and confirmed all ten tests passed. The final green run verifies that the new manifest artifact matches the TypeScript source contract, that lane/fixture counts and surface IDs remain fixed, that required existing-proof lanes and planned proof/report gaps stay explicit per surface, and that validator error paths cover missing present fixtures, unknown lane references, and invalid partial-surface semantics.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/secondary-surface-inventory-contract.test.ts src/tests/integration/secondary-parity-manifest.test.ts` | 1 | ❌ fail | 155ms |
| 2 | `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/secondary-surface-inventory-contract.test.ts src/tests/integration/secondary-parity-manifest.test.ts` | 0 | ✅ pass | 146ms |

## Deviations

None.

## Known Issues

The secondary parity manifest is intentionally a contract/planning surface, not an executed release report. The planned release-readable report rows and representative recordings referenced in the manifest do not exist yet; T03 and later downstream proof slices still need to wire those outputs and retire the currently planned gaps.

## Files Created/Modified

- `tests/parity/secondary-lanes.ts`
- `tests/fixtures/secondary-parity-manifest.json`
- `src/tests/integration/secondary-parity-manifest.test.ts`

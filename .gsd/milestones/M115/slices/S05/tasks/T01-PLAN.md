---
estimated_steps: 1
estimated_files: 8
skills_used: []
---

# T01: Define worktree/session and rebrand parity contracts

Audit the current worktree/session/recovery and operator-facing rebrand surfaces that still matter for parity, then encode them into deterministic checks. Focus on create/resume/merge or equivalent current branchless flows plus help/package/runtime messaging that users actually see, ensuring the final release gate can treat them as explicit required or optional lanes rather than informal expectations.

## Inputs

- `M113 branchless worktree architecture outputs`
- `M115 S01 rebrand drift audit`
- `existing worktree/session integration tests`

## Expected Output

- `tests/fixtures/worktree-session-parity-manifest.json`
- `src/tests/integration/worktree-session-parity-contract.test.ts`
- `src/tests/integration/rebrand-surface-contract.test.ts`

## Verification

node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/worktree-session-parity-contract.test.ts src/tests/integration/rebrand-surface-contract.test.ts

## Observability Impact

Creates deterministic contracts for the remaining operator-visible worktree/session and rebrand surfaces.

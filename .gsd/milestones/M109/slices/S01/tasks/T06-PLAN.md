---
estimated_steps: 6
estimated_files: 4
skills_used: []
---

# T06: Build and run full test suite to verify zero regressions

Run the full verification chain:
1. tsc --noEmit — ensure zero type errors
2. Run the upstream GSD test suite (node:test runner)
3. Verify umb binary starts: ./bin/umb --version or equivalent
4. Final grep sweep: grep -rn 'SLICE_BRANCH_RE\|parseSliceBranch' src/resources/extensions/gsd/ --include='*.ts' should return zero results
5. Verify QUICK_BRANCH_RE and WORKFLOW_BRANCH_RE still exist and are importable

## Inputs

- `All modified files from T01-T05`

## Expected Output

- `tsc --noEmit: zero errors`
- `GSD test suite: all pass`
- `umb binary: starts without error`
- `grep sweep: zero SLICE_BRANCH_RE/parseSliceBranch results`

## Verification

tsc --noEmit && npm test (GSD suite) && grep -rn 'SLICE_BRANCH_RE\|parseSliceBranch' src/resources/extensions/gsd/ --include='*.ts' | wc -l # expect 0

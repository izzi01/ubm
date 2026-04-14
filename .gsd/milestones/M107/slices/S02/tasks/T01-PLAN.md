---
estimated_steps: 1
estimated_files: 10
skills_used: []
---

# T01: Run full test suite and categorize all failures against merge diff

Execute the complete test suite against the fork and categorize every failure as either a merge regression or pre-existing/environment-specific.

## Inputs

- ``src/resources/extensions/gsd/auto-model-selection.ts``
- ``src/resources/extensions/gsd/tests/auto-model-selection.test.ts``
- ``src/resources/extensions/gsd/tests/flat-rate-routing-guard.test.ts``
- ``src/logo.ts``
- ``src/help-text.ts``
- ``package.json``

## Expected Output

- ``.gsd/milestones/M107/slices/S02/tasks/T01-PLAN.md``
- ``.gsd/milestones/M107/slices/S02/S02-PLAN.md``

## Verification

cd /home/cid/projects-personal/umb && npm run test:unit 2>&1 | tail -5; npm run test:smoke 2>&1 | tail -5; npx tsc --noEmit 2>&1 | tail -3; grep -q 'UMB_LOGO' src/logo.ts && echo 'BRAND:OK' || echo 'BRAND:FAIL'; grep -q 'umb config' src/help-text.ts && echo 'HELP:OK' || echo 'HELP:FAIL'; grep -q 'umb-cli' package.json && echo 'PKG:OK' || echo 'PKG:FAIL'

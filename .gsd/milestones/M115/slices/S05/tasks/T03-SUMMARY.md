---
id: T03
parent: S05
milestone: M115
key_files:
  - tests/parity/diagnostics.ts
  - tests/parity/human-uat-secondary.md
  - src/tests/integration/secondary-parity-diagnostics-contract.test.ts
key_decisions:
  - Extended the shared parity diagnostics script with a secondary surface selector instead of creating a separate secondary-only diagnostics tool.
  - Locked the new human-readable UAT guide to exact tracked commands, artifact paths, and pass/partial/fail interpretation with an integration contract test.
duration: 
verification_result: passed
completed_at: 2026-04-24T11:22:28.054Z
blocker_discovered: false
---

# T03: Added a human-readable secondary-surface parity UAT guide and a shared secondary diagnostics contract over the integrated release artifact.

**Added a human-readable secondary-surface parity UAT guide and a shared secondary diagnostics contract over the integrated release artifact.**

## What Happened

Implemented the T03 reporting path by extending `tests/parity/diagnostics.ts` with a surface selector and a secondary-mode renderer that reads the tracked `tests/parity/artifacts/secondary-release-report.json` artifact instead of introducing a separate diagnostics script. The new renderer preserves release-facing required-lane state, optional/planned proof visibility, live/provider skip semantics, artifact pointers, and failed surface/phase attribution in one human-auditable text view. Added `tests/parity/human-uat-secondary.md` as the operator-facing guide for the secondary parity band, explicitly documenting the tracked commands, artifact inspection order, and truthful pass/partial/fail interpretation. Added `src/tests/integration/secondary-parity-diagnostics-contract.test.ts` to lock the diagnostics output and guide content against tracked artifact paths, exact commands, and actionable failure semantics. Verified that the new diagnostics layer passes its task-scoped contract test and that the existing integrated secondary release-gate contract remains green.

## Verification

Ran the task verification command from the plan and it passed. Then exercised the real secondary diagnostics CLI against the tracked `secondary-release-report.json` artifact to confirm the human-readable output preserves required, optional, and live semantics. Finally reran the existing secondary release-gate CLI and its integration contract to confirm the reporting extension did not regress the established gate behavior.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/secondary-parity-diagnostics-contract.test.ts` | 0 | ✅ pass | 421ms |
| 2 | `node --experimental-strip-types tests/parity/diagnostics.ts --surface secondary --report tests/parity/artifacts/secondary-release-report.json` | 0 | ✅ pass | 100ms |
| 3 | `node --experimental-strip-types tests/parity/secondary-release-gate.ts --report tests/parity/artifacts/baseline-report.json --format text` | 0 | ✅ pass | 102ms |
| 4 | `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/secondary-release-gate-contract.test.ts` | 0 | ✅ pass | 427ms |

## Deviations

Minor local adaptation: although the task plan listed `tests/parity/diagnostics.ts` as a touched file without specifying a new entrypoint shape, the existing file only rendered baseline diagnostics. I extended the shared diagnostics CLI with `--surface secondary` instead of creating a new parallel diagnostics script so the operator-facing reporting path stays consolidated.

## Known Issues

None.

## Files Created/Modified

- `tests/parity/diagnostics.ts`
- `tests/parity/human-uat-secondary.md`
- `src/tests/integration/secondary-parity-diagnostics-contract.test.ts`

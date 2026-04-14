# M111: Fix umb pattern test compilation - add vitest, fix imports and types

## Vision
The 11 test files in src/resources/extensions/umb/patterns/__tests__/ use vitest APIs but fail typecheck:extensions because: (1) no vitest dependency, (2) relative imports missing .js extensions, (3) implicit any on some parameters. Fix all three issues so `npm test` (which runs typecheck:extensions as pretest) passes cleanly. No functional changes — pure test infrastructure fix.

## Slice Overview
| ID | Slice | Risk | Depends | Done | After this |
|----|-------|------|---------|------|------------|
| S01 | S01 | low | — | ✅ | npm run typecheck:extensions exits with zero errors for all 11 umb pattern test files |

---
id: S03
parent: M101
milestone: M101
provides:
  - (none)
requires:
  []
affects:
  []
key_files:
  - ["src/import/types.ts", "src/import/prd-parser.ts", "src/import/gsd-import.ts", "src/import/requirements-renderer.ts", "tests/import/prd-parser.test.ts", "tests/import/gsd-import.test.ts", "src/extension/index.ts", "src/commands/index.ts"]
key_decisions:
  - ["Colon inside bold markers in BMAD PRD format (**FR1:** not **FR1**:) — regex matches this specifically", "Section detection checks 'non-functional' before 'functional' to avoid false substring match", "NFR parenthetical names stripped from ID since class + description carry that info", "REQUIREMENTS.md rendered as full table regeneration (not incremental) after every import", "Deduplication by ID via requirementGet() check before insert"]
patterns_established:
  - ["CommandHandler factory pattern: createImportHandler(engine) mirrors createGsdCommandHandlers(engine)", "Pure function parser + integration test pattern: parsePrd() tested in isolation, then integration test wires DB"]
observability_surfaces:
  - none
drill_down_paths:
  []
duration: ""
verification_result: passed
completed_at: 2026-04-10T22:13:12.154Z
blocker_discovered: false
---

# S03: PRD Import Bridge

**parsePrd() extracts 22 requirements from BMAD PRD markdown, /gsd import inserts them into the GSD database with dedup, and REQUIREMENTS.md is auto-rendered.**

## What Happened

T01 built a line-by-line markdown parser (parsePrd()) that extracts functional and non-functional requirements from BMAD PRD files. The parser tracks section state (functional/non-functional), matches requirement entries via regex, strips markdown bold markers, and handles NFR parenthetical names. Verified against the real PRD: all 22 requirements (FR1–FR16, NFR1–NFR6) correctly extracted. 12 unit tests cover happy path, edge cases, and format variations.

T02 wired the /gsd import <file-path> slash command that reads a PRD file, parses requirements, deduplicates against existing DB entries by ID, inserts new ones with status="active", renders REQUIREMENTS.md as a markdown table, and reports a summary via ctx.ui.notify() and ctx.ui.setWidget(). Built renderRequirementsMarkdown() as a pure function. Registered the command in the extension entry point. 9 integration tests cover happy path, deduplication, error handling, and renderer edge cases.

## Verification

npx vitest run tests/import/ — 21/21 tests passed (12 parser + 9 import) in 235ms. npx tsc --noEmit — no new TS errors. Real PRD smoke test: all 22 requirements extracted correctly.

## Requirements Advanced

None.

## Requirements Validated

None.

## New Requirements Surfaced

None.

## Requirements Invalidated or Re-scoped

None.

## Deviations

None.

## Known Limitations

None.

## Follow-ups

None.

## Files Created/Modified

None.

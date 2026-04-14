---
estimated_steps: 12
estimated_files: 2
skills_used: []
---

# T01: Build PRD markdown parser and tests

Create a pure function `parsePrd(content: string)` that extracts functional and non-functional requirements from BMAD PRD markdown. The parser targets the specific format in `_bmad-output/planning-artifacts/prd.md`:

1. **FR entries** live under `## Functional Requirements` → `### <category>` subsections, formatted as `* **FR1:** description text`
2. **NFR entries** live under `## Non-Functional Requirements` → `### <category>` subsections, formatted as `* **NFR1 (name):** description text`

The parser should:
- Return `ParsedRequirement[]` where each item has `{ id, class, description, source }`
- Class is `"functional"` for FR* entries, `"non-functional"` for NFR* entries
- Source is the PRD file path (passed as parameter)
- Strip markdown bold markers from descriptions
- Handle the NFR parenthetical name pattern: `NFR1 (Fault Tolerance)` → id=`NFR1`
- Be resilient to minor format variations (extra spaces, trailing periods)
- Return an empty array for PRDs with no requirement sections

Write thorough unit tests covering: happy path with FR+NFR extraction, NFR with parenthetical names, PRD with no requirements sections, malformed lines (skipped gracefully), multiple categories under one section, and empty input.

## Inputs

- `_bmad-output/planning-artifacts/prd.md`

## Expected Output

- `src/import/prd-parser.ts`
- `src/import/types.ts`
- `tests/import/prd-parser.test.ts`

## Verification

npx vitest run tests/import/prd-parser.test.ts

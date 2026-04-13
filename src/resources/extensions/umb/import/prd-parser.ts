import type { ParsedRequirement } from "./types.js";

/**
 * Parse a BMAD PRD markdown document and extract functional and non-functional requirements.
 *
 * Targets the BMAD PRD format:
 * - FR entries under `## Functional Requirements` → `### <category>` subsections,
 *   formatted as `* **FR1:** description text`
 * - NFR entries under `## Non-Functional Requirements` → `### <category>` subsections,
 *   formatted as `* **NFR1 (name):** description text`
 *
 * Returns an empty array if no requirement sections are found.
 *
 * @param content - Full text of the PRD markdown file
 * @param source  - File path of the PRD (included in each extracted requirement)
 */
export function parsePrd(content: string, source: string): ParsedRequirement[] {
  const lines = content.split("\n");
  const requirements: ParsedRequirement[] = [];

  let currentClass: "functional" | "non-functional" | null = null;

  // Regex matches: `* **FR1:** description` or `* **NFR1 (name):** description`
  // Note: the colon is INSIDE the bold markers in BMAD PRD format: **FR1:**
  const reqRe = /^\*\s+\*\*((?:FR|NFR)\d+(?:\s+\([^)]+\))?:)\*\*\s+(.*)/;

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    // Detect ## section headers (but not ### subsections)
    if (line.startsWith("## ") && !line.startsWith("### ")) {
      const header = line.slice(3).trim().toLowerCase();

      // Check "non-functional" BEFORE "functional" since the former contains the latter
      if (header.includes("non-functional requirements")) {
        currentClass = "non-functional";
      } else if (
        header.includes("functional requirements") &&
        !header.includes("non-functional")
      ) {
        currentClass = "functional";
      } else {
        // Left the requirements section (or entered Domain/Technical/etc.)
        currentClass = null;
      }
      continue;
    }

    // Skip if we're not inside a requirements section
    if (currentClass === null) continue;

    const match = line.match(reqRe);
    if (!match) continue;

    const rawId = match[1]; // e.g. "FR1:" or "NFR1 (Fault Tolerance):"
    const rawDescription = match[2].trim();

    // Strip trailing colon and parenthetical name from the ID
    // "FR1:" → "FR1", "NFR1 (Fault Tolerance):" → "NFR1"
    const id = rawId
      .replace(/:$/, "")
      .replace(/\s+\([^)]+\)/, "")
      .trim();

    // Strip markdown bold markers and collapse whitespace in description
    const description = rawDescription
      .replace(/\*\*/g, "")
      .replace(/\s+/g, " ")
      .trim();

    if (!description) continue;

    requirements.push({ id, class: currentClass, description, source });
  }

  return requirements;
}

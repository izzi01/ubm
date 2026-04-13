/**
 * Parsed requirement extracted from a BMAD PRD markdown file.
 */
export interface ParsedRequirement {
  /** Requirement identifier, e.g. "FR1", "NFR3" */
  id: string;
  /** "functional" for FR entries, "non-functional" for NFR entries */
  class: "functional" | "non-functional";
  /** Human-readable description with markdown bold markers stripped */
  description: string;
  /** File path of the source PRD document */
  source: string;
}

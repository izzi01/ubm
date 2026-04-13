/**
 * /gsd import command — Import BMAD PRD requirements into GSD database.
 *
 * Flow:
 * 1. Read the PRD file from disk
 * 2. Parse with parsePrd() to extract requirements
 * 3. Deduplicate against existing DB requirements by ID
 * 4. Insert new requirements
 * 5. Render REQUIREMENTS.md
 * 6. Show summary via ctx.ui.notify() and ctx.ui.setWidget()
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { ExtensionCommandContext } from "@gsd/pi-coding-agent";
import type { GsdEngine } from "../state-machine/index.js";
import { parsePrd } from "./prd-parser.js";
import { renderRequirementsMarkdown } from "./requirements-renderer.js";

// ─── Types ─────────────────────────────────────────────────────────────────

export type CommandHandler = (
  args: string,
  ctx: ExtensionCommandContext,
) => Promise<void>;

// ─── Handler factory ───────────────────────────────────────────────────────

/**
 * Create the /gsd import handler bound to a GsdEngine.
 */
export function createImportHandler(engine: GsdEngine) {
  /**
   * /gsd import <file-path>
   *
   * Parses a BMAD PRD markdown file and imports its functional/non-functional
   * requirements into the GSD database, then renders REQUIREMENTS.md.
   */
  async function handleGsdImport(
    args: string,
    ctx: ExtensionCommandContext,
  ): Promise<void> {
    const filePath = args.trim();

    if (!filePath) {
      ctx.ui.notify("Usage: /gsd import <file-path>", "error");
      ctx.ui.setWidget("gsd-import", [
        "⚠️ /gsd import requires a file path.",
        "",
        "Usage: /gsd import _bmad-output/planning-artifacts/prd.md",
      ]);
      return;
    }

    // Resolve path relative to cwd or use absolute
    const resolvedPath = path.resolve(process.cwd(), filePath);

    // Validate file exists
    if (!fs.existsSync(resolvedPath)) {
      ctx.ui.notify(`File not found: ${filePath}`, "error");
      ctx.ui.setWidget("gsd-import", [
        `❌ File not found: ${filePath}`,
        "",
        `Resolved to: ${resolvedPath}`,
      ]);
      return;
    }

    // Read file content
    let content: string;
    try {
      content = fs.readFileSync(resolvedPath, "utf-8");
    } catch {
      ctx.ui.notify(`Cannot read file: ${filePath}`, "error");
      ctx.ui.setWidget("gsd-import", [
        `❌ Cannot read file: ${filePath}`,
      ]);
      return;
    }

    // Parse requirements
    const parsed = parsePrd(content, filePath);

    if (parsed.length === 0) {
      ctx.ui.notify("No requirements found in the PRD file.", "warning");
      ctx.ui.setWidget("gsd-import", [
        `⚠️ No requirements found in: ${filePath}`,
      ]);
      return;
    }

    // Deduplicate: check which IDs already exist in DB
    let inserted = 0;
    let skipped = 0;

    for (const req of parsed) {
      const existing = engine.db.requirementGet(req.id);
      if (existing) {
        skipped++;
        continue;
      }

      engine.db.requirementInsert({
        id: req.id,
        class: req.class,
        description: req.description,
        why: "",
        source: req.source,
        status: "active",
        validation: null,
        notes: null,
        primaryOwner: null,
        supportingSlices: null,
      });
      inserted++;
    }

    // Render REQUIREMENTS.md
    const allRequirements = engine.db.requirementGetAll();
    const markdown = renderRequirementsMarkdown(allRequirements);
    const requirementsPath = path.join(process.cwd(), ".gsd", "REQUIREMENTS.md");

    // Ensure .gsd directory exists
    const gsdDir = path.dirname(requirementsPath);
    if (!fs.existsSync(gsdDir)) {
      fs.mkdirSync(gsdDir, { recursive: true });
    }
    fs.writeFileSync(requirementsPath, markdown, "utf-8");

    // Summary
    const summaryLines = [
      `📥 Import Complete`,
      "",
      `File: ${filePath}`,
      `Found: ${parsed.length} requirement(s)`,
      `Inserted: ${inserted}`,
      `Skipped (already exists): ${skipped}`,
      `Total in DB: ${allRequirements.length}`,
      "",
      `Rendered: .gsd/REQUIREMENTS.md`,
    ];

    ctx.ui.notify(
      `Imported ${inserted} requirement(s), skipped ${skipped}. Total: ${allRequirements.length}`,
      "info",
    );
    ctx.ui.setWidget("gsd-import", summaryLines);
  }

  return { handleGsdImport };
}

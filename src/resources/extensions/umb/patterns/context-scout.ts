/**
 * ContextScout — Pattern and agent indexer.
 *
 * Scans `src/patterns/` for TypeScript pattern files and `_bmad/` for BMAD
 * agent definitions, producing a PatternIndex the LLM can query at runtime.
 *
 * Uses synchronous file I/O (consistent with better-sqlite3 pattern).
 * Extracts metadata via simple regex — no AST parsing required.
 */

import * as fs from "fs";
import * as path from "path";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface PatternEntry {
  name: string;
  path: string;
  type: "pattern";
  description?: string;
  exports?: string[];
}

export interface AgentEntry {
  name: string;
  title: string;
  icon?: string;
  module?: string;
  path: string;
  type: "agent";
  description?: string;
}

export interface PatternIndex {
  patterns: PatternEntry[];
  agents: AgentEntry[];
  scannedAt: string;
}

// ─── Scanning helpers ──────────────────────────────────────────────────────

/**
 * Extract JSDoc description and @module tag from the first comment block.
 * Also finds exported class/function names.
 */
function extractTsMetadata(filePath: string, content: string): {
  description?: string;
  exports?: string[];
} {
  // Extract first JSDoc block
  const jsdocMatch = content.match(/\/\*\*[\s\S]*?\*\//);
  let description: string | undefined;
  if (jsdocMatch) {
    const block = jsdocMatch[0];
    // Remove leading * on each line
    const cleaned = block
      .replace(/^\/\*\*/, "")
      .replace(/\*\/$/, "")
      .split("\n")
      .map((l) => l.replace(/^\s*\*\s?/, ""))
      .join("\n")
      .trim();

    // Try to get @module tag
    const moduleMatch = cleaned.match(/@module\s+(.+)/);
    if (moduleMatch) {
      description = moduleMatch[1].trim();
    } else {
      // Use first non-empty line as description
      const firstLine = cleaned.split("\n")[0];
      if (firstLine && !firstLine.startsWith("@")) {
        description = firstLine;
      }
    }
  }

  // Extract exported names
  const exportNames: string[] = [];
  const exportRegex = /^export\s+(?:class|function|const|enum|interface|type|default)\s+(\w+)/gm;
  let m: RegExpExecArray | null;
  while ((m = exportRegex.exec(content)) !== null) {
    exportNames.push(m[1]);
  }

  return {
    description,
    exports: exportNames.length > 0 ? exportNames : undefined,
  };
}

/**
 * Extract YAML frontmatter fields from a Markdown file.
 */
function extractYamlFrontmatter(content: string): Record<string, string> {
  const frontmatter: Record<string, string> = {};

  if (!content.startsWith("---")) return frontmatter;

  const endIndex = content.indexOf("---", 3);
  if (endIndex === -1) return frontmatter;

  const yaml = content.substring(3, endIndex).trim();
  for (const line of yaml.split("\n")) {
    const match = line.match(/^(\w[\w-]*):\s*"([^"]*)"\s*$/);
    if (match) {
      frontmatter[match[1]] = match[2];
    } else {
      const unquoted = line.match(/^(\w[\w-]*):\s*(.+)$/);
      if (unquoted) {
        frontmatter[unquoted[1]] = unquoted[2].trim();
      }
    }
  }

  return frontmatter;
}

// ─── Directory scanners ────────────────────────────────────────────────────

/**
 * Scan src/patterns/ for TypeScript pattern files.
 * Skips __tests__/ directories and non-.ts files.
 */
function scanPatternDir(baseDir: string): PatternEntry[] {
  const patternsDir = path.join(baseDir, "src", "patterns");
  const entries: PatternEntry[] = [];

  if (!fs.existsSync(patternsDir)) {
    console.warn(`[ContextScout] Patterns directory not found: ${patternsDir}`);
    return entries;
  }

  walkDir(patternsDir, (filePath, relPath) => {
    if (!filePath.endsWith(".ts")) return;
    // Skip test directories
    if (relPath.includes("__tests__")) return;

    try {
      const content = fs.readFileSync(filePath, "utf-8");
      const meta = extractTsMetadata(filePath, content);
      const name = path.basename(filePath, ".ts");

      entries.push({
        name,
        path: relPath,
        type: "pattern",
        description: meta.description,
        exports: meta.exports,
      });
    } catch (err) {
      console.warn(`[ContextScout] Failed to read ${filePath}: ${(err as Error).message}`);
    }
  });

  return entries;
}

/**
 * Scan _bmad/ recursively for agent definition files (Markdown with YAML frontmatter).
 */
function scanAgentDir(baseDir: string): AgentEntry[] {
  const bmadDir = path.join(baseDir, "_bmad");
  const entries: AgentEntry[] = [];

  if (!fs.existsSync(bmadDir)) {
    console.warn(`[ContextScout] BMAD directory not found: ${bmadDir}`);
    return entries;
  }

  walkDir(bmadDir, (filePath, relPath) => {
    if (!filePath.endsWith(".md") && !filePath.endsWith(".yaml") && !filePath.endsWith(".yml")) return;
    // Only scan agent definition files (in agents/ directories)
    if (!relPath.includes("agents")) return;

    try {
      const content = fs.readFileSync(filePath, "utf-8");
      const frontmatter = extractYamlFrontmatter(content);

      if (frontmatter.name) {
        entries.push({
          name: frontmatter.name,
          title: frontmatter.title || frontmatter.description || frontmatter.name,
          icon: frontmatter.icon || undefined,
          module: frontmatter.module || extractModuleFromPath(relPath),
          path: relPath,
          type: "agent",
          description: frontmatter.description || undefined,
        });
      }
    } catch (err) {
      console.warn(`[ContextScout] Failed to read ${filePath}: ${(err as Error).message}`);
    }
  });

  return entries;
}

// ─── Utilities ─────────────────────────────────────────────────────────────

/**
 * Walk a directory recursively, calling visitor for each file.
 * relPath is always relative to the original `dir` argument.
 */
function walkDir(
  dir: string,
  visitor: (filePath: string, relPath: string) => void,
): void {
  function recurse(currentDir: string): void {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        recurse(fullPath);
      } else if (entry.isFile()) {
        visitor(fullPath, path.relative(dir, fullPath));
      }
    }
  }

  recurse(dir);
}

/**
 * Extract module name from path like "bmm/agents/pm.md" → "bmm".
 */
function extractModuleFromPath(relPath: string): string | undefined {
  const parts = relPath.split(path.sep);
  // Look for known module prefixes
  if (parts[0] === "_config") return undefined;
  for (const part of parts) {
    if (["bmm", "cis", "bmb", "core"].includes(part)) {
      return part;
    }
  }
  return undefined;
}

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Scan both src/patterns/ and _bmad/ directories for patterns and agents.
 *
 * @param cwd - Project root directory
 * @returns PatternIndex with discovered patterns and agents
 */
export function scanPatterns(cwd: string): PatternIndex {
  const patterns = scanPatternDir(cwd);
  const agents = scanAgentDir(cwd);

  return {
    patterns,
    agents,
    scannedAt: new Date().toISOString(),
  };
}

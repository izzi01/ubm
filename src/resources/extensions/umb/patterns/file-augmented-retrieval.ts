/**
 * File-Augmented Retrieval (FAR) Pattern Implementation
 *
 * Augments files with metadata AT WRITE TIME rather than at query time.
 * Pre-processes and embeds context directly into files at creation/update,
 * achieving zero retrieval overhead at inference.
 *
 * FAR vs RAG:
 *   RAG: query → retrieve → augment → respond  (latency at inference)
 *   FAR: write → augment → store → query → respond  (zero latency at inference)
 *
 * @module FileAugmentedRetrieval
 */

/**
 * Strategy for augmenting file content
 */
export type AugmentationStrategy = 'summary' | 'keywords' | 'full';

/**
 * Configuration for the FAR pipeline
 */
export interface FARConfig {
  /** Strategy for augmentation: summary-only, keywords-only, or full metadata */
  augmentationStrategy: AugmentationStrategy;
  /** Maximum token budget for generated summaries */
  maxSummaryTokens: number;
}

/**
 * Extracted metadata attached to a file at write time
 */
export interface FileAugmentation {
  /** One-paragraph summary of file content */
  summary: string;
  /** Significant keywords extracted from content */
  keywords: string[];
  /** High-level concepts identified in the content */
  concepts: string[];
  /** File paths or module names referenced as dependencies */
  dependencies: string[];
}

/**
 * A file with its pre-computed augmentation metadata
 */
export interface AugmentedFile {
  /** File path relative to project root */
  path: string;
  /** Original unmodified file content */
  originalContent: string;
  /** Pre-computed metadata augmentation */
  augmentation: FileAugmentation;
  /** Timestamp when augmentation was generated */
  augmentedAt: Date;
}

/**
 * Common English stopwords to exclude from keyword extraction
 */
const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
  'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
  'could', 'should', 'may', 'might', 'shall', 'can', 'need', 'must',
  'it', 'its', 'this', 'that', 'these', 'those', 'not', 'no', 'nor',
  'if', 'then', 'else', 'when', 'while', 'as', 'so', 'than', 'too',
  'very', 'just', 'about', 'above', 'after', 'again', 'all', 'also',
  'any', 'because', 'before', 'between', 'both', 'each', 'few', 'get',
  'got', 'here', 'how', 'into', 'more', 'most', 'new', 'now', 'only',
  'other', 'our', 'out', 'over', 'own', 'same', 'some', 'such', 'there',
  'through', 'under', 'up', 'use', 'used', 'using', 'what', 'which',
  'who', 'why', 'you', 'your', 'we', 'they', 'them', 'their', 'he',
  'she', 'him', 'her', 'me', 'my', 'i'
]);

/**
 * Patterns for detecting import/dependency references
 */
const DEPENDENCY_PATTERNS: RegExp[] = [
  /(?:import|require)\s*\(?['"]([^'"]+)['"]\)?/g,
  /from\s+['"]([^'"]+)['"]/g,
  /(?:include|load)\s+['"]([^'"]+)['"]/g
];

/**
 * Patterns for detecting concept-level constructs
 */
const CONCEPT_PATTERNS: RegExp[] = [
  /(?:class|interface|type|enum)\s+([A-Z][a-zA-Z0-9]+)/g,
  /(?:function|const|let|var)\s+([a-zA-Z][a-zA-Z0-9]{3,})\s*[=(]/g,
  /(?:export\s+(?:default\s+)?(?:class|interface|function|const))\s+([a-zA-Z][a-zA-Z0-9]+)/g,
  /(?:pattern|strategy|module|service|manager|handler|controller|provider)\b/gi
];

/**
 * FileAugmentedRetrieval — Pre-process files with metadata at write time
 *
 * Provides:
 * - Single-file augmentation with keyword/summary extraction
 * - Bulk directory augmentation
 * - Query-time retrieval scored by keyword overlap
 * - Context rendering with metadata headers
 *
 * @example
 * ```typescript
 * const far = new FileAugmentedRetrieval({
 *   augmentationStrategy: 'full',
 *   maxSummaryTokens: 100
 * });
 *
 * const augmented = far.augmentFile('src/auth.ts', fileContent);
 * console.log(augmented.augmentation.keywords);
 * // ['authentication', 'token', 'session', 'middleware']
 *
 * const results = far.retrieve('auth middleware', augmentedFiles);
 * const context = far.toContext(results, 4000);
 * ```
 */
export class FileAugmentedRetrieval {
  private readonly config: FARConfig;

  constructor(config?: Partial<FARConfig>) {
    this.config = {
      augmentationStrategy: config?.augmentationStrategy ?? 'full',
      maxSummaryTokens: config?.maxSummaryTokens ?? 150
    };
  }

  /**
   * Augment a single file with extracted metadata
   *
   * Analyzes content to extract keywords, summary, concepts, and dependencies.
   * The augmentation is computed once at write time and attached to the file.
   *
   * @param path - File path relative to project root
   * @param content - Raw file content
   * @returns Augmented file with metadata
   *
   * @example
   * ```typescript
   * const augmented = far.augmentFile('src/utils/retry.ts', sourceCode);
   * console.log(augmented.augmentation.summary);
   * // "Exponential backoff retry utility with configurable max retries..."
   * ```
   */
  augmentFile(path: string, content: string): AugmentedFile {
    const keywords = this.extractKeywords(content);
    const summary = this.extractSummary(content);
    const concepts = this.extractConcepts(content);
    const dependencies = this.extractDependencies(content);

    const augmentation: FileAugmentation = {
      summary,
      keywords,
      concepts,
      dependencies
    };

    // Apply strategy filtering
    if (this.config.augmentationStrategy === 'summary') {
      augmentation.keywords = [];
      augmentation.concepts = [];
      augmentation.dependencies = [];
    } else if (this.config.augmentationStrategy === 'keywords') {
      augmentation.summary = '';
      augmentation.concepts = [];
      augmentation.dependencies = [];
    }

    return {
      path,
      originalContent: content,
      augmentation,
      augmentedAt: new Date()
    };
  }

  /**
   * Bulk-augment all files in a directory
   *
   * Processes each file through the augmentation pipeline and returns
   * a Map keyed by file path for efficient lookup.
   *
   * @param dirPath - Directory path (used as prefix for file keys)
   * @param files - Record mapping relative file names to content
   * @returns Map of path → AugmentedFile
   *
   * @example
   * ```typescript
   * const files = {
   *   'auth.ts': authSource,
   *   'db.ts': dbSource,
   *   'routes.ts': routesSource
   * };
   * const augmented = far.augmentDirectory('src/', files);
   * console.log(augmented.size); // 3
   * ```
   */
  augmentDirectory(
    dirPath: string,
    files: Record<string, string>
  ): Map<string, AugmentedFile> {
    const result = new Map<string, AugmentedFile>();
    const normalizedDir = dirPath.endsWith('/') ? dirPath : dirPath + '/';

    for (const [fileName, content] of Object.entries(files)) {
      const fullPath = normalizedDir + fileName;
      result.set(fullPath, this.augmentFile(fullPath, content));
    }

    return result;
  }

  /**
   * Retrieve augmented files matching a query, ranked by relevance
   *
   * Scores each file by keyword overlap with the query terms.
   * Returns files sorted by descending relevance score (files with
   * zero overlap are excluded).
   *
   * @param query - Natural language search query
   * @param files - Map of augmented files to search
   * @returns Sorted array of matching AugmentedFiles (most relevant first)
   *
   * @example
   * ```typescript
   * const results = far.retrieve('authentication middleware', augmentedFiles);
   * results.forEach(f => {
   *   console.log(`${f.path}: ${f.augmentation.keywords.join(', ')}`);
   * });
   * ```
   */
  retrieve(
    query: string,
    files: Map<string, AugmentedFile>
  ): AugmentedFile[] {
    const queryTerms = this.tokenize(query.toLowerCase());

    const scored: Array<{ file: AugmentedFile; score: number }> = [];

    for (const file of files.values()) {
      const score = this.scoreFile(file, queryTerms);
      if (score > 0) {
        scored.push({ file, score });
      }
    }

    // Sort descending by score
    scored.sort((a, b) => b.score - a.score);

    return scored.map(s => s.file);
  }

  /**
   * Render augmented files as a context string with metadata headers
   *
   * Formats each file with its augmentation metadata as a header block,
   * suitable for inclusion in an LLM context window. Respects an optional
   * token budget by truncating content when needed.
   *
   * @param files - Augmented files to render
   * @param maxTokens - Optional token budget (approximate, 1 token ≈ 4 chars)
   * @returns Formatted context string
   *
   * @example
   * ```typescript
   * const context = far.toContext(results, 8000);
   * // Output:
   * // === src/auth.ts ===
   * // Keywords: authentication, token, session
   * // Summary: Authentication middleware for Express...
   * // ---
   * // <file content>
   * ```
   */
  toContext(files: AugmentedFile[], maxTokens?: number): string {
    const maxChars = maxTokens ? maxTokens * 4 : Infinity;
    let totalChars = 0;
    const blocks: string[] = [];

    for (const file of files) {
      const header = this.formatFileHeader(file);
      const block = header + '\n' + file.originalContent + '\n';

      if (totalChars + block.length > maxChars) {
        // Fit as much of this block as possible
        const remaining = maxChars - totalChars;
        if (remaining > header.length + 100) {
          blocks.push(header + '\n' + file.originalContent.slice(0, remaining - header.length - 20) + '\n... [truncated]');
        }
        break;
      }

      blocks.push(block);
      totalChars += block.length;
    }

    return blocks.join('\n');
  }

  /**
   * Extract significant keywords from content via regex tokenization
   *
   * Splits content into words, filters stopwords, and returns
   * unique keywords sorted by frequency (most frequent first).
   *
   * @param content - Raw text content
   * @returns Array of significant keywords
   *
   * @private
   */
  private extractKeywords(content: string): string[] {
    const tokens = this.tokenize(content.toLowerCase());

    // Count frequency
    const freq = new Map<string, number>();
    for (const token of tokens) {
      if (!STOPWORDS.has(token) && token.length > 2) {
        freq.set(token, (freq.get(token) ?? 0) + 1);
      }
    }

    // Sort by frequency descending, take top 30
    return Array.from(freq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30)
      .map(([word]) => word);
  }

  /**
   * Extract a summary from the first meaningful paragraph of content
   *
   * Skips blank lines, import blocks, and comment delimiters to find
   * the first substantive paragraph. Truncates to maxSummaryTokens.
   *
   * @param content - Raw text content
   * @returns Summary string (first meaningful paragraph)
   *
   * @private
   */
  private extractSummary(content: string): string {
    const lines = content.split('\n');
    const paragraphLines: string[] = [];
    let inParagraph = false;

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip empty lines before paragraph starts
      if (!inParagraph && trimmed === '') continue;

      // Skip common non-content lines
      if (!inParagraph && (
        trimmed.startsWith('import ') ||
        trimmed.startsWith('require(') ||
        trimmed.startsWith('//') ||
        trimmed.startsWith('/*') ||
        trimmed.startsWith('*') ||
        trimmed.startsWith('#!') ||
        trimmed === '{'
      )) continue;

      // Found meaningful content
      if (!inParagraph && trimmed !== '') {
        inParagraph = true;
      }

      if (inParagraph) {
        if (trimmed === '') break; // End of paragraph
        paragraphLines.push(trimmed);
      }
    }

    const summary = paragraphLines.join(' ');
    const maxChars = this.config.maxSummaryTokens * 4;

    if (summary.length > maxChars) {
      return summary.slice(0, maxChars - 3) + '...';
    }

    return summary;
  }

  /**
   * Extract high-level concepts (class names, interfaces, patterns)
   *
   * @param content - Raw text content
   * @returns Array of concept names
   *
   * @private
   */
  private extractConcepts(content: string): string[] {
    const concepts = new Set<string>();

    for (const pattern of CONCEPT_PATTERNS) {
      // Reset lastIndex for global regex reuse
      const regex = new RegExp(pattern.source, pattern.flags);
      let match: RegExpExecArray | null;

      while ((match = regex.exec(content)) !== null) {
        const concept = match[1] ?? match[0];
        if (concept.length > 2) {
          concepts.add(concept);
        }
      }
    }

    return Array.from(concepts).slice(0, 20);
  }

  /**
   * Extract dependency references from import/require statements
   *
   * @param content - Raw text content
   * @returns Array of dependency paths or module names
   *
   * @private
   */
  private extractDependencies(content: string): string[] {
    const deps = new Set<string>();

    for (const pattern of DEPENDENCY_PATTERNS) {
      const regex = new RegExp(pattern.source, pattern.flags);
      let match: RegExpExecArray | null;

      while ((match = regex.exec(content)) !== null) {
        if (match[1]) {
          deps.add(match[1]);
        }
      }
    }

    return Array.from(deps);
  }

  /**
   * Tokenize text into alphanumeric words
   *
   * @param text - Input text
   * @returns Array of word tokens
   *
   * @private
   */
  private tokenize(text: string): string[] {
    return text.match(/[a-zA-Z][a-zA-Z0-9]{2,}/g) ?? [];
  }

  /**
   * Score an augmented file against query terms
   *
   * Scores are computed from keyword overlap (weight 3), concept overlap
   * (weight 2), summary overlap (weight 1), and path overlap (weight 1).
   *
   * @param file - Augmented file to score
   * @param queryTerms - Tokenized query terms
   * @returns Relevance score (0 = no match)
   *
   * @private
   */
  private scoreFile(file: AugmentedFile, queryTerms: string[]): number {
    let score = 0;

    const keywordSet = new Set(file.augmentation.keywords.map(k => k.toLowerCase()));
    const conceptSet = new Set(file.augmentation.concepts.map(c => c.toLowerCase()));
    const summaryTokens = new Set(this.tokenize(file.augmentation.summary.toLowerCase()));
    const pathTokens = new Set(this.tokenize(file.path.toLowerCase()));

    for (const term of queryTerms) {
      if (keywordSet.has(term)) score += 3;
      if (conceptSet.has(term)) score += 2;
      if (summaryTokens.has(term)) score += 1;
      if (pathTokens.has(term)) score += 1;
    }

    return score;
  }

  /**
   * Format a file's augmentation metadata as a header block
   *
   * @param file - Augmented file
   * @returns Formatted header string
   *
   * @private
   */
  private formatFileHeader(file: AugmentedFile): string {
    const parts: string[] = [`=== ${file.path} ===`];

    if (file.augmentation.keywords.length > 0) {
      parts.push(`Keywords: ${file.augmentation.keywords.join(', ')}`);
    }

    if (file.augmentation.concepts.length > 0) {
      parts.push(`Concepts: ${file.augmentation.concepts.join(', ')}`);
    }

    if (file.augmentation.dependencies.length > 0) {
      parts.push(`Dependencies: ${file.augmentation.dependencies.join(', ')}`);
    }

    if (file.augmentation.summary) {
      parts.push(`Summary: ${file.augmentation.summary}`);
    }

    parts.push('---');

    return parts.join('\n');
  }
}

// Export for convenience
export default FileAugmentedRetrieval;

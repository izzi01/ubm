/**
 * SCTDD (Spec/Context/Test-Driven Development) Pattern Implementation
 *
 * Agent refuses to write code until spec + context + test baseline are confirmed.
 * Prevents "lazy coding" by enforcing upfront requirements.
 *
 * Impact: 90% of Claude Code's own codebase is self-authored using this pattern.
 *
 * @module SCTDD
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Context describing the readiness state for development
 */
export interface SCTDDContext {
  /** Whether a spec file exists */
  hasSpec: boolean;
  /** Whether a context file exists */
  hasContext: boolean;
  /** Whether test baseline exists */
  hasTestBaseline: boolean;
  /** Path to the spec file if found */
  specPath?: string;
  /** Path to the context file if found */
  contextPath?: string;
  /** Paths to test files found */
  testPaths: string[];
  /** Path to the project root */
  projectRoot: string;
}

/**
 * SCTDDGate - Enforces spec/context/test requirements before implementation
 *
 * @example
 * ```typescript
 * const gate = new SCTDDGate();
 * const ctx = await gate.check('/path/to/project');
 *
 * if (gate.isReady(ctx)) {
 *   console.log('Ready for implementation!');
 * } else {
 *   console.log(gate.report(ctx));
 *   gate.block(ctx); // Throws with actionable message
 * }
 * ```
 */
export class SCTDDGate {
  /** File patterns for spec detection */
  private readonly SPEC_PATTERNS = [
    'PRD.md',
    'prd.md',
    'acceptance-criteria.md',
    'ACCEPTANCE-CRITERIA.md',
    /\.story\.md$/,
    /-story\.md$/,
    /spec\.md$/i,
    /specification\.md$/i,
  ];

  /** File patterns for context detection */
  private readonly CONTEXT_PATTERNS = [
    'project-context.md',
    'AGENTS.md',
    'agents.md',
    'architecture.md',
    'ARCHITECTURE.md',
    '.agents/context.md',
    '.context/project.md',
  ];

  /** File patterns for test detection */
  private readonly TEST_PATTERNS = [
    /\.test\.ts$/,
    /\.spec\.ts$/,
    /\.test\.js$/,
    /\.spec\.js$/,
    /__tests__\//,
  ];

  /**
   * Check the project for spec, context, and test baseline
   *
   * @param projectRoot - Root directory of the project
   * @returns Context describing what was found
   */
  async check(projectRoot: string): Promise<SCTDDContext> {
    const ctx: SCTDDContext = {
      hasSpec: false,
      hasContext: false,
      hasTestBaseline: false,
      testPaths: [],
      projectRoot,
    };

    const allFiles = this.walkDir(projectRoot);

    for (const file of allFiles) {
      const relativePath = path.relative(projectRoot, file);

      if (!ctx.hasSpec && this.matchesPatterns(relativePath, this.SPEC_PATTERNS)) {
        ctx.hasSpec = true;
        ctx.specPath = relativePath;
      }

      if (!ctx.hasContext && this.matchesPatterns(relativePath, this.CONTEXT_PATTERNS)) {
        ctx.hasContext = true;
        ctx.contextPath = relativePath;
      }

      if (this.matchesPatterns(relativePath, this.TEST_PATTERNS)) {
        ctx.hasTestBaseline = true;
        ctx.testPaths.push(relativePath);
      }
    }

    return ctx;
  }

  /**
   * Check if all requirements are met for implementation
   *
   * @param ctx - Context from check()
   * @returns true if ready for implementation
   */
  isReady(ctx: SCTDDContext): boolean {
    return ctx.hasSpec && ctx.hasContext && ctx.hasTestBaseline;
  }

  /**
   * Generate a human-readable readiness report
   *
   * @param ctx - Context from check()
   * @returns Formatted report string
   */
  report(ctx: SCTDDContext): string {
    const lines: string[] = [
      'SCTDD Readiness Report',
      '======================',
      '',
      `Spec:        ${ctx.hasSpec ? '✅ ' + ctx.specPath : '❌ Missing'}`,
      `Context:     ${ctx.hasContext ? '✅ ' + ctx.contextPath : '❌ Missing'}`,
      `Test Base:   ${ctx.hasTestBaseline ? '✅ ' + ctx.testPaths.length + ' files' : '❌ Missing'}`,
      '',
    ];

    if (!this.isReady(ctx)) {
      lines.push('Action Required:');
      if (!ctx.hasSpec) {
        lines.push('  - Create a spec file (PRD.md, acceptance-criteria.md, or *.story.md)');
      }
      if (!ctx.hasContext) {
        lines.push('  - Create a context file (project-context.md, AGENTS.md, or architecture.md)');
      }
      if (!ctx.hasTestBaseline) {
        lines.push('  - Create test files (*.test.ts or *.spec.ts)');
      }
    } else {
      lines.push('✅ Ready for implementation!');
    }

    return lines.join('\n');
  }

  /**
   * Block execution if not ready
   *
   * @param ctx - Context from check()
   * @throws Error with actionable message if not ready
   */
  block(ctx: SCTDDContext): void {
    if (this.isReady(ctx)) {
      return;
    }

    const missing: string[] = [];
    if (!ctx.hasSpec) missing.push('spec (PRD.md, *.story.md)');
    if (!ctx.hasContext) missing.push('context (project-context.md, AGENTS.md)');
    if (!ctx.hasTestBaseline) missing.push('test baseline (*.test.ts)');

    throw new Error(
      `SCTDD Gate: Cannot proceed without ${missing.join(', ')}. ` +
      'SCTDD requires spec + context + test baseline before implementation.'
    );
  }

  /**
   * Recursively walk directory and collect all file paths
   *
   * @param dir - Directory to walk
   * @param results - Accumulated results
   * @private
   */
  private walkDir(dir: string, results: string[] = []): string[] {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (!this.shouldSkipDir(entry.name)) {
          this.walkDir(fullPath, results);
        }
      } else if (entry.isFile()) {
        results.push(fullPath);
      }
    }

    return results;
  }

  /**
   * Check if directory should be skipped
   *
   * @param name - Directory name
   * @private
   */
  private shouldSkipDir(name: string): boolean {
    const skip = ['node_modules', '.git', 'dist', 'build', '.next', 'coverage', '__pycache__'];
    return skip.includes(name) || name.startsWith('.');
  }

  /**
   * Check if path matches any pattern
   *
   * @param filePath - File path to check
   * @param patterns - Patterns to match against
   * @private
   */
  private matchesPatterns(filePath: string, patterns: (string | RegExp)[]): boolean {
    return patterns.some(pattern => {
      if (typeof pattern === 'string') {
        return filePath.endsWith(pattern) || filePath.includes(pattern);
      }
      return pattern.test(filePath);
    });
  }
}

export default SCTDDGate;

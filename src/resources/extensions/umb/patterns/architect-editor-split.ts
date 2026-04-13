/**
 * Architect/Editor Split Pattern Implementation
 *
 * Separation of design phase (Architect - read-only) from implementation (Editor - write).
 * Prevents implementation drift by enforcing a plan-first workflow.
 *
 * Origin: Aider (Repository Map + Architect mode), Cursor (Composer), Claude Code (Plan → Act → Verify)
 *
 * @module ArchitectEditorSplit
 */

/**
 * Development phase enumeration
 */
export enum Phase {
  /** Read-only phase for planning and analysis */
  ARCHITECT = 'architect',
  /** Write phase for implementation following the plan */
  EDITOR = 'editor',
}

/**
 * Plan created by the Architect phase
 */
export interface ArchitectPlan {
  /** Files to be modified or created */
  files: string[];
  /** Functions/methods to implement */
  functions: string[];
  /** External and internal dependencies */
  dependencies: string[];
  /** Identified risks and edge cases */
  risks: string[];
  /** Design patterns to follow */
  patterns: string[];
  /** Path where the plan is stored */
  planPath: string;
  /** Timestamp of plan creation */
  createdAt: Date;
  /** Additional notes */
  notes?: string;
}

/**
 * Tool access configuration
 */
interface ToolAccess {
  canRead: boolean;
  canGrep: boolean;
  canLSP: boolean;
  canEdit: boolean;
  canWrite: boolean;
  canBash: boolean;
}

/**
 * ArchitectEditorSplit - Enforces phase separation in development workflow
 *
 * @example
 * ```typescript
 * const split = new ArchitectEditorSplit();
 *
 * // Phase 1: Architect (read-only)
 * split.assertCanRead(); // OK
 * split.createPlan({
 *   files: ['src/auth.ts'],
 *   functions: ['login', 'logout'],
 *   dependencies: ['jsonwebtoken'],
 *   risks: ['Token expiration'],
 *   patterns: ['Repository pattern'],
 *   planPath: 'PLAN.md',
 * });
 *
 * // Transition to Editor
 * split.transitionToEditor();
 *
 * // Phase 2: Editor (write)
 * split.assertCanWrite(); // OK
 * split.assertCanEdit(); // OK
 *
 * // After implementation, reset for next task
 * split.reset();
 * ```
 */
export class ArchitectEditorSplit {
  /** Current development phase */
  private _currentPhase: Phase = Phase.ARCHITECT;

  /** Frozen plan after transition to Editor */
  private _plan: ArchitectPlan | null = null;

  /** Whether plan is frozen */
  private _planFrozen: boolean = false;

  /**
   * Get the current phase
   */
  get currentPhase(): Phase {
    return this._currentPhase;
  }

  /**
   * Get the current plan (null if not created)
   */
  getPlan(): ArchitectPlan | null {
    return this._plan;
  }

  /**
   * Get tool access for current phase
   */
  getToolAccess(): ToolAccess {
    if (this._currentPhase === Phase.ARCHITECT) {
      return {
        canRead: true,
        canGrep: true,
        canLSP: true,
        canEdit: false,
        canWrite: false,
        canBash: false,
      };
    }

    return {
      canRead: true,
      canGrep: true,
      canLSP: true,
      canEdit: true,
      canWrite: true,
      canBash: true,
    };
  }

  /**
   * Create a plan during Architect phase
   *
   * @param analysis - Partial plan to complete
   * @returns Completed plan
   * @throws Error if not in Architect phase
   */
  createPlan(analysis: Partial<ArchitectPlan>): ArchitectPlan {
    if (this._currentPhase !== Phase.ARCHITECT) {
      throw new Error('Cannot create plan in Editor phase. Reset to Architect first.');
    }

    this._plan = {
      files: analysis.files || [],
      functions: analysis.functions || [],
      dependencies: analysis.dependencies || [],
      risks: analysis.risks || [],
      patterns: analysis.patterns || [],
      planPath: analysis.planPath || 'PLAN.md',
      createdAt: new Date(),
      notes: analysis.notes,
    };

    return this._plan;
  }

  /**
   * Transition from Architect to Editor phase
   *
   * Freezes the plan and enables write operations.
   *
   * @throws Error if no plan exists
   */
  transitionToEditor(): void {
    if (!this._plan) {
      throw new Error('Cannot transition to Editor without a plan. Call createPlan() first.');
    }

    this._currentPhase = Phase.EDITOR;
    this._planFrozen = true;
  }

  /**
   * Assert that read operations are allowed
   *
   * Always passes - both phases can read.
   */
  assertCanRead(): void {
    // Both phases can read - no-op
  }

  /**
   * Assert that write operations are allowed
   *
   * @throws Error if in Architect phase
   */
  assertCanWrite(): void {
    if (this._currentPhase === Phase.ARCHITECT) {
      throw new Error('Write operations not allowed in Architect phase. Call transitionToEditor() first.');
    }
  }

  /**
   * Assert that edit operations are allowed
   *
   * @throws Error if in Architect phase
   */
  assertCanEdit(): void {
    this.assertCanWrite();
  }

  /**
   * Assert that bash operations are allowed
   *
   * @throws Error if in Architect phase
   */
  assertCanBash(): void {
    if (this._currentPhase === Phase.ARCHITECT) {
      throw new Error('Bash operations not allowed in Architect phase. Call transitionToEditor() first.');
    }
  }

  /**
   * Validate that implementation follows the plan
   *
   * @param actualFiles - Files actually modified
   * @returns Validation result with any deviations
   */
  validateImplementation(actualFiles: string[]): { valid: boolean; deviations: string[] } {
    if (!this._plan) {
      return { valid: false, deviations: ['No plan exists'] };
    }

    const deviations: string[] = [];
    const plannedFiles = new Set(this._plan.files.map(f => f.toLowerCase()));

    for (const file of actualFiles) {
      if (!plannedFiles.has(file.toLowerCase())) {
        deviations.push(`File not in plan: ${file}`);
      }
    }

    return {
      valid: deviations.length === 0,
      deviations,
    };
  }

  /**
   * Reset to Architect phase for a new task
   *
   * Clears the plan and returns to read-only mode.
   */
  reset(): void {
    this._currentPhase = Phase.ARCHITECT;
    this._plan = null;
    this._planFrozen = false;
  }

  /**
   * Render plan as markdown string
   *
   * @returns Formatted plan markdown
   */
  renderPlan(): string {
    if (!this._plan) {
      return '# No Plan Created\n\nCreate a plan using createPlan() first.';
    }

    const lines = [
      `# Implementation Plan`,
      '',
      `**Created**: ${this._plan.createdAt.toISOString()}`,
      `**Phase**: ${this._currentPhase}`,
      '',
      '## Files',
      ...this._plan.files.map(f => `- ${f}`),
      '',
      '## Functions',
      ...this._plan.functions.map(f => `- ${f}`),
      '',
      '## Dependencies',
      ...this._plan.dependencies.map(d => `- ${d}`),
      '',
      '## Risks',
      ...this._plan.risks.map(r => `- ${r}`),
      '',
      '## Patterns',
      ...this._plan.patterns.map(p => `- ${p}`),
    ];

    if (this._plan.notes) {
      lines.push('', '## Notes', this._plan.notes);
    }

    return lines.join('\n');
  }
}

export default ArchitectEditorSplit;

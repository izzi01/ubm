/**
 * Atlas Hook Pattern (Orchestrator Restraint)
 *
 * A pre-action check that enforces delegation to prevent over-orchestration.
 *
 * Philosophy: "Atlas carries the world, but delegates the details."
 */

/**
 * Represents an action that the orchestrator could perform or delegate.
 */
export interface Action {
  /**
   * Human-readable description of what needs to be done.
   * Used for keyword-based work type detection.
   */
  description: string;
  /**
   * Optional metadata about the action.
   */
  metadata?: Record<string, unknown>;
}

/**
 * Result of delegation decision.
 *
 * Either:
 * - Don't delegate (execute directly) with a reason
 * - Delegate with category and required skills
 */
export type DelegationDecision =
  | { delegate: false; reason: string }
  | { delegate: true; category: string; skills: string[] };

/**
 * Categories for delegation.
 */
export const DelegationCategory = {
  VisualEngineering: 'visual-engineering',
  Quick: 'quick',
  UltraBrain: 'ultrabrain',
  Deep: 'deep',
  UnspecifiedLow: 'unspecified-low',
} as const;

/**
 * Skills for different work types.
 */
export const DelegationSkills = {
  FrontendUiUx: 'frontend-ui-ux',
  GitMaster: 'git-master',
  Playwright: 'playwright',
  AgentBrowser: 'agent-browser',
} as const;

/**
 * Atlas Hook Interface.
 *
 * A pre-action check that determines whether the orchestrator should
 * delegate an action or execute it directly.
 */
export interface AtlasHook {
  /**
   * Analyze an action and determine if it should be delegated.
   *
   * @param action - The action to evaluate
   * @returns Decision on whether to delegate and how
   */
  shouldDelegate(action: Action): DelegationDecision;
  isUIWork(action: Action): boolean;
  isGitOperation(action: Action): boolean;
  isComplexLogic(action: Action): boolean;
  isBrowserWork(action: Action): boolean;
  isSimpleCoordination(action: Action): boolean;
}

/**
 * Atlas Hook Implementation.
 *
 * Enforces delegation rules based on work type detection using keywords.
 * Implements 5 rules with a default-to-delegate fallback.
 */
export class AtlasHookImpl implements AtlasHook {
  /**
   * Analyze an action and determine if it should be delegated.
   *
   * Rules are evaluated in order:
   * 1. UI/Frontend work → MUST delegate to visual-engineering
   * 2. Git operations → MUST delegate to quick with git-master
   * 3. Complex logic → MUST delegate to ultrabrain
   * 4. Browser automation → MUST delegate to quick with browser skills
   * 5. Simple coordination → OK to execute directly
   * 6. Default → When in doubt, delegate to unspecified-low
   *
   * @param action - The action to evaluate
   * @returns Delegation decision
   */
  shouldDelegate(action: Action): DelegationDecision {
    // Rule 1: UI/Frontend work → MUST delegate
    if (this.isUIWork(action)) {
      return {
        delegate: true,
        category: DelegationCategory.VisualEngineering,
        skills: [DelegationSkills.FrontendUiUx],
      };
    }

    // Rule 2: Git operations → MUST delegate
    if (this.isGitOperation(action)) {
      return {
        delegate: true,
        category: DelegationCategory.Quick,
        skills: [DelegationSkills.GitMaster],
      };
    }

    // Rule 3: Complex logic → MUST delegate
    if (this.isComplexLogic(action)) {
      return {
        delegate: true,
        category: DelegationCategory.UltraBrain,
        skills: [],
      };
    }

    // Rule 4: Browser automation → MUST delegate
    if (this.isBrowserWork(action)) {
      return {
        delegate: true,
        category: DelegationCategory.Quick,
        skills: [DelegationSkills.Playwright, DelegationSkills.AgentBrowser],
      };
    }

    // Rule 5: Simple coordination → OK to do yourself
    if (this.isSimpleCoordination(action)) {
      return {
        delegate: false,
        reason: 'Simple coordination task',
      };
    }

    // Default: When in doubt, delegate
    return {
      delegate: true,
      category: DelegationCategory.UnspecifiedLow,
      skills: [],
    };
  }

  /**
   * Check if action involves UI/Frontend work.
   *
   * Keywords: component, style, css, tailwind, ui, ux, design, layout, responsive, animation, navbar, toggle, button, theme, dark mode
   */
  isUIWork(action: Action): boolean {
    const uiKeywords = [
      'component',
      'style',
      'css',
      'tailwind',
      'ui',
      'ux',
      'design',
      'layout',
      'responsive',
      'animation',
      'navbar',
      'toggle',
      'button',
      'theme',
      'dark mode',
    ];
    const description = action.description.toLowerCase();
    return uiKeywords.some((kw) => description.includes(kw));
  }

  /**
   * Check if action involves Git operations.
   *
   * Keywords: commit, push, pull, merge, rebase, branch, checkout, git
   */
  isGitOperation(action: Action): boolean {
    const gitKeywords = [
      'commit',
      'push',
      'pull',
      'merge',
      'rebase',
      'branch',
      'checkout',
      'git',
    ];
    const description = action.description.toLowerCase();
    return gitKeywords.some((kw) => description.includes(kw));
  }

  /**
   * Check if action involves complex logic.
   *
   * Heuristics:
   * - More than 3 numbered steps
   * - Mentions "algorithm", "optimize", "refactor"
   */
  isComplexLogic(action: Action): boolean {
    // Count numbered steps (1., 2., 3., etc.)
    const steps = action.description.split(/\d+\./g).length - 1;
    const complexKeywords = ['algorithm', 'optimize', 'refactor'];

    const description = action.description.toLowerCase();
    const hasComplexKeywords = complexKeywords.some((kw) => description.includes(kw));

    return steps > 3 || hasComplexKeywords;
  }

  /**
   * Check if action involves browser automation.
   *
   * Keywords: browser, screenshot, scrape, navigate, click, fill form, playwright
   */
  isBrowserWork(action: Action): boolean {
    const browserKeywords = [
      'browser',
      'screenshot',
      'scrape',
      'navigate',
      'click',
      'fill form',
      'playwright',
    ];
    const description = action.description.toLowerCase();
    return browserKeywords.some((kw) => description.includes(kw));
  }

  /**
   * Check if action is simple coordination.
   *
   * Keywords: read file, check status, list files, search for, find pattern
   */
  isSimpleCoordination(action: Action): boolean {
    const coordKeywords = [
      'read file',
      'check status',
      'list files',
      'search for',
      'find pattern',
    ];
    const description = action.description.toLowerCase();
    return coordKeywords.some((kw) => description.includes(kw));
  }
}

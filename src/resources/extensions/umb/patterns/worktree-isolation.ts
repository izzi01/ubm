/**
 * WorktreeIsolation Pattern Implementation
 *
 * Provides Git worktree-based isolation for safe parallel development.
 * Each task gets its own working directory and branch, preventing conflicts
 * between concurrent operations on the same repository.
 *
 * Reliability improvement: Eliminates merge conflicts in parallel agent workflows
 *
 * @module WorktreeIsolation
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync, rmSync } from 'fs';
import { join, resolve } from 'path';

/**
 * Default base directory for worktree checkouts
 */
export const DEFAULT_WORKTREE_BASE = '/tmp/umbrella-worktrees';

/**
 * Configuration for creating a new worktree
 */
export interface WorktreeConfig {
  /** Unique task identifier used to name the branch and directory */
  taskId: string;
  /** Base branch to create the worktree from (e.g., 'main', 'develop') */
  baseBranch: string;
  /** Optional custom path for the worktree directory */
  worktreePath?: string;
  /** Optional timeout in milliseconds for git operations (defaults to 30000) */
  timeout?: number;
}

/**
 * Result from a worktree creation or listing operation
 */
export interface WorktreeResult {
  /** Absolute path to the worktree directory */
  worktreePath: string;
  /** Name of the branch associated with this worktree */
  branchName: string;
  /** Task identifier that created this worktree */
  taskId: string;
}

/**
 * WorktreeIsolation - Git worktree isolation for safe parallel development
 *
 * Provides:
 * - Isolated working directories per task
 * - Automatic branch creation and cleanup
 * - Parallel-safe git operations
 * - Timeout protection on git commands
 * - Higher-order `withIsolation` for automatic lifecycle management
 *
 * @example
 * ```typescript
 * const isolation = new WorktreeIsolation('/path/to/repo');
 *
 * const wt = await isolation.create({
 *   taskId: 'fix-auth-bug',
 *   baseBranch: 'main'
 * });
 * console.log(`Working in: ${wt.worktreePath}`);
 *
 * const result = await isolation.withIsolation(
 *   { taskId: 'lint-check', baseBranch: 'main' },
 *   async (path) => {
 *     execSync('npm run lint', { cwd: path });
 *     return 'lint passed';
 *   }
 * );
 * ```
 */
export class WorktreeIsolation {
  private readonly repoPath: string;
  private readonly worktreeBase: string;
  private readonly DEFAULT_TIMEOUT = 30000;

  /**
   * @param repoPath - Absolute path to the git repository
   * @param worktreeBase - Base directory for worktree checkouts
   *
   * @example
   * ```typescript
   * const isolation = new WorktreeIsolation('/home/user/my-repo');
   * ```
   */
  constructor(repoPath: string, worktreeBase: string = DEFAULT_WORKTREE_BASE) {
    this.repoPath = resolve(repoPath);
    this.worktreeBase = resolve(worktreeBase);
  }

  /**
   * Create a new isolated worktree for a task
   *
   * @param config - Worktree configuration
   * @returns The created worktree result with path and branch info
   * @throws Error if git worktree creation fails
   *
   * @example
   * ```typescript
   * const wt = await isolation.create({
   *   taskId: 'feature-auth',
   *   baseBranch: 'main'
   * });
   * ```
   */
  async create(config: WorktreeConfig): Promise<WorktreeResult> {
    if (!config.taskId || typeof config.taskId !== 'string') {
      throw new Error('taskId must be a non-empty string');
    }

    if (!config.baseBranch || typeof config.baseBranch !== 'string') {
      throw new Error('baseBranch must be a non-empty string');
    }

    const branchName = `worktree/${config.taskId}`;
    const worktreePath = config.worktreePath
      ? resolve(config.worktreePath)
      : join(this.worktreeBase, config.taskId);
    const timeout = config.timeout || this.DEFAULT_TIMEOUT;

    if (!existsSync(this.worktreeBase)) {
      mkdirSync(this.worktreeBase, { recursive: true });
    }

    if (existsSync(worktreePath)) {
      try {
        this.execGit(`worktree remove --force "${worktreePath}"`, timeout);
      } catch {
        rmSync(worktreePath, { recursive: true, force: true });
      }
    }

    try {
      this.execGit(`branch -D "${branchName}"`, timeout);
    } catch {
      // branch does not exist yet
    }

    try {
      this.execGit(
        `worktree add -b "${branchName}" "${worktreePath}" "${config.baseBranch}"`,
        timeout
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Failed to create worktree for task "${config.taskId}": ${message}`
      );
    }

    return {
      worktreePath,
      branchName,
      taskId: config.taskId
    };
  }

  /**
   * Remove a worktree by task ID
   *
   * @param taskId - Task identifier of the worktree to remove
   * @throws Error if worktree removal fails
   *
   * @example
   * ```typescript
   * await isolation.remove('feature-auth');
   * ```
   */
  async remove(taskId: string): Promise<void> {
    if (!taskId || typeof taskId !== 'string') {
      throw new Error('taskId must be a non-empty string');
    }

    const worktreePath = join(this.worktreeBase, taskId);
    const branchName = `worktree/${taskId}`;

    try {
      this.execGit(`worktree remove --force "${worktreePath}"`, this.DEFAULT_TIMEOUT);
    } catch {
      if (existsSync(worktreePath)) {
        rmSync(worktreePath, { recursive: true, force: true });
      }
    }

    try {
      this.execGit('worktree prune', this.DEFAULT_TIMEOUT);
    } catch {
      // non-critical
    }

    try {
      this.execGit(`branch -D "${branchName}"`, this.DEFAULT_TIMEOUT);
    } catch {
      // branch already removed
    }
  }

  /**
   * List all active worktrees with `worktree/` branch prefix
   *
   * @returns Array of worktree results
   *
   * @example
   * ```typescript
   * const worktrees = await isolation.list();
   * for (const wt of worktrees) {
   *   console.log(`${wt.taskId}: ${wt.worktreePath}`);
   * }
   * ```
   */
  async list(): Promise<WorktreeResult[]> {
    let output: string;

    try {
      output = this.execGit('worktree list --porcelain', this.DEFAULT_TIMEOUT);
    } catch {
      return [];
    }

    const results: WorktreeResult[] = [];
    const blocks = output.split('\n\n').filter(block => block.trim().length > 0);

    for (const block of blocks) {
      const lines = block.split('\n');
      let worktreePath = '';
      let branchName = '';

      for (const line of lines) {
        if (line.startsWith('worktree ')) {
          worktreePath = line.substring('worktree '.length).trim();
        } else if (line.startsWith('branch ')) {
          const fullRef = line.substring('branch '.length).trim();
          branchName = fullRef.replace('refs/heads/', '');
        }
      }

      if (branchName.startsWith('worktree/') && worktreePath) {
        const taskId = branchName.replace('worktree/', '');
        results.push({ worktreePath, branchName, taskId });
      }
    }

    return results;
  }

  /**
   * Execute a function within an isolated worktree, with automatic cleanup
   *
   * @param config - Worktree configuration
   * @param fn - Async function to execute within the isolated worktree
   * @returns The return value of the provided function
   * @throws Re-throws any error from the function after cleanup
   *
   * @example
   * ```typescript
   * const testResult = await isolation.withIsolation(
   *   { taskId: 'run-tests', baseBranch: 'main' },
   *   async (worktreePath) => {
   *     execSync('npm test', { cwd: worktreePath });
   *     return 'all tests passed';
   *   }
   * );
   * ```
   */
  async withIsolation<T>(
    config: WorktreeConfig,
    fn: (path: string) => Promise<T>
  ): Promise<T> {
    const worktree = await this.create(config);

    try {
      return await fn(worktree.worktreePath);
    } finally {
      try {
        await this.remove(config.taskId);
      } catch (cleanupError) {
        const message = cleanupError instanceof Error
          ? cleanupError.message
          : String(cleanupError);
        console.warn(
          `WorktreeIsolation: cleanup failed for task "${config.taskId}": ${message}`
        );
      }
    }
  }

  /**
   * @param command - Git subcommand (without the 'git' prefix)
   * @param timeout - Timeout in milliseconds
   * @returns stdout output as string
   * @private
   */
  private execGit(command: string, timeout: number): string {
    return execSync(`git ${command}`, {
      cwd: this.repoPath,
      timeout,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();
  }
}

export default WorktreeIsolation;

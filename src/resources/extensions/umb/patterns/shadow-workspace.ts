/**
 * ShadowWorkspace Pattern Implementation
 *
 * Pre-flight validation of changes in an isolated environment before
 * applying to the real codebase. Eliminates "broken intermediate states"
 * so the user never sees broken code.
 *
 * Origin: Cursor (Shadow Workspace), Windsurf (Flow validation), Git branching strategies
 *
 * @module ShadowWorkspace
 */

import { execSync } from 'child_process';
import { copyFileSync, existsSync, mkdirSync, rmSync, unlinkSync } from 'fs';
import { dirname, join, resolve } from 'path';

/**
 * Configuration for shadow workspace validation
 */
export interface ShadowWorkspaceConfig {
  /** Unique task identifier for the shadow branch/directory */
  taskId: string;
  /** Branch to return to and merge into on success */
  workingBranch: string;
  /** List of file paths that will be modified during validation */
  files: string[];
}

/**
 * Result from a shadow workspace validation run
 */
export interface ShadowResult {
  /** Whether all validation steps passed */
  success: boolean;
  /** Name of the shadow branch that was created */
  shadowBranch: string;
  /** List of error messages from failed validation steps */
  errors: string[];
}

/**
 * ShadowWorkspace - Pre-flight validation in an isolated branch
 *
 * Provides:
 * - Isolated shadow branch for testing changes
 * - Automatic merge on success, discard on failure
 * - File-copy fallback when git is unavailable
 * - Full validation pipeline (apply → test → merge/discard)
 *
 * @example
 * ```typescript
 * const shadow = new ShadowWorkspace('/path/to/repo');
 *
 * const result = await shadow.validate(
 *   { taskId: 'refactor-auth', workingBranch: 'main', files: ['src/auth.ts'] },
 *   async () => {
 *     writeFileSync('src/auth.ts', newAuthCode);
 *   }
 * );
 *
 * if (result.success) {
 *   console.log('Changes merged successfully');
 * } else {
 *   console.log('Validation failed:', result.errors);
 * }
 * ```
 */
export class ShadowWorkspace {
  private readonly repoPath: string;
  private readonly DEFAULT_TIMEOUT = 60000;

  /**
   * @param repoPath - Absolute path to the git repository
   *
   * @example
   * ```typescript
   * const shadow = new ShadowWorkspace('/home/user/my-repo');
   * ```
   */
  constructor(repoPath: string) {
    this.repoPath = resolve(repoPath);
  }

  /**
   * Run full shadow branch validation workflow
   *
   * 1. Create shadow branch from working branch
   * 2. Apply changes via the provided function
   * 3. Run test suite and build
   * 4. On success: merge shadow into working branch
   * 5. On failure: discard shadow branch and report errors
   *
   * Falls back to file-copy isolation when git is unavailable.
   *
   * @param config - Shadow workspace configuration
   * @param applyFn - Async function that applies the changes to validate
   * @returns Validation result with success status and any errors
   *
   * @example
   * ```typescript
   * const result = await shadow.validate(
   *   { taskId: 'add-feature', workingBranch: 'develop', files: ['src/feature.ts'] },
   *   async () => {
   *     writeFileSync('src/feature.ts', featureCode);
   *   }
   * );
   * ```
   */
  async validate(
    config: ShadowWorkspaceConfig,
    applyFn: () => Promise<void>
  ): Promise<ShadowResult> {
    if (!config.taskId || typeof config.taskId !== 'string') {
      throw new Error('taskId must be a non-empty string');
    }

    if (!config.workingBranch || typeof config.workingBranch !== 'string') {
      throw new Error('workingBranch must be a non-empty string');
    }

    if (!this.isGitAvailable()) {
      return this.validateWithFileCopy(config, applyFn);
    }

    const shadowBranch = `shadow/${config.taskId}`;
    const errors: string[] = [];

    try {
      await this.checkoutShadow(config.taskId);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, shadowBranch, errors: [`Shadow branch creation failed: ${message}`] };
    }

    try {
      await applyFn();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`Apply failed: ${message}`);
      await this.safeCheckout(config.workingBranch);
      await this.discardShadow(shadowBranch);
      return { success: false, shadowBranch, errors };
    }

    try {
      this.execGit('add -A', this.DEFAULT_TIMEOUT);
      this.execGit(`commit -m "shadow: validate ${config.taskId}" --allow-empty`, this.DEFAULT_TIMEOUT);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`Commit failed: ${message}`);
    }

    if (errors.length === 0) {
      try {
        this.execShell('npm test --if-present', this.DEFAULT_TIMEOUT);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        errors.push(`Tests failed: ${message}`);
      }
    }

    if (errors.length === 0) {
      try {
        this.execShell('npm run build --if-present', this.DEFAULT_TIMEOUT);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        errors.push(`Build failed: ${message}`);
      }
    }

    if (errors.length === 0) {
      try {
        await this.mergeShadow(shadowBranch, config.workingBranch);
        return { success: true, shadowBranch, errors: [] };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        errors.push(`Merge failed: ${message}`);
      }
    }

    await this.safeCheckout(config.workingBranch);
    await this.discardShadow(shadowBranch);
    return { success: false, shadowBranch, errors };
  }

  /**
   * Create a shadow branch for the given task
   *
   * @param taskId - Unique task identifier
   * @returns The shadow branch name
   * @throws Error if branch creation fails
   *
   * @example
   * ```typescript
   * const branch = await shadow.checkoutShadow('my-task');
   * ```
   */
  async checkoutShadow(taskId: string): Promise<string> {
    const shadowBranch = `shadow/${taskId}`;

    try {
      this.execGit(`branch -D "${shadowBranch}"`, this.DEFAULT_TIMEOUT);
    } catch {
      // branch does not exist yet
    }

    try {
      this.execGit(`checkout -b "${shadowBranch}"`, this.DEFAULT_TIMEOUT);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to create shadow branch "${shadowBranch}": ${message}`);
    }

    return shadowBranch;
  }

  /**
   * Fast-forward merge shadow branch into target branch
   *
   * @param shadowBranch - Shadow branch to merge from
   * @param targetBranch - Target branch to merge into
   * @throws Error if merge fails
   *
   * @example
   * ```typescript
   * await shadow.mergeShadow('shadow/my-task', 'main');
   * ```
   */
  async mergeShadow(shadowBranch: string, targetBranch: string): Promise<void> {
    try {
      this.execGit(`checkout "${targetBranch}"`, this.DEFAULT_TIMEOUT);
      this.execGit(`merge "${shadowBranch}"`, this.DEFAULT_TIMEOUT);
      this.execGit(`branch -d "${shadowBranch}"`, this.DEFAULT_TIMEOUT);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to merge "${shadowBranch}" into "${targetBranch}": ${message}`);
    }
  }

  /**
   * Discard a shadow branch by force-deleting it
   *
   * @param shadowBranch - Shadow branch to delete
   *
   * @example
   * ```typescript
   * await shadow.discardShadow('shadow/my-task');
   * ```
   */
  async discardShadow(shadowBranch: string): Promise<void> {
    try {
      this.execGit(`branch -D "${shadowBranch}"`, this.DEFAULT_TIMEOUT);
    } catch {
      // branch already removed or never created
    }
  }

  /**
   * File-copy fallback when git is unavailable
   *
   * @param config - Shadow workspace configuration
   * @param applyFn - Async function that applies the changes
   * @returns Validation result
   * @private
   */
  private async validateWithFileCopy(
    config: ShadowWorkspaceConfig,
    applyFn: () => Promise<void>
  ): Promise<ShadowResult> {
    const shadowDir = `/tmp/shadow_${config.taskId}`;
    const shadowBranch = `shadow/${config.taskId}`;
    const errors: string[] = [];
    const backedUpFiles: Array<{ original: string; backup: string }> = [];

    try {
      if (existsSync(shadowDir)) {
        rmSync(shadowDir, { recursive: true, force: true });
      }
      mkdirSync(shadowDir, { recursive: true });

      for (const file of config.files) {
        const originalPath = resolve(this.repoPath, file);
        const backupPath = join(shadowDir, file);

        if (existsSync(originalPath)) {
          const backupDir = dirname(backupPath);
          if (!existsSync(backupDir)) {
            mkdirSync(backupDir, { recursive: true });
          }
          copyFileSync(originalPath, backupPath);
          backedUpFiles.push({ original: originalPath, backup: backupPath });
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, shadowBranch, errors: [`Backup failed: ${message}`] };
    }

    try {
      await applyFn();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`Apply failed: ${message}`);
    }

    if (errors.length === 0) {
      try {
        this.execShell('npm test --if-present', this.DEFAULT_TIMEOUT);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        errors.push(`Tests failed: ${message}`);
      }
    }

    if (errors.length > 0) {
      for (const { original, backup } of backedUpFiles) {
        try {
          copyFileSync(backup, original);
        } catch {
          errors.push(`Failed to restore ${original}`);
        }
      }
    }

    try {
      rmSync(shadowDir, { recursive: true, force: true });
    } catch {
      // non-critical cleanup failure
    }

    return {
      success: errors.length === 0,
      shadowBranch,
      errors
    };
  }

  /** @private */
  private isGitAvailable(): boolean {
    try {
      this.execGit('rev-parse --is-inside-work-tree', 5000);
      return true;
    } catch {
      return false;
    }
  }

  /** @private */
  private async safeCheckout(branch: string): Promise<void> {
    try {
      this.execGit(`checkout "${branch}"`, this.DEFAULT_TIMEOUT);
    } catch {
      // checkout may fail if already on the branch
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

  /**
   * @param command - Shell command to execute
   * @param timeout - Timeout in milliseconds
   * @returns stdout output as string
   * @private
   */
  private execShell(command: string, timeout: number): string {
    return execSync(command, {
      cwd: this.repoPath,
      timeout,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();
  }
}

export default ShadowWorkspace;

/**
 * GSD Auto-Worktree -- lifecycle management for auto-mode worktrees.
 *
 * Auto-mode creates worktrees with `milestone/<MID>` branches (distinct from
 * manual `/worktree` which uses `worktree/<name>` branches). This module
 * manages create, enter, detect, and teardown for auto-mode worktrees.
 */

import {
  existsSync,
  cpSync,
  readFileSync,
  readdirSync,
  mkdirSync,
  realpathSync,
  rmSync,
  unlinkSync,
  statSync,
  lstatSync as lstatSyncFn,
} from "node:fs";
import { isAbsolute, join, sep as pathSep } from "node:path";
import { homedir } from "node:os";
import { GSDError, GSD_IO_ERROR, GSD_GIT_ERROR } from "./errors.js";
import {
  reconcileWorktreeDb,
  isDbAvailable,
  getMilestone,
  getMilestoneSlices,
} from "./gsd-db.js";
import { atomicWriteSync } from "./atomic-write.js";
import { execFileSync } from "node:child_process";
import { gsdRoot } from "./paths.js";
import {
  createWorktree,
  removeWorktree,
  resolveGitDir,
  worktreePath,
  isInsideWorktreesDir,
} from "./worktree-manager.js";
import {
  detectWorktreeName,
  resolveGitHeadPath,
  nudgeGitBranchCache,
} from "./worktree.js";
import { MergeConflictError, readIntegrationBranch, RUNTIME_EXCLUSION_PATHS } from "./git-service.js";
import { debugLog } from "./debug-logger.js";
import { logWarning, logError } from "./workflow-logger.js";
import { loadEffectiveGSDPreferences } from "./preferences.js";
import {
  nativeGetCurrentBranch,
  nativeDetectMainBranch,
  nativeWorkingTreeStatus,
  nativeAddAllWithExclusions,
  nativeCommit,
  nativeCheckoutBranch,
  nativeMergeSquash,
  nativeConflictFiles,
  nativeCheckoutTheirs,
  nativeAddPaths,
  nativeRmForce,
  nativeBranchDelete,
  nativeBranchExists,
  nativeDiffNumstat,
  nativeUpdateRef,
  nativeIsAncestor,
  nativeMergeAbort,
} from "./native-git-bridge.js";

const gsdHome = process.env.GSD_HOME || join(homedir(), ".gsd");
const PROJECT_PREFERENCES_FILE = "PREFERENCES.md";
const LEGACY_PROJECT_PREFERENCES_FILE = "preferences.md";

/**
 * Check if two filesystem paths resolve to the same real location.
 * Returns false if either path cannot be resolved (e.g. doesn't exist).
 */
function isSamePath(a: string, b: string): boolean {
  try {
    return realpathSync(a) === realpathSync(b);
  } catch (e) {
    logWarning("worktree", `isSamePath failed: ${(e as Error).message}`);
    return false;
  }
}

// ─── Module State ──────────────────────────────────────────────────────────

/** Original project root before chdir into auto-worktree. */
let originalBase: string | null = null;

function clearProjectRootStateFiles(basePath: string, milestoneId: string): void {
  const gsdDir = gsdRoot(basePath);
  const transientFiles = [
    join(gsdDir, "STATE.md"),
    join(gsdDir, "auto.lock"),
    join(gsdDir, "milestones", milestoneId, `${milestoneId}-META.json`),
  ];

  for (const file of transientFiles) {
    try {
      unlinkSync(file);
    } catch (err) {
      // ENOENT is expected — file may not exist (#3597)
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
        logWarning("worktree", `file unlink failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  // Clean up milestone directory and runtime/units.
  // These directories may contain untracked files that prevent
  // `git merge --squash` from succeeding, causing silent data loss (#1738).
  const syncedDirs = [
    join(gsdDir, "milestones", milestoneId),
    join(gsdDir, "runtime", "units"),
  ];

  for (const dir of syncedDirs) {
    try {
      if (existsSync(dir)) {
        // Only remove files that are untracked by git — tracked files are
        // managed by the branch checkout and should not be deleted.
        const untrackedOutput = execFileSync(
          "git",
          ["ls-files", "--others", "--exclude-standard", dir],
          { cwd: basePath, stdio: ["ignore", "pipe", "pipe"], encoding: "utf-8" },
        ).trim();
        if (untrackedOutput) {
          for (const f of untrackedOutput.split("\n").filter(Boolean)) {
            try {
              unlinkSync(join(basePath, f));
            } catch (err) {
              // ENOENT/EISDIR are expected for already-removed or directory entries (#3597)
              const code = (err as NodeJS.ErrnoException).code;
              if (code !== "ENOENT" && code !== "EISDIR") {
                logWarning("worktree", `untracked file unlink failed: ${err instanceof Error ? err.message : String(err)}`);
              }
            }
          }
        }
      }
    } catch (err) {
      /* non-fatal — git command may fail if not in repo */
      logWarning("worktree", `untracked file cleanup failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}

// ─── Build Artifact Auto-Resolve ─────────────────────────────────────────────

/** Patterns for machine-generated build artifacts that can be safely
 * auto-resolved by accepting --theirs during merge. These files are
 * regenerable and never contain meaningful manual edits. */
export const SAFE_AUTO_RESOLVE_PATTERNS: RegExp[] = [
  /\.tsbuildinfo$/,
  /\.pyc$/,
  /\/__pycache__\//,
  /\.DS_Store$/,
  /\.map$/,
];

/** Returns true if the file path is safe to auto-resolve during merge.
 * Covers `.gsd/` state files and common build artifacts. */
export const isSafeToAutoResolve = (filePath: string): boolean =>
  filePath.startsWith(".gsd/") ||
  SAFE_AUTO_RESOLVE_PATTERNS.some((re) => re.test(filePath));

// ─── Resource Staleness ───────────────────────────────────────────────────

/**
 * Read the resource version (semver) from the managed-resources manifest.
 * Uses gsdVersion instead of syncedAt so that launching a second session
 * doesn't falsely trigger staleness (#804).
 */
export function readResourceVersion(): string | null {
  const agentDir =
    process.env.GSD_CODING_AGENT_DIR || join(gsdHome, "agent");
  const manifestPath = join(agentDir, "managed-resources.json");
  try {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
    return typeof manifest?.gsdVersion === "string"
      ? manifest.gsdVersion
      : null;
  } catch (e) {
    logWarning("worktree", `readResourceVersion failed: ${(e as Error).message}`);
    return null;
  }
}

/**
 * Check if managed resources have been updated since session start.
 * Returns a warning message if stale, null otherwise.
 */
export function checkResourcesStale(
  versionOnStart: string | null,
): string | null {
  if (versionOnStart === null) return null;
  const current = readResourceVersion();
  if (current === null) return null;
  if (current !== versionOnStart) {
    return "GSD resources were updated since this session started. Restart gsd to load the new code.";
  }
  return null;
}

// ─── Stale Worktree Escape ────────────────────────────────────────────────

/**
 * Detect and escape a stale worktree cwd (#608).
 *
 * After milestone completion + merge, the worktree directory is removed but
 * the process cwd may still point inside `.gsd/worktrees/<MID>/`.
 * When a new session starts, `process.cwd()` is passed as `base` to startAuto
 * and all subsequent writes land in the wrong directory. This function detects
 * that scenario and chdir back to the project root.
 *
 * Returns the corrected base path.
 */
export function escapeStaleWorktree(base: string): string {
  // Direct layout: /.gsd/worktrees/
  const directMarker = `${pathSep}.gsd${pathSep}worktrees${pathSep}`;
  let idx = base.indexOf(directMarker);
  if (idx === -1) {
    // Symlink-resolved layout: /.gsd/projects/<hash>/worktrees/
    const symlinkRe = new RegExp(
      `\\${pathSep}\\.gsd\\${pathSep}projects\\${pathSep}[a-f0-9]+\\${pathSep}worktrees\\${pathSep}`,
    );
    const match = base.match(symlinkRe);
    if (!match || match.index === undefined) return base;
    idx = match.index;
  }

  // base is inside .gsd/worktrees/<something> — extract the project root
  const projectRoot = base.slice(0, idx);

  // Guard: If the candidate project root's .gsd IS the user-level ~/.gsd,
  // the string-slice heuristic matched the wrong /.gsd/ boundary. This happens
  // when .gsd is a symlink into ~/.gsd/projects/<hash> and process.cwd()
  // resolved through the symlink. Returning ~ would be catastrophic (#1676).
  const candidateGsd = join(projectRoot, ".gsd").replaceAll("\\", "/");
  const gsdHomePath = gsdHome.replaceAll("\\", "/");
  if (candidateGsd === gsdHomePath || candidateGsd.startsWith(gsdHomePath + "/")) {
    // Don't chdir to home — return base unchanged.
    // resolveProjectRoot() in worktree.ts has the full git-file-based recovery
    // and will be called by the caller (startAuto → projectRoot()).
    return base;
  }

  try {
    process.chdir(projectRoot);
  } catch (e) {
    // If chdir fails, return the original — caller will handle errors downstream
    logWarning("worktree", `escapeStaleWorktree chdir failed: ${(e as Error).message}`);
    return base;
  }
  return projectRoot;
}

/**
 * Clean stale runtime unit files for completed milestones.
 *
 * After restart, stale runtime/units/*.json from prior milestones can
 * cause deriveState to resume the wrong milestone (#887). Removes files
 * for milestones that have a SUMMARY (fully complete).
 */
export function cleanStaleRuntimeUnits(
  gsdRootPath: string,
  hasMilestoneSummary: (mid: string) => boolean,
): number {
  const runtimeUnitsDir = join(gsdRootPath, "runtime", "units");
  if (!existsSync(runtimeUnitsDir)) return 0;

  let cleaned = 0;
  try {
    for (const file of readdirSync(runtimeUnitsDir)) {
      if (!file.endsWith(".json")) continue;
      const midMatch = file.match(/(M\d+(?:-[a-z0-9]{6})?)/);
      if (!midMatch) continue;
      if (hasMilestoneSummary(midMatch[1])) {
        try {
          unlinkSync(join(runtimeUnitsDir, file));
          cleaned++;
        } catch (err) {
          /* non-fatal */
          logWarning("worktree", `stale runtime unit unlink failed (${file}): ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    }
  } catch (err) {
    /* non-fatal */
    logWarning("worktree", `stale runtime unit cleanup failed: ${err instanceof Error ? err.message : String(err)}`);
  }
  return cleaned;
}

// ─── Worktree Post-Create Hook (#597) ────────────────────────────────────────

/**
 * Run the user-configured post-create hook script after worktree creation.
 * The script receives SOURCE_DIR and WORKTREE_DIR as environment variables.
 * Failure is non-fatal — returns the error message or null on success.
 *
 * Reads the hook path from git.worktree_post_create in preferences.
 * Pass hookPath directly to bypass preference loading (useful for testing).
 */
export function runWorktreePostCreateHook(
  sourceDir: string,
  worktreeDir: string,
  hookPath?: string,
): string | null {
  if (hookPath === undefined) {
    const prefs = loadEffectiveGSDPreferences()?.preferences?.git;
    hookPath = prefs?.worktree_post_create;
  }
  if (!hookPath) return null;

  // Resolve relative paths against the source project root.
  // On Windows, convert 8.3 short paths (e.g. RUNNER~1) to long paths
  // so execFileSync can locate the file correctly.
  let resolved = isAbsolute(hookPath) ? hookPath : join(sourceDir, hookPath);
  if (!existsSync(resolved)) {
    return `Worktree post-create hook not found: ${resolved}`;
  }
  if (process.platform === "win32") {
    try { resolved = realpathSync.native(resolved); } catch (err) { /* keep original */
      logWarning("worktree", `realpath failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  try {
    // .bat/.cmd files on Windows require shell mode — execFileSync cannot
    // spawn them directly (EINVAL).
    const needsShell = process.platform === "win32" && /\.(bat|cmd)$/i.test(resolved);
    execFileSync(resolved, [], {
      cwd: worktreeDir,
      env: {
        ...process.env,
        SOURCE_DIR: sourceDir,
        WORKTREE_DIR: worktreeDir,
      },
      stdio: ["ignore", "pipe", "pipe"],
      encoding: "utf-8",
      timeout: 30_000, // 30 second timeout
      shell: needsShell,
    });
    return null;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return `Worktree post-create hook failed: ${msg}`;
  }
}

// ─── Auto-Worktree Branch Naming ───────────────────────────────────────────

export function autoWorktreeBranch(milestoneId: string): string {
  return `milestone/${milestoneId}`;
}

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Create a new auto-worktree for a milestone, chdir into it, and store
 * the original base path for later teardown.
 *
 * Atomic: chdir + originalBase update happen in the same try block
 * to prevent split-brain.
 */
export function createAutoWorktree(
  basePath: string,
  milestoneId: string,
): string {
  const branch = autoWorktreeBranch(milestoneId);

  // Check if the milestone branch already exists — it survives auto-mode
  // stop/pause and contains committed work from prior sessions. If it exists,
  // re-attach the worktree to it WITHOUT resetting. Only create a fresh branch
  // from the integration branch when no prior work exists.
  const branchExists = nativeBranchExists(basePath, branch);

  let info: { name: string; path: string; branch: string; exists: boolean };
  if (branchExists) {
    // Re-attach worktree to the existing milestone branch (preserving commits)
    info = createWorktree(basePath, milestoneId, {
      branch,
      reuseExistingBranch: true,
    });
  } else {
    // Fresh start — create branch from integration branch.
    // Use the same 3-tier fallback as mergeMilestoneToMain (#3461):
    //   1. META.json integration branch (explicit per-milestone override)
    //   2. git.main_branch preference (user's configured working branch)
    //   3. nativeDetectMainBranch (origin/HEAD auto-detection)
    // Without tier 2, projects with main_branch=dev but origin/HEAD→master
    // would fork worktrees from the wrong (stale) branch.
    const integrationBranch =
      readIntegrationBranch(basePath, milestoneId) ?? undefined;
    const gitPrefs = loadEffectiveGSDPreferences()?.preferences?.git;
    const startPoint = integrationBranch ?? gitPrefs?.main_branch ?? undefined;
    info = createWorktree(basePath, milestoneId, {
      branch,
      startPoint,
    });
  }

  // Run user-configured post-create hook (#597) — e.g. copy .env, symlink assets
  const hookError = runWorktreePostCreateHook(basePath, info.path);
  if (hookError) {
    // Non-fatal — log but don't prevent worktree usage
    logWarning("reconcile", hookError, { worktree: info.name });
  }

  const previousCwd = process.cwd();

  try {
    process.chdir(info.path);
    originalBase = basePath;
  } catch (err) {
    // If chdir fails, the worktree was created but we couldn't enter it.
    // Don't store originalBase -- caller can retry or clean up.
    throw new GSDError(
      GSD_IO_ERROR,
      `Auto-worktree created at ${info.path} but chdir failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  nudgeGitBranchCache(previousCwd);
  return info.path;
}

/**
 * Teardown an auto-worktree: chdir back to original base, then remove
 * the worktree and its branch.
 */
export function teardownAutoWorktree(
  originalBasePath: string,
  milestoneId: string,
  opts: { preserveBranch?: boolean } = {},
): void {
  const branch = autoWorktreeBranch(milestoneId);
  const { preserveBranch = false } = opts;
  const previousCwd = process.cwd();

  try {
    process.chdir(originalBasePath);
    originalBase = null;
  } catch (err) {
    throw new GSDError(
      GSD_IO_ERROR,
      `Failed to chdir back to ${originalBasePath} during teardown: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  nudgeGitBranchCache(previousCwd);
  removeWorktree(originalBasePath, milestoneId, {
    branch,
    deleteBranch: !preserveBranch,
  });

  // Verify cleanup succeeded — warn if the worktree directory is still on disk.
  // On Windows, bash-based cleanup can silently fail when paths contain
  // backslashes (#1436), leaving ~1 GB+ orphaned directories.
  const wtDir = worktreePath(originalBasePath, milestoneId);
  if (existsSync(wtDir)) {
    logWarning(
      "reconcile",
      `Worktree directory still exists after teardown: ${wtDir}. ` +
        `This is likely an orphaned directory consuming disk space. ` +
        `Remove it manually with: rm -rf "${wtDir.replaceAll("\\", "/")}"`,
      { worktree: milestoneId },
    );
    // Attempt a direct filesystem removal as a fallback — but ONLY if the
    // path is safely inside .gsd/worktrees/ to prevent #2365 data loss.
    if (isInsideWorktreesDir(originalBasePath, wtDir)) {
      try {
        rmSync(wtDir, { recursive: true, force: true });
      } catch (err) {
        // Non-fatal — the warning above tells the user how to clean up
        logWarning("worktree", `worktree directory removal failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    } else {
      console.error(
        `[GSD] REFUSING fallback rmSync — path is outside .gsd/worktrees/: ${wtDir}`,
      );
    }
  }
}

/**
 * Detect if the process is currently inside an auto-worktree.
 * Checks both module state and git branch prefix.
 */
export function isInAutoWorktree(basePath: string): boolean {
  if (!originalBase) return false;
  const cwd = process.cwd();
  const resolvedBase = existsSync(basePath) ? realpathSync(basePath) : basePath;
  const wtDir = join(resolvedBase, ".gsd", "worktrees");
  if (!cwd.startsWith(wtDir)) return false;
  const branch = nativeGetCurrentBranch(cwd);
  return branch.startsWith("milestone/");
}

/**
 * Get the filesystem path for an auto-worktree, or null if it doesn't exist
 * or is not a valid git worktree.
 *
 * Validates that the path is a real git worktree (has a .git file with a
 * gitdir: pointer) rather than just a stray directory. This prevents
 * mis-detection of leftover directories as active worktrees (#695).
 */
export function getAutoWorktreePath(
  basePath: string,
  milestoneId: string,
): string | null {
  const p = worktreePath(basePath, milestoneId);
  if (!existsSync(p)) return null;

  // Validate this is a real git worktree, not a stray directory.
  // A git worktree has a .git *file* (not directory) containing "gitdir: <path>".
  const gitPath = join(p, ".git");
  if (!existsSync(gitPath)) return null;
  try {
    const content = readFileSync(gitPath, "utf8").trim();
    if (!content.startsWith("gitdir: ")) return null;
  } catch (e) {
    logWarning("worktree", `getAutoWorktreePath .git read failed: ${(e as Error).message}`);
    return null;
  }

  return p;
}

/**
 * Enter an existing auto-worktree (chdir into it, store originalBase).
 * Use for resume -- the worktree already exists from a prior create.
 *
 * Atomic: chdir + originalBase update in same try block.
 */
export function enterAutoWorktree(
  basePath: string,
  milestoneId: string,
): string {
  const p = worktreePath(basePath, milestoneId);
  if (!existsSync(p)) {
    throw new GSDError(
      GSD_IO_ERROR,
      `Auto-worktree for ${milestoneId} does not exist at ${p}`,
    );
  }

  // Validate this is a real git worktree, not a stray directory (#695)
  const gitPath = join(p, ".git");
  if (!existsSync(gitPath)) {
    throw new GSDError(
      GSD_GIT_ERROR,
      `Auto-worktree path ${p} exists but is not a git worktree (no .git)`,
    );
  }
  try {
    const content = readFileSync(gitPath, "utf8").trim();
    if (!content.startsWith("gitdir: ")) {
      throw new GSDError(
        GSD_GIT_ERROR,
        `Auto-worktree path ${p} has a .git but it is not a worktree gitdir pointer`,
      );
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes("worktree")) throw err;
    throw new GSDError(
      GSD_IO_ERROR,
      `Auto-worktree path ${p} exists but .git is unreadable`,
    );
  }

  const previousCwd = process.cwd();

  try {
    process.chdir(p);
    originalBase = basePath;
  } catch (err) {
    throw new GSDError(
      GSD_IO_ERROR,
      `Failed to enter auto-worktree at ${p}: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  nudgeGitBranchCache(previousCwd);
  return p;
}

/**
 * Get the original project root stored when entering an auto-worktree.
 * Returns null if not currently in an auto-worktree.
 */
export function getAutoWorktreeOriginalBase(): string | null {
  return originalBase;
}

export function getActiveAutoWorktreeContext(): {
  originalBase: string;
  worktreeName: string;
  branch: string;
} | null {
  if (!originalBase) return null;
  const cwd = process.cwd();
  const resolvedBase = existsSync(originalBase)
    ? realpathSync(originalBase)
    : originalBase;
  const wtDir = join(resolvedBase, ".gsd", "worktrees");
  if (!cwd.startsWith(wtDir)) return null;
  const worktreeName = detectWorktreeName(cwd);
  if (!worktreeName) return null;
  const branch = nativeGetCurrentBranch(cwd);
  if (!branch.startsWith("milestone/")) return null;
  return {
    originalBase,
    worktreeName,
    branch,
  };
}

// ─── Merge Milestone -> Main ───────────────────────────────────────────────

/**
 * Auto-commit any dirty (uncommitted) state in the given directory.
 * Returns true if a commit was made, false if working tree was clean.
 */
function autoCommitDirtyState(cwd: string): boolean {
  try {
    const status = nativeWorkingTreeStatus(cwd);
    if (!status) return false;
    nativeAddAllWithExclusions(cwd, RUNTIME_EXCLUSION_PATHS);
    const result = nativeCommit(
      cwd,
      "chore: auto-commit before milestone merge",
    );
    return result !== null;
  } catch (e) {
    debugLog("autoCommitDirtyState", { error: String(e) });
    return false;
  }
}

/**
 * Squash-merge the milestone branch into main with a rich commit message
 * listing all completed slices, then tear down the worktree.
 *
 * Sequence:
 *  1. Auto-commit dirty worktree state
 *  2. chdir to originalBasePath
 *  3. git checkout main
 *  4. git merge --squash milestone/<MID>
 *  5. git commit with rich message
 *  6. Auto-push if enabled
 *  7. Delete milestone branch
 *  8. Remove worktree directory
 *  9. Clear originalBase
 *
 * On merge conflict: throws MergeConflictError.
 * On "nothing to commit" after squash: safe only if milestone work is already
 * on the integration branch.  Throws if unanchored code changes would be lost.
 */
export function mergeMilestoneToMain(
  originalBasePath_: string,
  milestoneId: string,
  roadmapContent: string,
): { commitMessage: string; pushed: boolean; prCreated: boolean; codeFilesChanged: boolean } {
  const worktreeCwd = process.cwd();
  const milestoneBranch = autoWorktreeBranch(milestoneId);

  // 1. Auto-commit dirty state before leaving.
  //    Guard: when we entered through an auto-worktree (originalBase is set),
  //    only auto-commit when cwd is on the milestone branch. In parallel mode,
  //    cwd may be on the integration branch after a prior merge's
  //    MergeConflictError left cwd unrestored. Auto-committing on the
  //    integration branch captures dirty files from OTHER milestones under a
  //    misleading commit message, contaminating the main branch (#2929).
  //
  //    When originalBase is null (branch mode, no worktree), autoCommitDirtyState
  //    runs unconditionally — the caller is responsible for cwd placement.
  {
    let shouldAutoCommit = true;
    if (originalBase !== null) {
      try {
        const currentBranch = nativeGetCurrentBranch(worktreeCwd);
        shouldAutoCommit = currentBranch === milestoneBranch;
      } catch {
        // If we can't determine the branch, skip the auto-commit to be safe
        shouldAutoCommit = false;
      }
    }
    if (shouldAutoCommit) {
      autoCommitDirtyState(worktreeCwd);
    }
  }

  // Reconcile worktree DB into main DB before leaving worktree context.
  // Skip when both paths resolve to the same physical file (shared WAL /
  // symlink layout) — ATTACHing a WAL-mode file to itself corrupts the
  // database (#2823).
  if (isDbAvailable()) {
    try {
      const worktreeDbPath = join(worktreeCwd, ".gsd", "gsd.db");
      const mainDbPath = join(originalBasePath_, ".gsd", "gsd.db");
      if (!isSamePath(worktreeDbPath, mainDbPath)) {
        reconcileWorktreeDb(mainDbPath, worktreeDbPath);
      }
    } catch (err) {
      /* non-fatal */
      logError("worktree", `DB reconciliation failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // 2. Get completed slices for commit message
  let completedSlices: { id: string; title: string }[] = [];
  if (isDbAvailable()) {
    completedSlices = getMilestoneSlices(milestoneId)
      .filter(s => s.status === "complete")
      .map(s => ({ id: s.id, title: s.title }));
  }
  // Fallback: parse roadmap content when DB is unavailable
  if (completedSlices.length === 0 && roadmapContent) {
    const sliceRe = /- \[x\] \*\*(\w+):\s*(.+?)\*\*/gi;
    let m: RegExpExecArray | null;
    while ((m = sliceRe.exec(roadmapContent)) !== null) {
      completedSlices.push({ id: m[1], title: m[2] });
    }
  }

  // 3. chdir to original base
  const previousCwd = process.cwd();
  process.chdir(originalBasePath_);

  // 4. Resolve integration branch — prefer milestone metadata, then preferences,
  //    then auto-detect (origin/HEAD → main → master → current). Never hardcode
  //    "main": repos using "master" or a custom default branch would fail at
  //    checkout and leave the user with a broken merge state (#1668).
  const prefs = loadEffectiveGSDPreferences()?.preferences?.git ?? {};
  const integrationBranch = readIntegrationBranch(
    originalBasePath_,
    milestoneId,
  );
  // Validate prefs.main_branch exists before using it — a stale preference
  // (e.g. "master" when repo uses "main") causes merge failure (#3589).
  const validatedPrefBranch = prefs.main_branch && nativeBranchExists(originalBasePath_, prefs.main_branch)
    ? prefs.main_branch
    : undefined;
  const mainBranch =
    integrationBranch ?? validatedPrefBranch ?? nativeDetectMainBranch(originalBasePath_);

  // Remove transient project-root state files before any branch or merge
  // operation. Untracked milestone metadata can otherwise block squash merges.
  clearProjectRootStateFiles(originalBasePath_, milestoneId);

  // 5. Checkout integration branch (skip if already current — avoids git error
  //    when main is already checked out in the project-root worktree, #757)
  const currentBranchAtBase = nativeGetCurrentBranch(originalBasePath_);
  if (currentBranchAtBase !== mainBranch) {
    nativeCheckoutBranch(originalBasePath_, mainBranch);
  }

  // 6. Build rich commit message
  const dbMilestone = getMilestone(milestoneId);
  let milestoneTitle =
    (dbMilestone?.title ?? "").replace(/^M\d+:\s*/, "").trim();
  // Fallback: parse title from roadmap content header (e.g. "# M020: Backend foundation")
  if (!milestoneTitle && roadmapContent) {
    const titleMatch = roadmapContent.match(new RegExp(`^#\\s+${milestoneId}:\\s*(.+)`, "m"));
    if (titleMatch) milestoneTitle = titleMatch[1].trim();
  }
  milestoneTitle = milestoneTitle || milestoneId;
  const subject = `feat: ${milestoneTitle}`;
  let body = "";
  if (completedSlices.length > 0) {
    const sliceLines = completedSlices
      .map((s) => `- ${s.id}: ${s.title}`)
      .join("\n");
    body = `\n\nCompleted slices:\n${sliceLines}\n\nGSD-Milestone: ${milestoneId}\nBranch: ${milestoneBranch}`;
  } else {
    body = `\n\nGSD-Milestone: ${milestoneId}\nBranch: ${milestoneBranch}`;
  }
  const commitMessage = subject + body;

  // 6b. Reconcile worktree HEAD with milestone branch ref (#1846).
  //     When the worktree HEAD detaches and advances past the named branch,
  //     the branch ref becomes stale. Squash-merging the stale ref silently
  //     orphans all commits between the branch ref and the actual worktree HEAD.
  //     Fix: fast-forward the branch ref to the worktree HEAD before merging.
  //     Only applies when merging from an actual worktree (worktreeCwd differs
  //     from originalBasePath_).
  if (worktreeCwd !== originalBasePath_) {
    try {
      const worktreeHead = execFileSync("git", ["rev-parse", "HEAD"], {
        cwd: worktreeCwd,
        stdio: ["ignore", "pipe", "pipe"],
        encoding: "utf-8",
      }).trim();
      const branchHead = execFileSync("git", ["rev-parse", milestoneBranch], {
        cwd: originalBasePath_,
        stdio: ["ignore", "pipe", "pipe"],
        encoding: "utf-8",
      }).trim();

      if (worktreeHead && branchHead && worktreeHead !== branchHead) {
        if (nativeIsAncestor(originalBasePath_, branchHead, worktreeHead)) {
          // Worktree HEAD is strictly ahead — fast-forward the branch ref
          nativeUpdateRef(
            originalBasePath_,
            `refs/heads/${milestoneBranch}`,
            worktreeHead,
          );
          debugLog("mergeMilestoneToMain", {
            action: "fast-forward-branch-ref",
            milestoneBranch,
            oldRef: branchHead.slice(0, 8),
            newRef: worktreeHead.slice(0, 8),
          });
        } else {
          // Diverged — fail loudly rather than silently losing commits
          process.chdir(previousCwd);
          throw new GSDError(
            GSD_GIT_ERROR,
            `Worktree HEAD (${worktreeHead.slice(0, 8)}) diverged from ` +
              `${milestoneBranch} (${branchHead.slice(0, 8)}). ` +
              `Manual reconciliation required before merge.`,
          );
        }
      }
    } catch (err) {
      // Re-throw GSDError (divergence); swallow rev-parse failures
      // (e.g. worktree dir already removed by external cleanup)
      if (err instanceof GSDError) throw err;
      debugLog("mergeMilestoneToMain", {
        action: "reconcile-skipped",
        reason: String(err),
      });
    }
  }

  // 7. Stash any pre-existing dirty files so the squash merge is not
  //    blocked by unrelated local changes (#2151).  clearProjectRootStateFiles
  //    only removes untracked .gsd/ files; tracked dirty files elsewhere (e.g.
  //    .planning/work-state.json with stash conflict markers) are invisible to
  //    that cleanup but will cause `git merge --squash` to reject.
  let stashed = false;
  try {
    const status = execFileSync("git", ["status", "--porcelain"], {
      cwd: originalBasePath_,
      stdio: ["ignore", "pipe", "pipe"],
      encoding: "utf-8",
    }).trim();
    if (status) {
      // Use --include-untracked to stash untracked files that would block
      // the squash merge, but EXCLUDE .gsd/milestones/ (#2505).
      // --include-untracked without exclusion sweeps queued milestone
      // CONTEXT files into the stash. If stash pop later fails, those files
      // are permanently trapped in the stash entry and lost on the next
      // stash push or drop.
      execFileSync(
        "git",
        [
          "stash", "push", "--include-untracked",
          "-m", `gsd: pre-merge stash for ${milestoneId}`,
          "--", ":(exclude).gsd/milestones",
        ],
        { cwd: originalBasePath_, stdio: ["ignore", "pipe", "pipe"], encoding: "utf-8" },
      );
      stashed = true;
    }
  } catch (err) {
    // Stash failure is non-fatal — proceed without stash and let the merge
    // report the dirty tree if it fails.
    logWarning("worktree", `git stash failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  // 7a. Shelter queued milestone directories before the squash merge (#2505).
  // The milestone branch may contain copies of queued milestone dirs (via
  // planning artifacts), so `git merge --squash` rejects when those same
  // files exist as untracked in the working tree. Temporarily move them to
  // a backup location, then restore after the merge+commit.
  const milestonesDir = join(gsdRoot(originalBasePath_), "milestones");
  const shelterDir = join(gsdRoot(originalBasePath_), ".milestone-shelter");
  const shelteredDirs: string[] = [];

  // Helper: restore sheltered milestone directories (#2505).
  // Called on both success and error paths to ensure queued CONTEXT files
  // are never permanently lost.
  const restoreShelter = (): void => {
    if (shelteredDirs.length === 0) return;
    for (const dirName of shelteredDirs) {
      try {
        mkdirSync(milestonesDir, { recursive: true });
        cpSync(join(shelterDir, dirName), join(milestonesDir, dirName), { recursive: true, force: true });
      } catch (err) { /* best-effort */
        logError("worktree", `shelter restore failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    try { rmSync(shelterDir, { recursive: true, force: true }); } catch (err) { /* best-effort */
      logWarning("worktree", `shelter cleanup failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  try {
    if (existsSync(milestonesDir)) {
      const entries = readdirSync(milestonesDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        // Only shelter directories that do NOT belong to the milestone being merged
        if (entry.name === milestoneId) continue;
        const srcDir = join(milestonesDir, entry.name);
        const dstDir = join(shelterDir, entry.name);
        try {
          mkdirSync(shelterDir, { recursive: true });
          cpSync(srcDir, dstDir, { recursive: true, force: true });
          rmSync(srcDir, { recursive: true, force: true });
          shelteredDirs.push(entry.name);
        } catch (err) {
          // Non-fatal — if shelter fails, the merge may still succeed
          logWarning("worktree", `milestone shelter failed (${entry.name}): ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    }
  } catch (err) {
    // Non-fatal — proceed with merge; untracked files may block it
    logWarning("worktree", `milestone shelter operation failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  // 7b. Clean up stale merge state before attempting squash merge (#2912).
  // A leftover MERGE_HEAD (from a previous failed merge, libgit2 native path,
  // or interrupted operation) causes `git merge --squash` to refuse with
  // "fatal: You have not concluded your merge (MERGE_HEAD exists)".
  // Defensively remove merge artifacts before starting.
  try {
    const gitDir_ = resolveGitDir(originalBasePath_);
    for (const f of ["SQUASH_MSG", "MERGE_MSG", "MERGE_HEAD"]) {
      const p = join(gitDir_, f);
      if (existsSync(p)) unlinkSync(p);
    }
  } catch (err) { /* best-effort */
    logError("worktree", `merge state cleanup failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  // 8. Squash merge — auto-resolve .gsd/ state file conflicts (#530)
  const mergeResult = nativeMergeSquash(originalBasePath_, milestoneBranch);

  if (!mergeResult.success) {
    // Dirty working tree — the merge was rejected before it started (e.g.
    // untracked .gsd/ files left by prior sync).  Preserve the
    // milestone branch so commits are not lost.
    if (mergeResult.conflicts.includes("__dirty_working_tree__")) {
      // Defensively clean merge state — the native path may leave MERGE_HEAD
      // even when the merge is rejected (#2912).
      try {
        const gitDir_ = resolveGitDir(originalBasePath_);
        for (const f of ["SQUASH_MSG", "MERGE_MSG", "MERGE_HEAD"]) {
          const p = join(gitDir_, f);
          if (existsSync(p)) unlinkSync(p);
        }
      } catch (err) { /* best-effort */
        logError("worktree", `merge state cleanup failed: ${err instanceof Error ? err.message : String(err)}`);
      }

      // Pop stash before throwing so local work is not lost.
      if (stashed) {
        try {
          execFileSync("git", ["stash", "pop"], {
            cwd: originalBasePath_,
            stdio: ["ignore", "pipe", "pipe"],
            encoding: "utf-8",
          });
        } catch (err) { /* stash pop conflict is non-fatal */
          logWarning("worktree", `git stash pop failed: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
      restoreShelter();
      // Restore cwd so the caller is not stranded on the integration branch
      process.chdir(previousCwd);
      // Surface the actual dirty filenames from git stderr instead of
      // generically blaming .gsd/ (#2151).
      const fileList = mergeResult.dirtyFiles?.length
        ? `Dirty files:\n${mergeResult.dirtyFiles.map((f) => `  ${f}`).join("\n")}`
        : `Check \`git status\` in the project root for details.`;
      throw new GSDError(
        GSD_GIT_ERROR,
        `Squash merge of ${milestoneBranch} rejected: working tree has dirty or untracked files ` +
          `that conflict with the merge. ${fileList}`,
      );
    }

    // Check for conflicts — use merge result first, fall back to nativeConflictFiles
    const conflictedFiles =
      mergeResult.conflicts.length > 0
        ? mergeResult.conflicts
        : nativeConflictFiles(originalBasePath_);

    if (conflictedFiles.length > 0) {
      // Separate auto-resolvable conflicts (GSD state files + build artifacts)
      // from real code conflicts. GSD state files diverge between branches
      // during normal operation. Build artifacts are machine-generated and
      // regenerable. Both are safe to accept from the milestone branch.
      const autoResolvable = conflictedFiles.filter(isSafeToAutoResolve);
      const codeConflicts = conflictedFiles.filter(
        (f) => !isSafeToAutoResolve(f),
      );

      // Auto-resolve safe conflicts by accepting the milestone branch version
      if (autoResolvable.length > 0) {
        for (const safeFile of autoResolvable) {
          try {
            nativeCheckoutTheirs(originalBasePath_, [safeFile]);
            nativeAddPaths(originalBasePath_, [safeFile]);
          } catch (e) {
            // If checkout --theirs fails, try removing the file from the merge
            // (it's a runtime file that shouldn't be committed anyway)
            logWarning("worktree", `checkout --theirs failed for ${safeFile}, removing: ${(e as Error).message}`);
            nativeRmForce(originalBasePath_, [safeFile]);
          }
        }
      }

      // If there are still real code conflicts, escalate
      if (codeConflicts.length > 0) {
        // Abort merge state so MERGE_HEAD is not left on disk (#2912).
        // libgit2's merge creates MERGE_HEAD even for squash merges; if left
        // dangling, subsequent merges fail and doctor reports corrupt state.
        try { nativeMergeAbort(originalBasePath_); } catch (err) { /* best-effort */
          logError("worktree", `git merge-abort failed: ${err instanceof Error ? err.message : String(err)}`);
        }
        try {
          const gitDir_ = resolveGitDir(originalBasePath_);
          for (const f of ["SQUASH_MSG", "MERGE_MSG", "MERGE_HEAD"]) {
            const p = join(gitDir_, f);
            if (existsSync(p)) unlinkSync(p);
          }
        } catch (err) { /* best-effort */
          logError("worktree", `merge state file cleanup failed: ${err instanceof Error ? err.message : String(err)}`);
        }

        // Pop stash before throwing so local work is not lost (#2151).
        if (stashed) {
          try {
            execFileSync("git", ["stash", "pop"], {
              cwd: originalBasePath_,
              stdio: ["ignore", "pipe", "pipe"],
              encoding: "utf-8",
            });
          } catch (err) { /* stash pop conflict is non-fatal */
            logWarning("worktree", `git stash pop failed: ${err instanceof Error ? err.message : String(err)}`);
          }
        }
        restoreShelter();
        // Restore cwd so the caller is not stranded on the integration branch.
        // Without this, the next mergeMilestoneToMain call in a parallel merge
        // sequence uses process.cwd() (now the project root) as worktreeCwd,
        // causing autoCommitDirtyState to commit unrelated milestone files to
        // the integration branch (#2929).
        process.chdir(previousCwd);
        throw new MergeConflictError(
          codeConflicts,
          "squash",
          milestoneBranch,
          mainBranch,
        );
      }
    }
    // No conflicts detected — possibly "already up to date", fall through to commit
  }

  // 9. Commit (handle nothing-to-commit gracefully)
  const commitResult = nativeCommit(originalBasePath_, commitMessage);
  const nothingToCommit = commitResult === null;

  // 9a. Clean up merge state files left by git merge --squash (#1853, #2912).
  // git only removes SQUASH_MSG when the commit reads it directly (plain
  // `git commit`).  nativeCommit uses `-F -` (stdin) or libgit2, neither
  // of which trigger git's SQUASH_MSG cleanup.  MERGE_HEAD is created by
  // libgit2's merge even in squash mode and is not removed by nativeCommit.
  // If left on disk, doctor reports `corrupt_merge_state` on every subsequent run.
  try {
    const gitDir_ = resolveGitDir(originalBasePath_);
    for (const f of ["SQUASH_MSG", "MERGE_MSG", "MERGE_HEAD"]) {
      const p = join(gitDir_, f);
      if (existsSync(p)) unlinkSync(p);
    }
  } catch (err) { /* best-effort */
    logError("worktree", `post-commit merge state cleanup failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  // 9a-ii. Restore stashed files now that the merge+commit is complete (#2151).
  // Pop after commit so stashed changes do not interfere with the squash merge
  // or the commit content.  Conflict on pop is non-fatal — the stash entry is
  // preserved and the user can resolve manually with `git stash pop`.
  if (stashed) {
    try {
      execFileSync("git", ["stash", "pop"], {
        cwd: originalBasePath_,
        stdio: ["ignore", "pipe", "pipe"],
        encoding: "utf-8",
      });
    } catch (e) {
      logWarning("worktree", `git stash pop failed, attempting conflict resolution: ${(e as Error).message}`);
      // Stash pop after squash merge can conflict on .gsd/ state files that
      // diverged between branches.  Left unresolved, these UU entries block
      // every subsequent merge.  Auto-resolve them the same way we handle
      // .gsd/ conflicts during the merge itself: accept HEAD (the just-committed
      // version) and drop the now-applied stash.
      const uu = nativeConflictFiles(originalBasePath_);
      const gsdUU = uu.filter((f) => f.startsWith(".gsd/"));
      const nonGsdUU = uu.filter((f) => !f.startsWith(".gsd/"));

      if (gsdUU.length > 0) {
        for (const f of gsdUU) {
          try {
            // Accept the committed (HEAD) version of the state file
            execFileSync("git", ["checkout", "HEAD", "--", f], {
              cwd: originalBasePath_,
              stdio: ["ignore", "pipe", "pipe"],
              encoding: "utf-8",
            });
            nativeAddPaths(originalBasePath_, [f]);
          } catch (e) {
            // Last resort: remove the conflicted state file
            logWarning("worktree", `checkout HEAD failed for ${f}, removing: ${(e as Error).message}`);
            nativeRmForce(originalBasePath_, [f]);
          }
        }
      }

      if (nonGsdUU.length === 0) {
        // All conflicts were .gsd/ files — safe to drop the stash
        try {
          execFileSync("git", ["stash", "drop"], {
            cwd: originalBasePath_,
            stdio: ["ignore", "pipe", "pipe"],
            encoding: "utf-8",
          });
        } catch (err) { /* stash may already be consumed */
          logWarning("worktree", `git stash drop failed: ${err instanceof Error ? err.message : String(err)}`);
        }
      } else {
        // Non-.gsd conflicts remain — leave stash for manual resolution
        logWarning("reconcile", "Stash pop conflict on non-.gsd files after merge", {
          files: nonGsdUU.join(", "),
        });
      }
    }
  }

  // 9a-iii. Restore sheltered queued milestone directories (#2505).
  restoreShelter();

  // 9b. Safety check (#1792): if nothing was committed, verify the milestone
  // work is already on the integration branch before allowing teardown.
  // Compare only non-.gsd/ paths — .gsd/ state files diverge normally and
  // are auto-resolved during the squash merge.
  if (nothingToCommit) {
    const numstat = nativeDiffNumstat(
      originalBasePath_,
      mainBranch,
      milestoneBranch,
    );
    const codeChanges = numstat.filter(
      (entry) => !entry.path.startsWith(".gsd/"),
    );
    if (codeChanges.length > 0) {
      // Milestone has unanchored code changes — abort teardown.
      process.chdir(previousCwd);
      throw new GSDError(
        GSD_GIT_ERROR,
        `Squash merge produced nothing to commit but milestone branch "${milestoneBranch}" ` +
          `has ${codeChanges.length} code file(s) not on "${mainBranch}". ` +
          `Aborting worktree teardown to prevent data loss.`,
      );
    }
  }

  // 9c. Detect whether any non-.gsd/ code files were actually merged (#1906).
  // When a milestone only produced .gsd/ metadata (summaries, roadmaps) but no
  // real code, the user sees "milestone complete" but nothing changed in their
  // codebase. Surface this so the caller can warn the user.
  let codeFilesChanged = false;
  if (!nothingToCommit) {
    try {
      const mergedFiles = nativeDiffNumstat(
        originalBasePath_,
        "HEAD~1",
        "HEAD",
      );
      codeFilesChanged = mergedFiles.some(
        (entry) => !entry.path.startsWith(".gsd/"),
      );
    } catch (e) {
      // If HEAD~1 doesn't exist (first commit), assume code was changed
      logWarning("worktree", `diff numstat failed (assuming code changed): ${(e as Error).message}`);
      codeFilesChanged = true;
    }
  }

  // 10. Auto-push if enabled
  let pushed = false;
  if (prefs.auto_push === true && !nothingToCommit) {
    const remote = prefs.remote ?? "origin";
    try {
      execFileSync("git", ["push", remote, mainBranch], {
        cwd: originalBasePath_,
        stdio: ["ignore", "pipe", "pipe"],
        encoding: "utf-8",
      });
      pushed = true;
    } catch (err) {
      // Push failure is non-fatal
      logWarning("worktree", `git push failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // 9b. Auto-create PR if enabled (#2302: no longer gated on pushed/auto_push)
  let prCreated = false;
  if (prefs.auto_pr === true && !nothingToCommit) {
    const remote = prefs.remote ?? "origin";
    const prTarget = prefs.pr_target_branch ?? mainBranch;
    try {
      // Push the milestone branch to remote first
      execFileSync("git", ["push", remote, milestoneBranch], {
        cwd: originalBasePath_,
        stdio: ["ignore", "pipe", "pipe"],
        encoding: "utf-8",
      });
      // Create PR via gh CLI with explicit --head and --base (#2302)
      execFileSync("gh", [
        "pr", "create", "--draft",
        "--base", prTarget,
        "--head", milestoneBranch,
        "--title", `Milestone ${milestoneId} complete`,
        "--body", "Auto-created by GSD on milestone completion.",
      ], {
        cwd: originalBasePath_,
        stdio: ["ignore", "pipe", "pipe"],
        encoding: "utf-8",
      });
      prCreated = true;
    } catch (err) {
      // PR creation failure is non-fatal — gh may not be installed or authenticated
      logWarning("worktree", `PR creation failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // 11. Guard removed — step 9b (#1792) now handles this with a smarter check:
  //     throws only when the milestone has unanchored code changes, passes
  //     through when the code is genuinely already on the integration branch.

  // 11a. Pre-teardown safety net (#1853): if the worktree still has uncommitted
  // changes (e.g. nativeHasChanges cache returned stale false, or auto-commit
  // silently failed), force one final commit so code is not destroyed by
  // `git worktree remove --force`.
  //
  // Guard: only run when worktreeCwd is on the milestone branch (#2929).
  // In parallel mode or branch-mode merges, worktreeCwd may be the project
  // root on the integration branch. Committing dirty state there would
  // capture unrelated files from other milestones.
  if (existsSync(worktreeCwd)) {
    let preTeardownBranch: string | null = null;
    try {
      preTeardownBranch = nativeGetCurrentBranch(worktreeCwd);
    } catch (err) {
      debugLog("mergeMilestoneToMain", { phase: "pre-teardown-branch-detect-failed", error: String(err) });
    }
    const isOnMilestoneBranch = preTeardownBranch === milestoneBranch;

    if (isOnMilestoneBranch) {
      try {
        const dirtyCheck = nativeWorkingTreeStatus(worktreeCwd);
        if (dirtyCheck) {
          debugLog("mergeMilestoneToMain", {
            phase: "pre-teardown-dirty",
            worktreeCwd,
            status: dirtyCheck.slice(0, 200),
          });
          nativeAddAllWithExclusions(worktreeCwd, RUNTIME_EXCLUSION_PATHS);
          nativeCommit(worktreeCwd, "chore: pre-teardown auto-commit of uncommitted worktree changes");
        }
      } catch (e) {
        debugLog("mergeMilestoneToMain", {
          phase: "pre-teardown-commit-error",
          error: String(e),
        });
      }
    }
  }

  // 12. Remove worktree directory first (must happen before branch deletion)
  try {
    removeWorktree(originalBasePath_, milestoneId, {
      branch: null as unknown as string,
      deleteBranch: false,
    });
  } catch (err) {
    // Best-effort -- worktree dir may already be gone
    logWarning("worktree", `worktree removal failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  // 13. Delete milestone branch (after worktree removal so ref is unlocked)
  try {
    nativeBranchDelete(originalBasePath_, milestoneBranch);
  } catch (err) {
    // Best-effort
    logWarning("worktree", `git branch-delete failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  // 14. Clear module state
  originalBase = null;
  nudgeGitBranchCache(previousCwd);

  return { commitMessage, pushed, prCreated, codeFilesChanged };
}

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
 * Remove leftover merge artifacts (SQUASH_MSG, MERGE_MSG, MERGE_HEAD) from
 * the .git directory. Best-effort — failures are logged, not thrown.
 */
function cleanupMergeStateFiles(basePath: string, label: string): void {
  try {
    const gitDir_ = resolveGitDir(basePath);
    for (const f of ["SQUASH_MSG", "MERGE_MSG", "MERGE_HEAD"]) {
      const p = join(gitDir_, f);
      if (existsSync(p)) unlinkSync(p);
    }
  } catch (err) {
    logError("worktree", `${label}: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * Squash-merge the milestone branch into main with a rich commit message
 * listing all completed slices, then tear down the worktree.
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

  // 1. Auto-commit dirty state (only when on milestone branch to avoid
  //    capturing unrelated files in parallel mode, #2929).
  {
    let shouldAutoCommit = true;
    if (originalBase !== null) {
      try {
        shouldAutoCommit = nativeGetCurrentBranch(worktreeCwd) === milestoneBranch;
      } catch { shouldAutoCommit = false; }
    }
    if (shouldAutoCommit) autoCommitDirtyState(worktreeCwd);
  }

  // Reconcile worktree DB into main DB (skip if same physical file, #2823).
  if (isDbAvailable()) {
    try {
      const worktreeDbPath = join(worktreeCwd, ".gsd", "gsd.db");
      const mainDbPath = join(originalBasePath_, ".gsd", "gsd.db");
      if (!isSamePath(worktreeDbPath, mainDbPath)) {
        reconcileWorktreeDb(mainDbPath, worktreeDbPath);
      }
    } catch (err) {
      logError("worktree", `DB reconciliation failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // 2. Gather completed slices for commit message (DB first, roadmap fallback).
  let completedSlices: { id: string; title: string }[] = [];
  if (isDbAvailable()) {
    completedSlices = getMilestoneSlices(milestoneId)
      .filter(s => s.status === "complete")
      .map(s => ({ id: s.id, title: s.title }));
  }
  if (completedSlices.length === 0 && roadmapContent) {
    const sliceRe = /- \[x\] \*\*(\w+):\s*(.+?)\*\*/gi;
    let m: RegExpExecArray | null;
    while ((m = sliceRe.exec(roadmapContent)) !== null) {
      completedSlices.push({ id: m[1], title: m[2] });
    }
  }

  // 3. Switch to original base.
  const previousCwd = process.cwd();
  process.chdir(originalBasePath_);

  // 4. Resolve integration branch (metadata > prefs > auto-detect, #1668).
  const prefs = loadEffectiveGSDPreferences()?.preferences?.git ?? {};
  const integrationBranch = readIntegrationBranch(originalBasePath_, milestoneId);
  const validatedPrefBranch = prefs.main_branch && nativeBranchExists(originalBasePath_, prefs.main_branch)
    ? prefs.main_branch
    : undefined;
  const mainBranch =
    integrationBranch ?? validatedPrefBranch ?? nativeDetectMainBranch(originalBasePath_);

  clearProjectRootStateFiles(originalBasePath_, milestoneId);

  // 5. Checkout integration branch (skip if already current, #757).
  if (nativeGetCurrentBranch(originalBasePath_) !== mainBranch) {
    nativeCheckoutBranch(originalBasePath_, mainBranch);
  }

  // 6. Build rich commit message.
  const dbMilestone = getMilestone(milestoneId);
  let milestoneTitle = (dbMilestone?.title ?? "").replace(/^M\d+:\s*/, "").trim();
  if (!milestoneTitle && roadmapContent) {
    const titleMatch = roadmapContent.match(new RegExp(`^#\\s+${milestoneId}:\\s*(.+)`, "m"));
    if (titleMatch) milestoneTitle = titleMatch[1].trim();
  }
  milestoneTitle = milestoneTitle || milestoneId;
  const sliceLines = completedSlices.map((s) => `- ${s.id}: ${s.title}`).join("\n");
  const commitMessage = `feat: ${milestoneTitle}` +
    (completedSlices.length > 0
      ? `\n\nCompleted slices:\n${sliceLines}\n\nGSD-Milestone: ${milestoneId}\nBranch: ${milestoneBranch}`
      : `\n\nGSD-Milestone: ${milestoneId}\nBranch: ${milestoneBranch}`);

  // 6b. Fast-forward stale branch ref to worktree HEAD (#1846).
  if (worktreeCwd !== originalBasePath_) {
    try {
      const worktreeHead = execFileSync("git", ["rev-parse", "HEAD"], {
        cwd: worktreeCwd, stdio: ["ignore", "pipe", "pipe"], encoding: "utf-8",
      }).trim();
      const branchHead = execFileSync("git", ["rev-parse", milestoneBranch], {
        cwd: originalBasePath_, stdio: ["ignore", "pipe", "pipe"], encoding: "utf-8",
      }).trim();
      if (worktreeHead && branchHead && worktreeHead !== branchHead) {
        if (nativeIsAncestor(originalBasePath_, branchHead, worktreeHead)) {
          nativeUpdateRef(originalBasePath_, `refs/heads/${milestoneBranch}`, worktreeHead);
        } else {
          process.chdir(previousCwd);
          throw new GSDError(GSD_GIT_ERROR,
            `Worktree HEAD (${worktreeHead.slice(0, 8)}) diverged from ${milestoneBranch} (${branchHead.slice(0, 8)}). ` +
            `Manual reconciliation required before merge.`);
        }
      }
    } catch (err) {
      if (err instanceof GSDError) throw err;
    }
  }

  // 7. Clean stale merge state before squash merge (#2912).
  cleanupMergeStateFiles(originalBasePath_, "pre-merge cleanup");

  // 8. Squash merge.
  const mergeResult = nativeMergeSquash(originalBasePath_, milestoneBranch);

  if (!mergeResult.success) {
    // Dirty working tree — merge rejected before it started.
    if (mergeResult.conflicts.includes("__dirty_working_tree__")) {
      cleanupMergeStateFiles(originalBasePath_, "dirty-tree cleanup");
      process.chdir(previousCwd);
      const fileList = mergeResult.dirtyFiles?.length
        ? `Dirty files:\n${mergeResult.dirtyFiles.map((f) => `  ${f}`).join("\n")}`
        : `Check \`git status\` in the project root for details.`;
      throw new GSDError(GSD_GIT_ERROR,
        `Squash merge of ${milestoneBranch} rejected: working tree has dirty or untracked files that conflict with the merge. ${fileList}`);
    }

    const conflictedFiles = mergeResult.conflicts.length > 0
      ? mergeResult.conflicts
      : nativeConflictFiles(originalBasePath_);

    if (conflictedFiles.length > 0) {
      try { nativeMergeAbort(originalBasePath_); } catch (err) { /* best-effort */
        logError("worktree", `git merge-abort failed: ${err instanceof Error ? err.message : String(err)}`);
      }
      cleanupMergeStateFiles(originalBasePath_, "conflict cleanup");
      process.chdir(previousCwd);
      throw new MergeConflictError(conflictedFiles, "squash", milestoneBranch, mainBranch);
    }
  }

  // 9. Commit (nothing-to-commit handled gracefully).
  const commitResult = nativeCommit(originalBasePath_, commitMessage);
  const nothingToCommit = commitResult === null;

  // 9a. Clean merge state files left by squash merge (#1853, #2912).
  cleanupMergeStateFiles(originalBasePath_, "post-commit cleanup");

  // 9b. If nothing committed, verify milestone work is already on integration branch (#1792).
  if (nothingToCommit) {
    const codeChanges = nativeDiffNumstat(originalBasePath_, mainBranch, milestoneBranch)
      .filter((entry) => !entry.path.startsWith(".gsd/"));
    if (codeChanges.length > 0) {
      process.chdir(previousCwd);
      throw new GSDError(GSD_GIT_ERROR,
        `Squash merge produced nothing to commit but "${milestoneBranch}" has ${codeChanges.length} ` +
        `code file(s) not on "${mainBranch}". Aborting worktree teardown to prevent data loss.`);
    }
  }

  // 9c. Detect whether non-.gsd/ code files were actually merged (#1906).
  let codeFilesChanged = false;
  if (!nothingToCommit) {
    try {
      codeFilesChanged = nativeDiffNumstat(originalBasePath_, "HEAD~1", "HEAD")
        .some((entry) => !entry.path.startsWith(".gsd/"));
    } catch {
      codeFilesChanged = true; // HEAD~1 may not exist (first commit)
    }
  }

  // 10. Auto-push and auto-PR (non-fatal on failure).
  const remote = prefs.remote ?? "origin";
  let pushed = false;
  let prCreated = false;
  if (!nothingToCommit) {
    if (prefs.auto_push === true) {
      try {
        execFileSync("git", ["push", remote, mainBranch], {
          cwd: originalBasePath_, stdio: ["ignore", "pipe", "pipe"], encoding: "utf-8",
        });
        pushed = true;
      } catch (err) {
        logWarning("worktree", `git push failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    if (prefs.auto_pr === true) {
      try {
        execFileSync("git", ["push", remote, milestoneBranch], {
          cwd: originalBasePath_, stdio: ["ignore", "pipe", "pipe"], encoding: "utf-8",
        });
        execFileSync("gh", ["pr", "create", "--draft",
          "--base", prefs.pr_target_branch ?? mainBranch,
          "--head", milestoneBranch,
          "--title", `Milestone ${milestoneId} complete`,
          "--body", "Auto-created by GSD on milestone completion.",
        ], { cwd: originalBasePath_, stdio: ["ignore", "pipe", "pipe"], encoding: "utf-8" });
        prCreated = true;
      } catch (err) {
        logWarning("worktree", `PR creation failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  // 11. Pre-teardown safety net: force-commit any remaining uncommitted
  //     worktree changes so code is not destroyed by worktree removal (#1853).
  //     Only runs when on the milestone branch (#2929).
  if (existsSync(worktreeCwd)) {
    let preTeardownBranch: string | null = null;
    try { preTeardownBranch = nativeGetCurrentBranch(worktreeCwd); } catch { /* skip */ }
    if (preTeardownBranch === milestoneBranch) {
      try {
        if (nativeWorkingTreeStatus(worktreeCwd)) {
          nativeAddAllWithExclusions(worktreeCwd, RUNTIME_EXCLUSION_PATHS);
          nativeCommit(worktreeCwd, "chore: pre-teardown auto-commit of uncommitted worktree changes");
        }
      } catch { /* best-effort */ }
    }
  }

  // 12-13. Remove worktree directory and delete milestone branch.
  try {
    removeWorktree(originalBasePath_, milestoneId, { branch: null as unknown as string, deleteBranch: false });
  } catch (err) {
    logWarning("worktree", `worktree removal failed: ${err instanceof Error ? err.message : String(err)}`);
  }
  try { nativeBranchDelete(originalBasePath_, milestoneBranch); } catch (err) {
    logWarning("worktree", `git branch-delete failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  // 14. Clear module state.
  originalBase = null;
  nudgeGitBranchCache(previousCwd);

  return { commitMessage, pushed, prCreated, codeFilesChanged };
}

/**
 * uat-stuck-loop-orphaned-worktree.test.ts — Regression tests for #2821.
 *
 * Reproduces the orphaned worktree bug:
 *
 * Bug 2 — Orphaned worktree: removeWorktree silently swallows failures when
 *   git worktree remove fails (untracked files, CWD inside worktree, etc.).
 *   The worktree directory and branch persist on disk after teardown.
 *   teardownAutoWorktree has a fallback rmSync but it also fails when the
 *   git internal .git/worktrees/<name> directory holds a lock.
 */

import { describe, test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  rmSync,
  existsSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";

import {
  createWorktree,
  removeWorktree,
  worktreePath,
} from "../worktree-manager.ts";

function git(args: string[], cwd: string): string {
  return execFileSync("git", args, {
    cwd,
    stdio: ["ignore", "pipe", "pipe"],
    encoding: "utf-8",
  }).trim();
}

function makeBaseRepo(): string {
  const base = mkdtempSync(join(tmpdir(), "gsd-2821-"));
  git(["init", "-b", "main"], base);
  git(["config", "user.name", "Test"], base);
  git(["config", "user.email", "test@test.com"], base);
  writeFileSync(join(base, "README.md"), "# test\n");
  mkdirSync(join(base, ".gsd", "milestones", "M011"), { recursive: true });
  git(["add", "."], base);
  git(["commit", "-m", "init"], base);
  return base;
}

// ─── Bug 2: Orphaned worktree cleanup ─────────────────────────────────────

describe("#2821 Bug 2 — removeWorktree cleans up despite untracked files", () => {
  let base: string;

  beforeEach(() => {
    base = makeBaseRepo();
  });

  afterEach(() => {
    rmSync(base, { recursive: true, force: true });
  });

  test("removes worktree directory even when it contains untracked files", () => {
    const info = createWorktree(base, "M011", {
      branch: "milestone/M011",
    });

    // Simulate run-uat writing untracked files (S01-UAT-RESULT.md, ASSESSMENT)
    mkdirSync(
      join(info.path, ".gsd", "milestones", "M011", "slices", "S01"),
      { recursive: true },
    );
    writeFileSync(
      join(
        info.path,
        ".gsd",
        "milestones",
        "M011",
        "slices",
        "S01",
        "S01-UAT-RESULT.md",
      ),
      "# UAT Result\nverdict: fail\n",
    );
    writeFileSync(
      join(
        info.path,
        ".gsd",
        "milestones",
        "M011",
        "slices",
        "S01",
        "S01-ASSESSMENT.md",
      ),
      "---\nverdict: fail\n---\n# Assessment\n",
    );

    removeWorktree(base, "M011", {
      branch: "milestone/M011",
      deleteBranch: true,
      force: true,
    });

    const wtDir = worktreePath(base, "M011");
    assert.ok(
      !existsSync(wtDir),
      `Worktree directory should be removed after teardown, but still exists at ${wtDir}`,
    );
  });

  test("removes git internal worktree metadata after filesystem removal", () => {
    createWorktree(base, "M011", {
      branch: "milestone/M011",
    });

    removeWorktree(base, "M011", {
      branch: "milestone/M011",
      deleteBranch: true,
      force: true,
    });

    // The git internal worktree directory should be cleaned up
    const gitInternalWorktreeDir = join(base, ".git", "worktrees", "M011");
    assert.ok(
      !existsSync(gitInternalWorktreeDir),
      `Git internal worktree dir should be removed: ${gitInternalWorktreeDir}`,
    );

    // The branch should be deleted
    const branches = git(["branch"], base);
    assert.ok(
      !branches.includes("milestone/M011"),
      "milestone/M011 branch should be deleted after removeWorktree",
    );
  });
});

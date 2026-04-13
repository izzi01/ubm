/**
 * Auto-mode lifecycle manager.
 *
 * Tracks whether auto-mode is running, which milestone/slice/task is
 * in focus, and how many iterations have completed. All state is
 * in-memory for v1 simplicity — no persistence across restarts.
 *
 * Usage:
 *   const manager = new AutoModeManager();
 *   manager.start("M001");
 *   manager.updateLastDispatch(result);
 *   manager.incrementIteration();
 *   const state = manager.getState();
 *   manager.stop();
 */

import type { DispatchResult } from "./types.js";
import {
  AutoModeStatus,
  AutoModeState,
} from "./types.js";

// ─── AutoModeManager ───────────────────────────────────────────────────────

export class AutoModeManager {
  private state: AutoModeState = freshState();

  /**
   * Start auto-mode for a milestone.
   *
   * Resets iteration counter and sets focus to the given milestone.
   * If already running for the same milestone, this is a no-op.
   * If running for a different milestone, resets to the new one.
   */
  start(milestoneId: string): void {
    if (
      this.state.status === "running" &&
      this.state.milestoneId === milestoneId
    ) {
      // Already running for this milestone — no-op
      return;
    }

    this.state = {
      status: "running",
      milestoneId,
      currentSliceId: null,
      currentTaskId: null,
      iteration: 0,
      startedAt: new Date().toISOString(),
      lastDispatch: null,
    };
  }

  /**
   * Stop auto-mode entirely.
   *
   * Clears all focus state. Next start() begins fresh.
   */
  stop(): void {
    this.state = freshState();
  }

  /**
   * Pause auto-mode.
   *
   * Keeps focus state (milestone, slice, task, iteration) so
   * resume() can pick up where it left off.
   */
  pause(): void {
    if (this.state.status === "running") {
      this.state.status = "paused";
    }
  }

  /**
   * Resume a paused auto-mode.
   *
   * No-op if not paused.
   */
  resume(): void {
    if (this.state.status === "paused") {
      this.state.status = "running";
    }
  }

  /**
   * Get the current auto-mode state snapshot.
   */
  getState(): AutoModeState {
    return { ...this.state };
  }

  /**
   * Update the last dispatch result.
   *
   * Also updates currentSliceId and currentTaskId from the dispatch.
   */
  updateLastDispatch(result: DispatchResult): void {
    this.state.lastDispatch = { ...result };
    this.state.currentSliceId = result.sliceId;
    this.state.currentTaskId = result.taskId;
  }

  /**
   * Increment the iteration counter.
   *
   * Called after each dispatch → execute → complete cycle.
   */
  incrementIteration(): void {
    this.state.iteration++;
  }

  /**
   * Check if auto-mode is currently running.
   */
  isRunning(): boolean {
    return this.state.status === "running";
  }

  /**
   * Reset all state. Useful for test teardown.
   */
  reset(): void {
    this.state = freshState();
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function freshState(): AutoModeState {
  return {
    status: "idle",
    milestoneId: null,
    currentSliceId: null,
    currentTaskId: null,
    iteration: 0,
    startedAt: null,
    lastDispatch: null,
  };
}

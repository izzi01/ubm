import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  type DelegateConfig,
  type SpawnOptions,
  type TaskMetadata,
  BackgroundManager,
  TaskStatus,
} from '../background-manager.js';

describe('background-manager pattern', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('spawns task with RUNNING status and background flag', async () => {
    vi.useFakeTimers();
    const manager = new BackgroundManager();
    const taskId = await manager.spawn({ prompt: 'run task' });

    expect(taskId).toMatch(/^task_/);

    const task = manager.getTask(taskId);
    expect(task?.status).toBe(TaskStatus.RUNNING);
    expect(task?.config.run_in_background).toBe(true);

    const stats = manager.getStats();
    expect(stats.total).toBe(1);
    expect(stats.running).toBe(1);
  });

  it('validates spawn config inputs', async () => {
    const manager = new BackgroundManager();

    await expect(manager.spawn(undefined as unknown as { prompt: string })).rejects.toThrow(
      'Config must be a valid object'
    );

    await expect(manager.spawn({} as { prompt: string })).rejects.toThrow(
      'Config must include a valid prompt string'
    );
  });

  it('uses injected spawn executor output when provided', async () => {
    const spawnCalls = vi.fn();
    const manager = new BackgroundManager({
      spawn: async (config: DelegateConfig, context: SpawnOptions & { proposedTaskId: string }) => {
        spawnCalls(config, context);
        return { taskId: 'external-123' };
      },
    });

    const taskId = await manager.spawn({ prompt: 'collect me' }, { timeout: 1000 });

    expect(taskId).toBe('external-123');
    expect(spawnCalls).toHaveBeenCalledWith(
      expect.objectContaining({ prompt: 'collect me', run_in_background: true }),
      expect.objectContaining({ proposedTaskId: expect.stringMatching(/^task_/) })
    );
  });

  it('collect completes running task and updates status', async () => {
    vi.useFakeTimers();
    const manager = new BackgroundManager();
    const taskId = await manager.spawn({ prompt: 'collect me' }, { timeout: 1000 });

    const result = await manager.collect(taskId);

    expect(result.taskId).toBe(taskId);
    expect(result.status).toBe(TaskStatus.COMPLETED);
    expect(result.data).toEqual({
      mode: 'adapter-demo',
      taskId,
      prompt: 'collect me',
      run_in_background: true,
    });

    const task = manager.getTask(taskId);
    expect(task?.status).toBe(TaskStatus.COMPLETED);
    expect(task?.endTime).toBeTypeOf('number');
  });

  it('collect accepts injected collect executor output', async () => {
    vi.useFakeTimers();
    const collectCalls = vi.fn();
    const manager = new BackgroundManager({
      collect: async (task: TaskMetadata) => {
        collectCalls(task.id);
        return {
          status: TaskStatus.COMPLETED,
          data: { payload: 'done' } as unknown,
        };
      },
    });
    const taskId = await manager.spawn({ prompt: 'collect custom' });

    const result = await manager.collect<{ payload: string }>(taskId);

    expect(result.data).toEqual({ payload: 'done' });
    expect(collectCalls).toHaveBeenCalledWith(taskId);
  });

  it('collect throws for missing, cancelled, and timed-out tasks', async () => {
    vi.useFakeTimers();
    const manager = new BackgroundManager();

    await expect(manager.collect('missing-task')).rejects.toThrow('Task missing-task not found');

    const cancelledTask = await manager.spawn({ prompt: 'cancel me' });
    await manager.cancelTask(cancelledTask);
    await expect(manager.collect(cancelledTask)).rejects.toThrow(`Task ${cancelledTask} was cancelled`);

    const timedOutTask = await manager.spawn({ prompt: 'timeout me' }, { timeout: 10 });
    await vi.advanceTimersByTimeAsync(11);
    await expect(manager.collect(timedOutTask)).rejects.toThrow(`Task ${timedOutTask} timed out`);
  });

  it('transitions task to TIMEOUT when watchdog expires', async () => {
    vi.useFakeTimers();
    const cancelCalls = vi.fn();
    const manager = new BackgroundManager({
      cancel: async (task, status) => {
        cancelCalls(task.id, status);
      },
    });
    const taskId = await manager.spawn({ prompt: 'long running' }, { timeout: 50 });

    expect(manager.getTask(taskId)?.status).toBe(TaskStatus.RUNNING);

    await vi.advanceTimersByTimeAsync(51);

    const task = manager.getTask(taskId);
    expect(task?.status).toBe(TaskStatus.TIMEOUT);
    expect(task?.endTime).toBeTypeOf('number');
    expect(cancelCalls).toHaveBeenCalledWith(taskId, TaskStatus.TIMEOUT);

    const stats = manager.getStats();
    expect(stats.timeout).toBe(1);
    expect(stats.running).toBe(0);
  });

  it('cancelTask updates status and handles non-running state', async () => {
    vi.useFakeTimers();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const cancelCalls = vi.fn();
    const manager = new BackgroundManager({
      cancel: async (task: TaskMetadata, status: TaskStatus) => {
        cancelCalls(task.id, status);
      },
    });

    const taskId = await manager.spawn({ prompt: 'cancel target' });
    await manager.cancelTask(taskId);
    expect(manager.getTask(taskId)?.status).toBe(TaskStatus.CANCELLED);
    expect(cancelCalls).toHaveBeenCalledWith(taskId, TaskStatus.CANCELLED);

    await manager.cancelTask(taskId);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining(`Task ${taskId} is not running`)
    );

    await expect(manager.cancelTask('missing')).rejects.toThrow('Task missing not found');
  });

  it('cleanup cancels running tasks and clears registry', async () => {
    vi.useFakeTimers();
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const cancelCalls = vi.fn();
    const manager = new BackgroundManager({
      cancel: async (task, status) => {
        cancelCalls(task.id, status);
      },
    });

    await manager.spawn({ prompt: 'task a' });
    await manager.spawn({ prompt: 'task b' });

    expect(manager.getRunning()).toHaveLength(2);

    await manager.cleanup();

    expect(manager.getAllTasks()).toHaveLength(0);
    expect(manager.getStats()).toEqual({
      total: 0,
      running: 0,
      completed: 0,
      cancelled: 0,
      timeout: 0,
      failed: 0,
    });
    expect(cancelCalls).toHaveBeenCalledTimes(2);
    expect(log).toHaveBeenCalledWith(expect.stringContaining('Cancelled 2 running tasks'));
  });

  it('registerExecutors replaces behavior after construction', async () => {
    vi.useFakeTimers();
    const collectCalls = vi.fn();
    const manager = new BackgroundManager();

    manager.registerExecutors({
      collect: async (task) => {
        collectCalls(task.id);
        return { data: { updated: true } as unknown };
      },
    });
    const taskId = await manager.spawn({ prompt: 'hot swap' });
    const result = await manager.collect<{ updated: boolean }>(taskId);

    expect(result.data).toEqual({ updated: true });
    expect(collectCalls).toHaveBeenCalledWith(taskId);
  });
});

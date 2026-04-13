import { describe, expect, it, vi } from 'vitest';
import WorktreeIsolation from '../worktree-isolation.js';

describe('worktree-isolation pattern', () => {
  it('throws on invalid create config', async () => {
    const isolation = new WorktreeIsolation('/tmp');

    await expect(isolation.create({ taskId: '', baseBranch: 'main' })).rejects.toThrow(
      'taskId must be a non-empty string'
    );
    await expect(isolation.create({ taskId: 'x', baseBranch: '' })).rejects.toThrow(
      'baseBranch must be a non-empty string'
    );
  });

  it('parses list output for worktree branches', async () => {
    const isolation = new WorktreeIsolation('/tmp');
    vi.spyOn(isolation as unknown as { execGit: (cmd: string, timeout: number) => string }, 'execGit')
      .mockReturnValue(
        [
          'worktree /tmp/umbrella-worktrees/task-1',
          'HEAD abcdef',
          'branch refs/heads/worktree/task-1',
          '',
          'worktree /repo',
          'HEAD abcdef',
          'branch refs/heads/main',
        ].join('\n')
      );

    const list = await isolation.list();
    expect(list).toEqual([
      {
        worktreePath: '/tmp/umbrella-worktrees/task-1',
        branchName: 'worktree/task-1',
        taskId: 'task-1',
      },
    ]);
  });

  it('withIsolation executes callback and always triggers cleanup', async () => {
    const isolation = new WorktreeIsolation('/tmp');

    const createSpy = vi.spyOn(isolation, 'create').mockResolvedValue({
      worktreePath: '/tmp/wt-1',
      branchName: 'worktree/task-1',
      taskId: 'task-1',
    });
    const removeSpy = vi.spyOn(isolation, 'remove').mockResolvedValue();

    const result = await isolation.withIsolation(
      { taskId: 'task-1', baseBranch: 'main' },
      async (path: string) => `ran in ${path}`
    );

    expect(result).toBe('ran in /tmp/wt-1');
    expect(createSpy).toHaveBeenCalledTimes(1);
    expect(removeSpy).toHaveBeenCalledWith('task-1');
  });
});

import { describe, expect, it, vi } from 'vitest';
import ShadowWorkspace from '../shadow-workspace.js';

describe('shadow-workspace pattern', () => {
  it('falls back to file-copy validation when git is unavailable and apply succeeds', async () => {
    const shadow = new ShadowWorkspace('/tmp');

    const gitSpy = vi.spyOn(shadow as unknown as { isGitAvailable: () => boolean }, 'isGitAvailable')
      .mockReturnValue(false);
    const shellSpy = vi.spyOn(shadow as unknown as { execShell: (cmd: string, timeout: number) => string }, 'execShell')
      .mockReturnValue('ok');

    const result = await shadow.validate(
      { taskId: 'fallback-pass', workingBranch: 'main', files: [] },
      async () => undefined
    );

    expect(result.success).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.shadowBranch).toBe('shadow/fallback-pass');
    expect(gitSpy).toHaveBeenCalled();
    expect(shellSpy).toHaveBeenCalled();
  });

  it('returns validation errors when apply function fails in fallback mode', async () => {
    const shadow = new ShadowWorkspace('/tmp');
    vi.spyOn(shadow as unknown as { isGitAvailable: () => boolean }, 'isGitAvailable').mockReturnValue(false);

    const result = await shadow.validate(
      { taskId: 'fallback-fail', workingBranch: 'main', files: [] },
      async () => {
        throw new Error('apply broke');
      }
    );

    expect(result.success).toBe(false);
    expect(result.errors[0]).toContain('Apply failed: apply broke');
  });

  it('throws on invalid config', async () => {
    const shadow = new ShadowWorkspace('/tmp');
    await expect(
      shadow.validate({ taskId: '', workingBranch: 'main', files: [] }, async () => undefined)
    ).rejects.toThrow('taskId must be a non-empty string');
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  AgentTimeoutError,
  type AgentExecutionAdapter,
  type DelegateConfig,
  __resetExecuteAgent,
  __setExecuteAgent,
  babysitAgent,
  createBabysitter,
  executeAgent,
  registerAgentExecutionAdapter,
  resetAgentExecutionAdapter,
} from '../agent-babysitter.js';

describe('agent-babysitter pattern', () => {
  afterEach(() => {
    __resetExecuteAgent();
    resetAgentExecutionAdapter();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('uses safe demo adapter by default', async () => {
    await expect(executeAgent({ prompt: 'demo' })).resolves.toEqual({
      mode: 'adapter-demo',
      config: {
        prompt: 'demo',
        run_in_background: false,
      },
    });
  });

  it('throws AgentTimeoutError when operation exceeds timeout', async () => {
    vi.useFakeTimers();
    __setExecuteAgent(async () => new Promise<never>(() => undefined));

    const promise = babysitAgent({ prompt: 'work' }, { timeout: 20, maxRetries: 1 });
    const assertion = expect(promise).rejects.toBeInstanceOf(AgentTimeoutError);
    await vi.advanceTimersByTimeAsync(21);

    await assertion;
  });

  it('retries timeout once and eventually succeeds', async () => {
    vi.useFakeTimers();
    let calls = 0;
    const onRetry = vi.fn();
    const onTimeout = vi.fn();

    __setExecuteAgent(async () => {
      calls += 1;
      if (calls === 1) {
        return new Promise<never>(() => undefined);
      }
      return { ok: true };
    });

    const promise = babysitAgent(
      { prompt: 'work' },
      { timeout: 10, maxRetries: 2, onRetry, onTimeout }
    );

    await vi.advanceTimersByTimeAsync(11);
    await expect(promise).resolves.toEqual({ ok: true });

    expect(calls).toBe(2);
    expect(onTimeout).toHaveBeenCalledWith(1);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('uses registered fallback adapter when retries are exhausted', async () => {
    vi.useFakeTimers();
    const onFallback = vi.fn();
    const onTimeout = vi.fn();
    let calls = 0;

    registerAgentExecutionAdapter({
      async execute(config: DelegateConfig) {
        calls += 1;
        if (config.subagent_type !== 'oracle') {
          return new Promise<never>(() => undefined);
        }
        return { handledBy: config.subagent_type, prompt: config.prompt };
      },
    } satisfies AgentExecutionAdapter);

    const promise = babysitAgent(
      { prompt: 'fallback', subagent_type: 'explore' },
      { timeout: 10, maxRetries: 1, fallbackAgent: 'oracle', onFallback, onTimeout }
    );

    await vi.advanceTimersByTimeAsync(11);

    await expect(promise).resolves.toEqual({ handledBy: 'oracle', prompt: 'fallback' });
    expect(calls).toBe(2);
    expect(onTimeout).toHaveBeenCalledWith(1);
    expect(onFallback).toHaveBeenCalledWith('oracle');
  });

  it('createBabysitter returns a callable wrapper', async () => {
    __setExecuteAgent(async (config: DelegateConfig) => ({ prompt: config.prompt, done: true }));

    const wrapped = createBabysitter({ timeout: 100, maxRetries: 1 });
    await expect(wrapped({ prompt: 'wrapped-run' })).resolves.toEqual({
      prompt: 'wrapped-run',
      done: true,
    });
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CircuitBreaker,
  CircuitOpenError,
  RetryableError,
  defaultShouldRetry,
  retryWithBackoff,
} from '../error-retry.js';

describe('error-retry pattern', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('RetryableError and defaultShouldRetry', () => {
    it('preserves RetryableError metadata', () => {
      const err = new RetryableError('rate limited', 'RATE_LIMIT', 429);
      expect(err.name).toBe('RetryableError');
      expect(err.message).toBe('rate limited');
      expect(err.code).toBe('RATE_LIMIT');
      expect(err.status).toBe(429);
    });

    it('retries known transient patterns and statuses', () => {
      expect(defaultShouldRetry(new RetryableError('retry me'))).toBe(true);
      expect(defaultShouldRetry(new Error('ECONNREFUSED while connecting'))).toBe(true);
      expect(defaultShouldRetry(Object.assign(new Error('server error'), { status: 503 }))).toBe(true);
      expect(defaultShouldRetry(Object.assign(new Error('status code'), { statusCode: 429 }))).toBe(true);
    });

    it('does not retry non-transient errors', () => {
      expect(defaultShouldRetry(Object.assign(new Error('bad request'), { status: 400 }))).toBe(false);
      expect(defaultShouldRetry(Object.assign(new Error('not found'), { status: 404 }))).toBe(false);
      expect(defaultShouldRetry(new Error('logic bug happened'))).toBe(false);
      expect(defaultShouldRetry('plain string error')).toBe(false);
    });
  });

  describe('retryWithBackoff', () => {
    it('returns immediately when operation succeeds first try', async () => {
      const warn = vi.fn();
      const result = await retryWithBackoff(async () => 'ok', { logger: { warn } });
      expect(result).toBe('ok');
      expect(warn).not.toHaveBeenCalled();
    });

    it('retries with computed backoff delays and then succeeds', async () => {
      vi.useFakeTimers();
      vi.spyOn(Math, 'random').mockReturnValue(0);

      const warn = vi.fn();
      const error = vi.fn();
      let attempts = 0;

      const promise = retryWithBackoff(
        async () => {
          attempts++;
          if (attempts < 3) {
            throw new Error('network timeout');
          }
          return 'recovered';
        },
        {
          maxRetries: 3,
          baseDelay: 100,
          maxDelay: 1000,
          logger: { warn, error },
        }
      );

      await vi.advanceTimersByTimeAsync(100);
      await vi.advanceTimersByTimeAsync(200);

      await expect(promise).resolves.toBe('recovered');
      expect(attempts).toBe(3);
      expect(warn).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('Retrying in 100ms')
      );
      expect(warn).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('Retrying in 200ms')
      );
      expect(error).not.toHaveBeenCalled();
    });

    it('reflects capped exponential delay behavior (via retry logging)', async () => {
      vi.useFakeTimers();
      vi.spyOn(Math, 'random')
        .mockReturnValueOnce(1)
        .mockReturnValueOnce(0.9)
        .mockReturnValueOnce(1)
        .mockReturnValueOnce(0.9);

      const warn = vi.fn();
      let attempts = 0;

      const promise = retryWithBackoff(
        async () => {
          attempts++;
          if (attempts < 3) {
            throw new Error('timeout');
          }
          return 'done';
        },
        {
          maxRetries: 3,
          baseDelay: 100,
          maxDelay: 150,
          logger: { warn },
        }
      );

      await vi.advanceTimersByTimeAsync(130);
      await vi.advanceTimersByTimeAsync(195);
      await expect(promise).resolves.toBe('done');

      expect(warn).toHaveBeenNthCalledWith(1, expect.stringContaining('Retrying in 130ms'));
      expect(warn).toHaveBeenNthCalledWith(2, expect.stringContaining('Retrying in 195ms'));
    });

    it('fails fast on non-retryable error', async () => {
      const warn = vi.fn();
      const error = vi.fn();

      await expect(
        retryWithBackoff(
          async () => {
            throw new Error('validation failed');
          },
          {
            maxRetries: 5,
            shouldRetry: () => false,
            logger: { warn, error },
          }
        )
      ).rejects.toThrow('validation failed');

      expect(warn).not.toHaveBeenCalled();
      expect(error).toHaveBeenCalledTimes(1);
    });
  });

  describe('CircuitBreaker', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    it('opens after threshold failures and blocks calls while open', async () => {
      const warn = vi.fn();
      const error = vi.fn();
      const breaker = new CircuitBreaker({ threshold: 2, timeout: 1000, logger: { warn, error } });

      await expect(breaker.execute(async () => { throw new Error('f1'); })).rejects.toThrow('f1');
      expect(breaker.getState()).toBe('closed');
      expect(breaker.getFailureCount()).toBe(1);

      await expect(breaker.execute(async () => { throw new Error('f2'); })).rejects.toThrow('f2');
      expect(breaker.getState()).toBe('open');
      expect(breaker.getFailureCount()).toBe(2);
      expect(error).toHaveBeenCalledWith(expect.stringContaining('Circuit breaker OPEN'));

      await expect(breaker.execute(async () => 'never')).rejects.toBeInstanceOf(CircuitOpenError);
      expect(warn).not.toHaveBeenCalledWith(expect.stringContaining('HALF-OPEN'));
    });

    it('transitions open -> half-open -> closed on successful trial', async () => {
      const warn = vi.fn();
      const breaker = new CircuitBreaker({ threshold: 1, timeout: 100, logger: { warn } });

      await expect(breaker.execute(async () => { throw new Error('boom'); })).rejects.toThrow('boom');
      expect(breaker.getState()).toBe('open');

      vi.advanceTimersByTime(100);

      await expect(breaker.execute(async () => 'ok')).resolves.toBe('ok');
      expect(breaker.getState()).toBe('closed');
      expect(breaker.getFailureCount()).toBe(0);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('HALF-OPEN'));
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('reset to CLOSED'));
    });

    it('can be reset manually', async () => {
      const warn = vi.fn();
      const breaker = new CircuitBreaker({ threshold: 1, logger: { warn } });

      await expect(breaker.execute(async () => { throw new Error('boom'); })).rejects.toThrow();
      expect(breaker.getState()).toBe('open');

      breaker.reset();
      expect(breaker.getState()).toBe('closed');
      expect(breaker.getFailureCount()).toBe(0);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('manually reset'));
    });
  });
});

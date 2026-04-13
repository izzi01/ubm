import { describe, expect, it } from 'vitest';
import { type StructuredError, SelfCorrectionLoop } from '../self-correction-loop.js';

describe('self-correction-loop pattern', () => {
  it('succeeds after retries when task eventually passes', async () => {
    const loop = new SelfCorrectionLoop();
    let tries = 0;

    const result = await loop.run(
      async () => {
        tries++;
        if (tries < 3) {
          throw new Error('src/auth.ts:42:5 - timeout in test');
        }
      },
      { maxRetries: 5, escalateToOracle: true }
    );

    expect(result).toEqual({ success: true, attempts: 3, escalated: false });
  });

  it('parses structured error information from mixed stderr text', () => {
    const loop = new SelfCorrectionLoop();
    const parsed = loop.parseError(
      [
        'src/auth.ts:42:5 - error TS2322: Type mismatch',
        '● Auth › should reject bad token',
        'TypeError: Cannot read properties of undefined',
      ].join('\n')
    );

    expect(parsed.length).toBeGreaterThan(0);
    expect(parsed[0].file).toContain('src/auth.ts');
    expect(parsed[0].line).toBe(42);
    expect(parsed.some((e: StructuredError) => e.testName?.includes('should reject bad token'))).toBe(true);
  });

  it('escalates when max retries exhausted and escalation enabled', async () => {
    const loop = new SelfCorrectionLoop();

    const result = await loop.run(
      async () => {
        throw new Error('always failing');
      },
      { maxRetries: 2, escalateToOracle: true }
    );

    expect(result.success).toBe(false);
    expect(result.attempts).toBe(2);
    expect(result.escalated).toBe(true);
    expect(result.finalError).toContain('always failing');
  });
});

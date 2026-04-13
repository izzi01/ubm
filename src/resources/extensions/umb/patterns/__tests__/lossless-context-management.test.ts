import { describe, expect, it } from 'vitest';
import LosslessContextManager from '../lossless-context-management.js';

describe('lossless-context-management pattern', () => {
  it('compresses and decompresses context losslessly', async () => {
    const lcm = new LosslessContextManager();
    const text = 'Authentication step one.\n\nAuthorization step two.\n\nSession step three.';

    const index = await lcm.compress(text);
    const reconstructed = await lcm.decompress(index);

    expect(index.chunks.length).toBeGreaterThan(0);
    expect(reconstructed).toBe(text);
  });

  it('retrieves chunks relevant to query terms', async () => {
    const lcm = new LosslessContextManager();
    await lcm.compress('OAuth login flow with token refresh.\n\nCache invalidation and metrics.');

    const chunks = await lcm.retrieve('token login');
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0].content.toLowerCase()).toContain('login');
  });

  it('stores named contexts and exposes stats', async () => {
    const lcm = new LosslessContextManager();
    await lcm.store('session-1', 'alpha context\n\nbeta context');

    const stats = lcm.getStats();
    expect(stats.storedKeys).toBe(1);
    expect(stats.totalChunks).toBeGreaterThan(0);

    lcm.evict(1);
    const evicted = lcm.getStats();
    expect(evicted.totalTokens).toBeLessThanOrEqual(stats.totalTokens);
  });
});

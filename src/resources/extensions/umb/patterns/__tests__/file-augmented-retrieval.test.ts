import { describe, expect, it } from 'vitest';
import FileAugmentedRetrieval from '../file-augmented-retrieval.js';

describe('file-augmented-retrieval pattern', () => {
  it('augments file with summary, keywords, concepts, and dependencies', () => {
    const far = new FileAugmentedRetrieval({ augmentationStrategy: 'full', maxSummaryTokens: 30 });
    const content = [
      "import { retryWithBackoff } from './retry';",
      'export class AuthManager {',
      '  authenticateUser() { return true; }',
      '}',
    ].join('\n');

    const augmented = far.augmentFile('src/auth.ts', content);

    expect(augmented.path).toBe('src/auth.ts');
    expect(augmented.augmentation.summary.length).toBeGreaterThan(0);
    expect(augmented.augmentation.keywords.length).toBeGreaterThan(0);
    expect(augmented.augmentation.concepts).toContain('AuthManager');
    expect(augmented.augmentation.dependencies).toContain('./retry');
  });

  it('retrieves and ranks relevant files by query', () => {
    const far = new FileAugmentedRetrieval({ augmentationStrategy: 'full' });
    const files = far.augmentDirectory('src', {
      'auth.ts': 'export const authToken = "a"; function login() {}',
      'metrics.ts': 'export const metricCounter = 1; function report() {}',
    });

    const results = far.retrieve('auth login token', files);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].path).toContain('auth.ts');
  });

  it('renders context with metadata headers under a practical budget', () => {
    const far = new FileAugmentedRetrieval({ augmentationStrategy: 'full' });
    const file = far.augmentFile('src/long.ts', `export const value = "${'x'.repeat(500)}";`);

    const context = far.toContext([file], 400);
    expect(context).toContain('=== src/long.ts ===');
    expect(context).toContain('Summary:');
  });

  it('returns empty context when budget is too small to fit header/content', () => {
    const far = new FileAugmentedRetrieval({ augmentationStrategy: 'full' });
    const file = far.augmentFile('src/long.ts', `export const value = "${'x'.repeat(500)}";`);

    const context = far.toContext([file], 10);
    expect(context).toBe('');
  });
});

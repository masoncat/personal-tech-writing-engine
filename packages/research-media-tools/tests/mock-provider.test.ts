import { describe, expect, it } from 'vitest';

import { createMockResearchMediaProvider } from '../src/index.js';

describe('mock research media provider', () => {
  it('returns deterministic web results as candidate evidence', async () => {
    const provider = createMockResearchMediaProvider();
    const result = await provider.searchWeb({ query: 'gpt-image-2 launch', topic: 'news' });

    expect(result.provider).toBe('mock');
    expect(result.results[0]).toMatchObject({
      title: 'Mock source for gpt-image-2 launch',
      sourceDomain: 'example.com',
      evidenceStrength: 'candidate',
    });
  });

  it('returns extracted page images with source page context', async () => {
    const provider = createMockResearchMediaProvider();
    const result = await provider.extractPage({ url: 'https://example.com/article' });

    expect(result.textContent).toContain('Mock extracted article body');
    expect(result.images[0]).toMatchObject({
      sourcePageUrl: 'https://example.com/article',
      roleHint: 'hero',
    });
  });
});

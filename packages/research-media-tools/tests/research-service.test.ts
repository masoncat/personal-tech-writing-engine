import { describe, expect, it } from 'vitest';

import { createMockResearchMediaProvider, createResearchPackage } from '../src/index.js';

describe('createResearchPackage', () => {
  it('extracts candidate pages before treating evidence as extracted', async () => {
    const provider = createMockResearchMediaProvider();
    const pkg = await createResearchPackage({
      queries: [{ query: 'gpt-image-2 launch', topic: 'news' }],
      provider,
      now: '2026-05-03T00:00:00.000Z',
    });

    expect(pkg.querySet).toHaveLength(1);
    expect(pkg.sources[0].evidenceStrength).toBe('extracted');
    expect(pkg.evidenceBlocks[0].text).toContain('Mock extracted article body');
  });

  it('marks snippet-only when extraction has no body', async () => {
    const provider = createMockResearchMediaProvider();
    const pkg = await createResearchPackage({
      queries: [{ query: 'blocked source', topic: 'news' }],
      provider: {
        ...provider,
        async extractPage(request) {
          return {
            ...(await provider.extractPage(request)),
            textContent: '',
            evidenceBlocks: [],
            warnings: [{ code: 'empty_body', message: 'No readable body found.' }],
          };
        },
      },
      now: '2026-05-03T00:00:00.000Z',
    });

    expect(pkg.sources[0].evidenceStrength).toBe('snippet_only');
    expect(pkg.warnings[0]).toContain('No readable body found');
  });
});

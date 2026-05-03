import { describe, expect, it, vi } from 'vitest';

import { createMediaPlan, createMockResearchMediaProvider } from '../src/index.js';

describe('createMediaPlan', () => {
  it('uses extracted page images for fact evidence needs', async () => {
    const provider = createMockResearchMediaProvider();
    const plan = await createMediaPlan({
      articleTitle: 'OpenAI image generation changes again',
      sections: [
        {
          id: 's1',
          text: 'Mock extracted article body says OpenAI released an image generation announcement.',
        },
      ],
      provider,
    });

    expect(plan.needs).toHaveLength(1);
    expect(plan.selections[0].asset.kind).toBe('page_image');
    expect(plan.sourceBoundary[0].usageBoundary).toBe('fact_image');
  });

  it('leaves empty when generated fallback still does not fit', async () => {
    const provider = createMockResearchMediaProvider();
    const plan = await createMediaPlan({
      articleTitle: 'OpenAI image generation changes again',
      sections: [
        {
          id: 's1',
          text: 'OpenAI announced a new factual update that requires real event imagery.',
        },
      ],
      provider: {
        ...provider,
        async extractPage(request) {
          return {
            ...(await provider.extractPage(request)),
            images: [],
          };
        },
      },
    });

    expect(plan.selections).toEqual([]);
    expect(plan.rejectedCandidates.some((candidate) => candidate.decision.decision === 'leave_empty')).toBe(true);
  });

  it('uses the provider default image model for generated fallback media', async () => {
    const provider = createMockResearchMediaProvider();
    const generateImage = vi.fn(provider.generateImage);

    await createMediaPlan({
      articleTitle: 'Frontend AI framework',
      sections: [
        {
          id: 's1',
          text: 'This concept framework explains frontend engineers reviewing AI generated code through experience constraints.',
        },
      ],
      provider: {
        ...provider,
        async searchPhotos() {
          return [];
        },
        generateImage,
      },
    });

    expect(generateImage).toHaveBeenCalledOnce();
    expect(generateImage.mock.calls[0][0]).not.toHaveProperty('model');
  });
});

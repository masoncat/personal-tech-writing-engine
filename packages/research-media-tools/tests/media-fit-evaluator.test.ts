import { describe, expect, it } from 'vitest';

import { evaluateMediaFit } from '../src/index.js';
import type { MediaAsset, MediaNeed } from '../src/index.js';

const factNeed: MediaNeed = {
  id: 'need-fact',
  context: 'OpenAI released a new image generation model and the section discusses the announcement.',
  intendedRole: 'fact_evidence',
  required: true,
  searchQuery: 'OpenAI image generation announcement',
  mustBeRealImage: true,
};

describe('evaluateMediaFit', () => {
  it('rejects Unsplash photos for fact evidence needs', () => {
    const asset: MediaAsset = {
      id: 'photo-1',
      kind: 'unsplash_photo',
      url: 'https://images.unsplash.com/photo.jpg',
      title: 'Abstract office desk',
      provider: 'unsplash',
      generated: false,
    };

    const decision = evaluateMediaFit({ need: factNeed, asset });

    expect(decision.decision).toBe('reject');
    expect(decision.usageBoundary).toBe('not_usable');
    expect(decision.reason).toContain('cannot support fact evidence');
  });

  it('allows page images for fact evidence when context overlaps', () => {
    const asset: MediaAsset = {
      id: 'page-image-1',
      kind: 'page_image',
      url: 'https://example.com/openai-image.jpg',
      title: 'OpenAI image generation announcement',
      caption: 'OpenAI released a new image generation model.',
      sourceUrl: 'https://example.com/openai-announcement',
      provider: 'page-extractor',
      generated: false,
    };

    const decision = evaluateMediaFit({ need: factNeed, asset });

    expect(decision.decision).toBe('use');
    expect(decision.usageBoundary).toBe('fact_image');
    expect(decision.fitScore).toBeGreaterThanOrEqual(85);
  });

  it('returns leave_empty for generated images that still do not match context', () => {
    const asset: MediaAsset = {
      id: 'generated-1',
      kind: 'generated_image',
      title: 'A generic blue gradient',
      provider: 'openai',
      generated: true,
      model: 'gpt-image-2',
      prompt: 'A generic abstract background',
    };

    const decision = evaluateMediaFit({ need: factNeed, asset, afterGeneration: true });

    expect(decision.decision).toBe('leave_empty');
    expect(decision.requiredDisclosure).toBe('AI generated image; not factual evidence.');
  });
});

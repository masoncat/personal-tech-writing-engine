import { describe, expect, it } from 'vitest';

import { planMediaNeeds } from '../src/index.js';

describe('planMediaNeeds', () => {
  it('plans fact evidence needs for sections with source-sensitive claims', () => {
    const needs = planMediaNeeds({
      articleTitle: 'OpenAI image generation changes again',
      sections: [
        {
          id: 's1',
          text: 'OpenAI announced gpt-image-2 today, and the product update changes how creators generate images.',
        },
      ],
    });

    expect(needs[0]).toMatchObject({
      articleSectionId: 's1',
      intendedRole: 'fact_evidence',
      mustBeRealImage: true,
    });
  });

  it('does not create image needs for generic filler sections', () => {
    const needs = planMediaNeeds({
      articleTitle: 'A quiet note',
      sections: [
        {
          id: 's1',
          text: 'This section is a short transition between two ideas.',
        },
      ],
    });

    expect(needs).toEqual([]);
  });
});

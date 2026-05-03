import { describe, expect, it } from 'vitest';

import type { MediaFitDecision, WebSearchItem } from '../src/index.js';

describe('research media tool types', () => {
  it('supports snippet-only search candidates and leave-empty media decisions', () => {
    const searchItem: WebSearchItem = {
      title: 'OpenAI announces image model',
      url: 'https://example.com/news',
      sourceDomain: 'example.com',
      snippet: 'Announcement summary',
      evidenceStrength: 'snippet_only',
    };
    const decision: MediaFitDecision = {
      fitScore: 42,
      decision: 'leave_empty',
      reason: 'Candidate image does not support the section context.',
      usageBoundary: 'not_usable',
    };

    expect(searchItem.evidenceStrength).toBe('snippet_only');
    expect(decision.decision).toBe('leave_empty');
  });
});

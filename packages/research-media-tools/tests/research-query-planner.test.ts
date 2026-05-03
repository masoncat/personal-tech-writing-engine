import { describe, expect, it } from 'vitest';

import { planResearchQueries } from '../src/index.js';

describe('planResearchQueries', () => {
  it('creates multi-intent 2026-aware queries for a high-timeliness topic', () => {
    const plan = planResearchQueries({
      topic: '前端工程师在 AI 时代的出路',
      currentDate: '2026-05-04',
      audience: '3-5年经验前端工程师',
    });

    expect(plan.currentDate).toBe('2026-05-04');
    expect(plan.queries).toHaveLength(6);
    expect(plan.queries.map((query) => query.intent)).toEqual([
      'official_report',
      'official_blog',
      'product_announcement',
      'product_announcement',
      'news_analysis',
      'counterpoint',
    ]);
    expect(plan.queries.every((query) => query.query.includes('2026'))).toBe(true);
    expect(plan.queries[0]).toMatchObject({
      topic: 'general',
      maxResults: 5,
      timeRange: 'year',
    });
  });
});

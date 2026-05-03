import { describe, expect, it } from 'vitest';

import { createEvidenceBedrock } from '../src/index.js';
import type { FreshnessAudit, ResearchPackage } from '../src/index.js';

describe('createEvidenceBedrock', () => {
  it('creates evidence cards from extracted evidence blocks and freshness assessments', () => {
    const researchPackage: ResearchPackage = {
      id: 'research-package-ai',
      querySet: [],
      sources: [
        {
          title: 'Stack Overflow Developer Survey 2025',
          url: 'https://survey.stackoverflow.co/2025/ai',
          sourceDomain: 'survey.stackoverflow.co',
          publishedAt: '2025-07-29',
          evidenceStrength: 'extracted',
        },
      ],
      evidenceBlocks: [
        {
          sourceUrl: 'https://survey.stackoverflow.co/2025/ai',
          text: '84% of respondents are using or planning to use AI tools.',
        },
      ],
      unresolvedQuestions: [],
      warnings: [],
      createdAt: '2026-05-04T00:00:00.000Z',
    };
    const audit: FreshnessAudit = {
      currentDate: '2026-05-04',
      topicTimeSensitivity: 'high',
      sources: [
        {
          title: 'Stack Overflow Developer Survey 2025',
          url: 'https://survey.stackoverflow.co/2025/ai',
          publishedAt: '2025-07-29',
          sourceYear: 2025,
          sourceType: 'annual_report',
          freshness: 'latest_available',
          usageBoundary: '截至 2026-05-04，该来源可作为最新已发布年度报告的基线，不能写成当前年份数据。',
        },
      ],
      warnings: [],
      requiredDisclosures: ['截至 2026-05-04，Stack Overflow Developer Survey 2025 作为最新已发布年度报告使用。'],
      pass: true,
    };

    const bedrock = createEvidenceBedrock({
      topic: '前端工程师在 AI 时代的出路',
      researchPackage,
      freshnessAudit: audit,
      now: '2026-05-04T01:00:00.000Z',
    });

    expect(bedrock.cards).toHaveLength(1);
    expect(bedrock.cards[0]).toMatchObject({
      freshness: 'latest_available',
      sourceUrls: ['https://survey.stackoverflow.co/2025/ai'],
    });
    expect(bedrock.cards[0].claim).toContain('84%');
    expect(bedrock.requiredDisclosures).toHaveLength(1);
  });
});

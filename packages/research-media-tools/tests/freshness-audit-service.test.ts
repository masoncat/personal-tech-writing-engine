import { describe, expect, it } from 'vitest';

import { auditFreshness } from '../src/index.js';
import type { ResearchPackage } from '../src/index.js';

const packageWithSources = (sources: ResearchPackage['sources']): ResearchPackage => ({
  id: 'research-package-test',
  querySet: [],
  sources,
  evidenceBlocks: [],
  unresolvedQuestions: [],
  warnings: [],
  createdAt: '2026-05-04T00:00:00.000Z',
});

describe('auditFreshness', () => {
  it('marks previous-year annual reports as latest_available with required disclosure', () => {
    const audit = auditFreshness({
      currentDate: '2026-05-04',
      topicTimeSensitivity: 'high',
      researchPackage: packageWithSources([
        {
          title: 'Stack Overflow Developer Survey 2025',
          url: 'https://survey.stackoverflow.co/2025/ai',
          sourceDomain: 'survey.stackoverflow.co',
          publishedAt: '2025-07-29',
          evidenceStrength: 'extracted',
        },
        {
          title: 'Closing the developer AI trust gap',
          url: 'https://stackoverflow.blog/2026/02/18/closing-the-developer-ai-trust-gap/',
          sourceDomain: 'stackoverflow.blog',
          publishedAt: '2026-02-18',
          evidenceStrength: 'extracted',
        },
        {
          title: 'AI coding agents in 2026',
          url: 'https://example.com/ai-coding-agents-2026',
          sourceDomain: 'example.com',
          publishedAt: '2026-04-10',
          evidenceStrength: 'extracted',
        },
      ]),
    });

    expect(audit.pass).toBe(true);
    expect(audit.sources[0]).toMatchObject({
      sourceType: 'annual_report',
      freshness: 'latest_available',
      sourceYear: 2025,
    });
    expect(audit.requiredDisclosures[0]).toContain('截至 2026-05-04');
  });

  it('fails high-timeliness topics when all sources are stale or undated', () => {
    const audit = auditFreshness({
      currentDate: '2026-05-04',
      topicTimeSensitivity: 'high',
      researchPackage: packageWithSources([
        {
          title: 'Developer tools report 2024',
          url: 'https://example.com/report-2024',
          sourceDomain: 'example.com',
          publishedAt: '2024-06-01',
          evidenceStrength: 'extracted',
        },
        {
          title: 'Undated AI article',
          url: 'https://example.com/undated',
          sourceDomain: 'example.com',
          evidenceStrength: 'snippet_only',
        },
      ]),
    });

    expect(audit.pass).toBe(false);
    expect(audit.warnings.map((warning) => warning.code)).toContain('insufficient_current_year_sources');
    expect(audit.warnings.map((warning) => warning.code)).toContain('missing_date');
  });
});

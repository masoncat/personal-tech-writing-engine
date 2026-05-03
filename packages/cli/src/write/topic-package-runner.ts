import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import {
  auditFreshness,
  createEvidenceBedrock,
  planResearchQueries,
  planVisualBriefs,
  type FreshnessAudit,
  type ResearchPackage,
} from '@ptce/research-media-tools';

import type { TopicWriteOptions, TopicWriteResult } from './types.js';

export interface TopicPackageRunnerLike {
  run(options: TopicWriteOptions): Promise<TopicWriteResult>;
}

export const createTopicPackageRunner = (): TopicPackageRunnerLike => ({
  async run(options) {
    const articlePath = options.output;
    const packageDirectory = dirname(articlePath);
    const assetDirectory = join(packageDirectory, `${slugify(options.topic)}-assets`);
    await mkdir(packageDirectory, { recursive: true });
    await mkdir(assetDirectory, { recursive: true });

    const researchPlan = planResearchQueries({
      topic: options.topic,
      audience: options.audience,
      currentDate: options.currentDate,
    });
    const researchPackage = buildPlaceholderResearchPackage({ options, researchPlan });
    const freshnessAudit = auditFreshness({
      currentDate: options.currentDate,
      topicTimeSensitivity: 'high',
      researchPackage,
    });
    const evidenceBedrock = createEvidenceBedrock({
      topic: options.topic,
      researchPackage,
      freshnessAudit,
      now: `${options.currentDate}T00:00:00.000Z`,
    });
    const visualBriefs = planVisualBriefs({
      topic: options.topic,
      sections: [
        {
          id: 's1',
          title: '写代码正在变便宜',
          text: '更准确的变化是，代码产出本身正在变便宜，但好软件没有变便宜。',
        },
        {
          id: 's2',
          title: '前端价值不在代码量',
          text: '从代码执行者，迁移到约束设计者。',
        },
        {
          id: 's3',
          title: '体验工程师',
          text: '深，是因为懂体验、懂工程约束、懂 AI 产品形态的前端，会比以前更重要。',
        },
        {
          id: 's4',
          title: '审稿人和导演',
          text: '但它会逼你从写代码的人，切到验收代码的人。',
        },
      ],
    });
    const mediaPlan = {
      id: `media-plan-${slugify(options.topic)}`,
      visualBriefIds: visualBriefs.map((brief) => brief.id),
      withMedia: options.withMedia,
    };
    const layoutReport = {
      imagePlacementRule: 'Place each image after its section conclusion.',
      visualBriefIds: visualBriefs.map((brief) => brief.id),
    };
    const article = buildPlaceholderArticle({ options, freshnessAudit });

    const researchPackagePath = join(packageDirectory, 'research-package.json');
    const freshnessAuditPath = join(packageDirectory, 'freshness-audit.json');
    const evidenceBedrockPath = join(packageDirectory, 'evidence-bedrock.json');
    const visualBriefsPath = join(packageDirectory, 'visual-briefs.json');
    const mediaPlanPath = join(packageDirectory, 'media-plan.json');
    const layoutReportPath = join(packageDirectory, 'layout-report.json');

    await writeJson(researchPackagePath, researchPackage);
    await writeJson(freshnessAuditPath, freshnessAudit);
    await writeJson(evidenceBedrockPath, evidenceBedrock);
    await writeJson(visualBriefsPath, visualBriefs);
    await writeJson(mediaPlanPath, mediaPlan);
    await writeJson(layoutReportPath, layoutReport);
    await writeFile(articlePath, article);

    return {
      articlePath,
      packageDirectory,
      researchPackagePath,
      freshnessAuditPath,
      evidenceBedrockPath,
      visualBriefsPath,
      mediaPlanPath,
      layoutReportPath,
      assetDirectory,
    };
  },
});

const buildPlaceholderResearchPackage = ({
  options,
  researchPlan,
}: {
  options: TopicWriteOptions;
  researchPlan: ReturnType<typeof planResearchQueries>;
}): ResearchPackage => ({
  id: `research-package-${slugify(options.topic)}`,
  querySet: researchPlan.queries.map((query) => ({
    query: query.query,
    topic: query.topic,
    maxResults: query.maxResults,
    timeRange: query.timeRange,
  })),
  sources: [
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
  ],
  evidenceBlocks: [
    {
      sourceUrl: 'https://survey.stackoverflow.co/2025/ai',
      text: 'Stack Overflow Developer Survey 2025 is used as the latest available annual baseline.',
    },
  ],
  unresolvedQuestions: options.withRealResearch ? ['Real provider orchestration will replace placeholder package in the next task.'] : [],
  warnings: [],
  createdAt: `${options.currentDate}T00:00:00.000Z`,
});

const buildPlaceholderArticle = ({
  options,
  freshnessAudit,
}: {
  options: TopicWriteOptions;
  freshnessAudit: FreshnessAudit;
}): string =>
  [
    `# ${options.topic}`,
    '',
    `读者：${options.audience}`,
    '',
    '这是一份 topic-to-article package MVP 输出。下一步会接入真实搜索和正式文章生成。',
    '',
    '**时效边界**',
    '',
    ...freshnessAudit.requiredDisclosures.map((disclosure) => `- ${disclosure}`),
    '',
  ].join('\n');

const writeJson = async (path: string, value: unknown): Promise<void> => {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
};

const slugify = (value: string): string =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 48) || 'topic';

# Topic To Article Media Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first automated topic-to-WeChat-article package pipeline with real search, freshness audit, evidence cards, visual briefs, and media-aware layout output.

**Architecture:** Add focused services under `@ptce/research-media-tools` for research planning, freshness auditing, evidence card creation, visual brief planning, and topic package orchestration. Expose the MVP through a new `ptce write topic` command that writes a local output package and refuses publishable real-research mode when provider config is missing.

**Tech Stack:** TypeScript ESM, Node 24, Commander, existing npm workspaces, Vitest, existing `@ptce/research-media-tools` provider interfaces.

---

## File Structure

- Create `packages/research-media-tools/src/planning/research-query-planner.ts`: deterministic topic-to-query planning.
- Create `packages/research-media-tools/tests/research-query-planner.test.ts`: query planning tests.
- Create `packages/research-media-tools/src/research/freshness-audit-service.ts`: freshness assessment and disclosure rules.
- Create `packages/research-media-tools/tests/freshness-audit-service.test.ts`: stale/current/latest-available tests.
- Create `packages/research-media-tools/src/research/evidence-bedrock-service.ts`: evidence card generation from research package and audit.
- Create `packages/research-media-tools/tests/evidence-bedrock-service.test.ts`: evidence card tests.
- Create `packages/research-media-tools/src/planning/visual-brief-planner.ts`: deterministic infographic brief planner and placement anchors.
- Create `packages/research-media-tools/tests/visual-brief-planner.test.ts`: visual brief tests.
- Modify `packages/research-media-tools/src/types.ts`: add public types for research plans, freshness audits, evidence cards, visual briefs, and topic packages.
- Modify `packages/research-media-tools/src/index.ts`: export new services.
- Modify `packages/cli/src/commands/tools.ts`: expose research search options.
- Modify `packages/cli/src/commands/write.ts`: add `write topic`.
- Create `packages/cli/src/write/topic-package-runner.ts`: orchestrate package output.
- Modify `packages/cli/src/index.ts`: inject the topic runner dependency.
- Modify `packages/cli/src/write/types.ts`: add topic write options/result types.
- Modify `packages/cli/tests/cli.test.ts`: command registration and option mapping tests.
- Create `packages/cli/tests/write/topic-package-runner.test.ts`: output package orchestration tests.
- Modify `README.md`: document `write topic` and output package shape.

---

### Task 1: Research Query Planner

**Files:**
- Create: `packages/research-media-tools/src/planning/research-query-planner.ts`
- Modify: `packages/research-media-tools/src/types.ts`
- Modify: `packages/research-media-tools/src/index.ts`
- Test: `packages/research-media-tools/tests/research-query-planner.test.ts`

- [ ] **Step 1: Add public research planning types**

Modify `packages/research-media-tools/src/types.ts` and append:

```ts
export type ResearchQueryIntent =
  | 'official_report'
  | 'official_blog'
  | 'product_announcement'
  | 'news_analysis'
  | 'counterpoint';

export interface PlannedResearchQuery {
  query: string;
  topic: 'general' | 'news';
  intent: ResearchQueryIntent;
  maxResults: number;
  timeRange?: 'day' | 'week' | 'month' | 'year';
}

export interface ResearchQueryPlan {
  topic: string;
  currentDate: string;
  queries: PlannedResearchQuery[];
}
```

- [ ] **Step 2: Write the failing query planner test**

Create `packages/research-media-tools/tests/research-query-planner.test.ts`:

```ts
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
```

- [ ] **Step 3: Run the failing test**

Run:

```bash
npm run test --workspace @ptce/research-media-tools -- research-query-planner.test.ts
```

Expected: FAIL because `planResearchQueries` is not exported.

- [ ] **Step 4: Implement deterministic query planning**

Create `packages/research-media-tools/src/planning/research-query-planner.ts`:

```ts
import type { ResearchQueryPlan } from '../types.js';

export interface PlanResearchQueriesInput {
  topic: string;
  currentDate: string;
  audience?: string;
}

export const planResearchQueries = ({
  topic,
  currentDate,
}: PlanResearchQueriesInput): ResearchQueryPlan => {
  const year = currentDate.slice(0, 4);
  const normalizedTopic = normalizeTopic(topic);

  return {
    topic,
    currentDate,
    queries: [
      {
        query: `${normalizedTopic} developer survey AI tools ${year} official report`,
        topic: 'general',
        intent: 'official_report',
        maxResults: 5,
        timeRange: 'year',
      },
      {
        query: `${normalizedTopic} AI developer trust agents ${year} official blog`,
        topic: 'general',
        intent: 'official_blog',
        maxResults: 5,
        timeRange: 'year',
      },
      {
        query: `GitHub Copilot coding agent frontend developers ${year} announcement`,
        topic: 'news',
        intent: 'product_announcement',
        maxResults: 5,
        timeRange: 'year',
      },
      {
        query: `OpenAI Codex Claude Code AI coding agent developers ${year} announcement`,
        topic: 'news',
        intent: 'product_announcement',
        maxResults: 5,
        timeRange: 'year',
      },
      {
        query: `AI generated code software delivery stability developers ${year} analysis`,
        topic: 'news',
        intent: 'news_analysis',
        maxResults: 5,
        timeRange: 'year',
      },
      {
        query: `AI coding tools developer skepticism trust accuracy ${year}`,
        topic: 'general',
        intent: 'counterpoint',
        maxResults: 5,
        timeRange: 'year',
      },
    ],
  };
};

const normalizeTopic = (topic: string): string => {
  if (/前端|frontend/i.test(topic)) {
    return 'frontend engineers';
  }

  return topic.trim();
};
```

Modify `packages/research-media-tools/src/index.ts`:

```ts
export * from './planning/research-query-planner.js';
```

- [ ] **Step 5: Run test to verify it passes**

Run:

```bash
npm run test --workspace @ptce/research-media-tools -- research-query-planner.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/research-media-tools/src/types.ts packages/research-media-tools/src/index.ts packages/research-media-tools/src/planning/research-query-planner.ts packages/research-media-tools/tests/research-query-planner.test.ts
git commit -m "feat: plan research queries for topics"
```

---

### Task 2: Freshness Audit Service

**Files:**
- Create: `packages/research-media-tools/src/research/freshness-audit-service.ts`
- Modify: `packages/research-media-tools/src/types.ts`
- Modify: `packages/research-media-tools/src/index.ts`
- Test: `packages/research-media-tools/tests/freshness-audit-service.test.ts`

- [ ] **Step 1: Add freshness audit types**

Append to `packages/research-media-tools/src/types.ts`:

```ts
export type SourceType =
  | 'annual_report'
  | 'survey_pulse'
  | 'product_announcement'
  | 'news'
  | 'analysis'
  | 'unknown';

export type SourceFreshness = 'current' | 'latest_available' | 'stale' | 'undated';

export interface FreshnessSourceAssessment {
  url: string;
  title: string;
  publishedAt?: string;
  sourceYear?: number;
  sourceType: SourceType;
  freshness: SourceFreshness;
  usageBoundary: string;
}

export interface FreshnessWarning {
  code:
    | 'stale_source'
    | 'missing_date'
    | 'latest_annual_not_current_year'
    | 'insufficient_current_year_sources';
  message: string;
  sourceUrl?: string;
}

export interface FreshnessAudit {
  currentDate: string;
  topicTimeSensitivity: 'low' | 'medium' | 'high';
  sources: FreshnessSourceAssessment[];
  warnings: FreshnessWarning[];
  requiredDisclosures: string[];
  pass: boolean;
}
```

- [ ] **Step 2: Write the failing freshness tests**

Create `packages/research-media-tools/tests/freshness-audit-service.test.ts`:

```ts
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
```

- [ ] **Step 3: Run the failing freshness tests**

Run:

```bash
npm run test --workspace @ptce/research-media-tools -- freshness-audit-service.test.ts
```

Expected: FAIL because `auditFreshness` is not exported.

- [ ] **Step 4: Implement freshness audit service**

Create `packages/research-media-tools/src/research/freshness-audit-service.ts`:

```ts
import type {
  FreshnessAudit,
  FreshnessSourceAssessment,
  FreshnessWarning,
  ResearchPackage,
  SourceType,
} from '../types.js';

export interface AuditFreshnessInput {
  currentDate: string;
  topicTimeSensitivity: 'low' | 'medium' | 'high';
  researchPackage: ResearchPackage;
}

export const auditFreshness = ({
  currentDate,
  topicTimeSensitivity,
  researchPackage,
}: AuditFreshnessInput): FreshnessAudit => {
  const currentYear = Number(currentDate.slice(0, 4));
  const sources = researchPackage.sources.map((source): FreshnessSourceAssessment => {
    const sourceYear = getSourceYear(source.publishedAt, source.title);
    const sourceType = inferSourceType(source.title, source.url);

    return {
      url: source.url,
      title: source.title,
      publishedAt: source.publishedAt,
      sourceYear,
      sourceType,
      freshness: assessFreshness({ currentYear, sourceYear, sourceType }),
      usageBoundary: buildUsageBoundary({ currentDate, sourceYear, sourceType }),
    };
  });
  const warnings = buildWarnings({ currentDate, currentYear, topicTimeSensitivity, sources });
  const requiredDisclosures = buildRequiredDisclosures({ currentDate, sources });

  return {
    currentDate,
    topicTimeSensitivity,
    sources,
    warnings,
    requiredDisclosures,
    pass: topicTimeSensitivity === 'high'
      ? !warnings.some((warning) => warning.code === 'insufficient_current_year_sources')
      : true,
  };
};

const inferSourceType = (title: string, url: string): SourceType => {
  const value = `${title} ${url}`.toLowerCase();
  if (/survey|developer survey|annual report|state of/.test(value)) {
    return 'annual_report';
  }
  if (/blog/.test(value)) {
    return 'survey_pulse';
  }
  if (/announcement|introducing|launch|released|press/.test(value)) {
    return 'product_announcement';
  }
  if (/news/.test(value)) {
    return 'news';
  }
  if (/analysis|report/.test(value)) {
    return 'analysis';
  }
  return 'unknown';
};

const getSourceYear = (publishedAt: string | undefined, title: string): number | undefined => {
  if (publishedAt && /^\\d{4}/.test(publishedAt)) {
    return Number(publishedAt.slice(0, 4));
  }

  const match = title.match(/20\\d{2}/);
  return match ? Number(match[0]) : undefined;
};

const assessFreshness = ({
  currentYear,
  sourceYear,
  sourceType,
}: {
  currentYear: number;
  sourceYear: number | undefined;
  sourceType: SourceType;
}): FreshnessSourceAssessment['freshness'] => {
  if (!sourceYear) {
    return 'undated';
  }
  if (sourceYear === currentYear) {
    return 'current';
  }
  if (sourceYear === currentYear - 1 && sourceType === 'annual_report') {
    return 'latest_available';
  }
  return 'stale';
};

const buildUsageBoundary = ({
  currentDate,
  sourceYear,
  sourceType,
}: {
  currentDate: string;
  sourceYear: number | undefined;
  sourceType: SourceType;
}): string => {
  if (!sourceYear) {
    return '来源未提供清晰发布时间，只能作为背景参考。';
  }
  if (sourceType === 'annual_report' && sourceYear < Number(currentDate.slice(0, 4))) {
    return `截至 ${currentDate}，该来源可作为最新已发布年度报告的基线，不能写成当前年份数据。`;
  }
  return `该来源可用于 ${sourceYear} 年相关事实锚定。`;
};

const buildWarnings = ({
  currentYear,
  topicTimeSensitivity,
  sources,
}: {
  currentDate: string;
  currentYear: number;
  topicTimeSensitivity: 'low' | 'medium' | 'high';
  sources: FreshnessSourceAssessment[];
}): FreshnessWarning[] => {
  const warnings: FreshnessWarning[] = [];
  const currentSources = sources.filter((source) => source.sourceYear === currentYear);

  for (const source of sources) {
    if (!source.sourceYear) {
      warnings.push({
        code: 'missing_date',
        message: `${source.title} 缺少明确发布时间。`,
        sourceUrl: source.url,
      });
    }
    if (source.freshness === 'stale') {
      warnings.push({
        code: 'stale_source',
        message: `${source.title} 对当前高时效主题偏旧。`,
        sourceUrl: source.url,
      });
    }
    if (source.freshness === 'latest_available') {
      warnings.push({
        code: 'latest_annual_not_current_year',
        message: `${source.title} 是上一年度报告，正文必须注明时效边界。`,
        sourceUrl: source.url,
      });
    }
  }

  if (topicTimeSensitivity === 'high' && currentSources.length < 2) {
    warnings.push({
      code: 'insufficient_current_year_sources',
      message: `高时效主题至少需要 2 个 ${currentYear} 年来源。`,
    });
  }

  return warnings;
};

const buildRequiredDisclosures = ({
  currentDate,
  sources,
}: {
  currentDate: string;
  sources: FreshnessSourceAssessment[];
}): string[] =>
  sources
    .filter((source) => source.freshness === 'latest_available')
    .map((source) => `截至 ${currentDate}，${source.title} 作为最新已发布年度报告使用，本文不把它写成当前年份数据。`);
```

Modify `packages/research-media-tools/src/index.ts`:

```ts
export * from './research/freshness-audit-service.js';
```

- [ ] **Step 5: Run freshness tests**

Run:

```bash
npm run test --workspace @ptce/research-media-tools -- freshness-audit-service.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/research-media-tools/src/types.ts packages/research-media-tools/src/index.ts packages/research-media-tools/src/research/freshness-audit-service.ts packages/research-media-tools/tests/freshness-audit-service.test.ts
git commit -m "feat: audit research source freshness"
```

---

### Task 3: Evidence Bedrock Service

**Files:**
- Create: `packages/research-media-tools/src/research/evidence-bedrock-service.ts`
- Modify: `packages/research-media-tools/src/types.ts`
- Modify: `packages/research-media-tools/src/index.ts`
- Test: `packages/research-media-tools/tests/evidence-bedrock-service.test.ts`

- [ ] **Step 1: Add evidence bedrock types**

Append to `packages/research-media-tools/src/types.ts`:

```ts
export interface EvidenceCard {
  id: string;
  claim: string;
  sourceUrls: string[];
  sourceBoundary: string;
  freshness: SourceFreshness;
  quoteSafeSummary: string;
}

export interface EvidenceBedrock {
  id: string;
  topic: string;
  cards: EvidenceCard[];
  requiredDisclosures: string[];
  createdAt: string;
}
```

- [ ] **Step 2: Write the failing evidence tests**

Create `packages/research-media-tools/tests/evidence-bedrock-service.test.ts`:

```ts
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
```

- [ ] **Step 3: Run failing evidence tests**

Run:

```bash
npm run test --workspace @ptce/research-media-tools -- evidence-bedrock-service.test.ts
```

Expected: FAIL because `createEvidenceBedrock` is not exported.

- [ ] **Step 4: Implement evidence bedrock service**

Create `packages/research-media-tools/src/research/evidence-bedrock-service.ts`:

```ts
import type {
  EvidenceBedrock,
  EvidenceBlock,
  EvidenceCard,
  FreshnessAudit,
  ResearchPackage,
} from '../types.js';

export interface CreateEvidenceBedrockInput {
  topic: string;
  researchPackage: ResearchPackage;
  freshnessAudit: FreshnessAudit;
  now?: string;
}

export const createEvidenceBedrock = ({
  topic,
  researchPackage,
  freshnessAudit,
  now = new Date().toISOString(),
}: CreateEvidenceBedrockInput): EvidenceBedrock => {
  const cards = researchPackage.evidenceBlocks.map((block, index) =>
    toEvidenceCard({ block, index, freshnessAudit }),
  );

  return {
    id: `evidence-bedrock-${stableId(topic)}`,
    topic,
    cards,
    requiredDisclosures: freshnessAudit.requiredDisclosures,
    createdAt: now,
  };
};

const toEvidenceCard = ({
  block,
  index,
  freshnessAudit,
}: {
  block: EvidenceBlock;
  index: number;
  freshnessAudit: FreshnessAudit;
}): EvidenceCard => {
  const assessment = freshnessAudit.sources.find((source) => source.url === block.sourceUrl);

  return {
    id: `evidence-card-${index + 1}`,
    claim: summarizeClaim(block.text),
    sourceUrls: [block.sourceUrl],
    sourceBoundary: assessment?.usageBoundary ?? '该来源只可作为背景材料使用。',
    freshness: assessment?.freshness ?? 'undated',
    quoteSafeSummary: block.text.slice(0, 240),
  };
};

const summarizeClaim = (text: string): string =>
  text.replace(/\\s+/g, ' ').trim().slice(0, 180);

const stableId = (value: string): string =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 48) || 'topic';
```

Modify `packages/research-media-tools/src/index.ts`:

```ts
export * from './research/evidence-bedrock-service.js';
```

- [ ] **Step 5: Run evidence tests**

Run:

```bash
npm run test --workspace @ptce/research-media-tools -- evidence-bedrock-service.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/research-media-tools/src/types.ts packages/research-media-tools/src/index.ts packages/research-media-tools/src/research/evidence-bedrock-service.ts packages/research-media-tools/tests/evidence-bedrock-service.test.ts
git commit -m "feat: build evidence cards from research"
```

---

### Task 4: Visual Brief Planner

**Files:**
- Create: `packages/research-media-tools/src/planning/visual-brief-planner.ts`
- Modify: `packages/research-media-tools/src/types.ts`
- Modify: `packages/research-media-tools/src/index.ts`
- Test: `packages/research-media-tools/tests/visual-brief-planner.test.ts`

- [ ] **Step 1: Add visual brief types**

Append to `packages/research-media-tools/src/types.ts`:

```ts
export type VisualBriefRole = 'section_summary' | 'concept_map' | 'comparison' | 'workflow' | 'dashboard';
export type VisualBriefStyle = 'wechat_infographic' | 'dark_dashboard' | 'product_map';

export interface VisualBrief {
  id: string;
  sectionId: string;
  placementAfterAnchor: string;
  role: VisualBriefRole;
  coreMessage: string;
  chartText: string[];
  style: VisualBriefStyle;
  prompt: string;
  negativePrompt: string;
}
```

- [ ] **Step 2: Write the failing visual brief tests**

Create `packages/research-media-tools/tests/visual-brief-planner.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { planVisualBriefs } from '../src/index.js';

describe('planVisualBriefs', () => {
  it('binds infographic briefs to section conclusions instead of openings', () => {
    const briefs = planVisualBriefs({
      topic: '前端工程师在 AI 时代的出路',
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
      ],
    });

    expect(briefs).toHaveLength(2);
    expect(briefs[0]).toMatchObject({
      sectionId: 's1',
      role: 'comparison',
      style: 'wechat_infographic',
      placementAfterAnchor: '更准确的变化是，代码产出本身正在变便宜，但好软件没有变便宜。',
    });
    expect(briefs[0].prompt).toContain('中文科技信息图');
    expect(briefs[0].prompt).toContain('前端价值迁移');
  });
});
```

- [ ] **Step 3: Run failing visual brief tests**

Run:

```bash
npm run test --workspace @ptce/research-media-tools -- visual-brief-planner.test.ts
```

Expected: FAIL because `planVisualBriefs` is not exported.

- [ ] **Step 4: Implement visual brief planner**

Create `packages/research-media-tools/src/planning/visual-brief-planner.ts`:

```ts
import type { VisualBrief } from '../types.js';

export interface PlanVisualBriefsInput {
  topic: string;
  sections: Array<{
    id: string;
    title: string;
    text: string;
  }>;
}

export const planVisualBriefs = ({ topic, sections }: PlanVisualBriefsInput): VisualBrief[] =>
  sections.slice(0, 4).map((section, index) => buildBrief({ topic, section, index }));

const buildBrief = ({
  topic,
  section,
  index,
}: {
  topic: string;
  section: { id: string; title: string; text: string };
  index: number;
}): VisualBrief => {
  const role = index === 0 ? 'comparison' : index === 3 ? 'dashboard' : 'concept_map';
  const style = role === 'dashboard' ? 'dark_dashboard' : 'wechat_infographic';
  const coreMessage = inferCoreMessage(section.text);

  return {
    id: `visual-brief-${index + 1}`,
    sectionId: section.id,
    placementAfterAnchor: section.text,
    role,
    coreMessage,
    chartText: buildChartText(coreMessage),
    style,
    prompt: buildPrompt({ topic, role, style, coreMessage }),
    negativePrompt: '不要通用办公插画，不要真人照片，不要长段文字，不要英文标签，不要喧宾夺主。',
  };
};

const inferCoreMessage = (text: string): string => {
  if (text.includes('代码产出') && text.includes('好软件')) {
    return '前端价值迁移：代码产出变便宜，体验和约束更值钱';
  }
  if (text.includes('约束设计者')) {
    return '前端把混乱需求和工程约束整理成界面状态系统';
  }
  if (text.includes('体验')) {
    return '前端定义 AI 产品的用户信任路径';
  }
  return text.slice(0, 80);
};

const buildChartText = (coreMessage: string): string[] => {
  if (coreMessage.includes('价值迁移')) {
    return ['下降的技能', 'AI 代码生成加速', '上升的技能', '不是转行，是换一种值钱法'];
  }
  if (coreMessage.includes('约束')) {
    return ['需求不清', '接口异常', '权限状态', '约束设计者', '界面状态矩阵'];
  }
  return ['输入', '状态', '风险', '验收', '结论'];
};

const buildPrompt = ({
  topic,
  role,
  style,
  coreMessage,
}: {
  topic: string;
  role: VisualBrief['role'];
  style: VisualBrief['style'];
  coreMessage: string;
}): string =>
  [
    `16:9 中文科技信息图，用于微信公众号文章《${topic}》。`,
    `主题：${coreMessage}。`,
    `图形类型：${role}，视觉风格：${style}。`,
    '要求：清晰中文大标题，图标、箭头、卡片、结论条，帮助读者理解文章观点。',
  ].join('');
```

Modify `packages/research-media-tools/src/index.ts`:

```ts
export * from './planning/visual-brief-planner.js';
```

- [ ] **Step 5: Run visual brief tests**

Run:

```bash
npm run test --workspace @ptce/research-media-tools -- visual-brief-planner.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/research-media-tools/src/types.ts packages/research-media-tools/src/index.ts packages/research-media-tools/src/planning/visual-brief-planner.ts packages/research-media-tools/tests/visual-brief-planner.test.ts
git commit -m "feat: plan infographic visual briefs"
```

---

### Task 5: Tools Research CLI Options

**Files:**
- Modify: `packages/cli/src/commands/tools.ts`
- Test: `packages/cli/tests/cli.test.ts`

- [ ] **Step 1: Write the failing CLI test**

Add this test to `packages/cli/tests/cli.test.ts` after the existing tools search web test:

```ts
  it('passes freshness-oriented options to tools research', async () => {
    const stdout = createCaptureStream();
    const createResearchPackage = vi.fn().mockResolvedValue({
      id: 'research-package-ai',
      querySet: [],
      sources: [],
      evidenceBlocks: [],
      unresolvedQuestions: [],
      warnings: [],
      createdAt: '2026-05-04T00:00:00.000Z',
    });
    const program = buildProgram({
      stdout,
      createToolsProvider: () => ({
        async searchWeb() {
          return {
            query: 'unused',
            provider: 'mock',
            results: [],
          };
        },
        async extractPage() {
          return {
            url: 'https://example.com',
            extractedAt: '2026-05-04T00:00:00.000Z',
            textContent: '',
            evidenceBlocks: [],
            images: [],
            warnings: [],
          };
        },
      }),
      createResearchPackage,
    });

    await program.parseAsync([
      'node',
      'ptce',
      'tools',
      'research',
      '--query',
      'AI developer survey',
      '--topic',
      'news',
      '--max-results',
      '8',
      '--time-range',
      'year',
      '--include-raw-content',
      '--render',
      'json',
    ]);

    expect(createResearchPackage).toHaveBeenCalledWith(expect.objectContaining({
      queries: [
        {
          query: 'AI developer survey',
          topic: 'news',
          maxResults: 8,
          timeRange: 'year',
          includeRawContent: true,
        },
      ],
    }));
  });
```

This test requires adding an injectable `createResearchPackage` dependency. If the current `BuildProgramDependencies` does not have it, the test should fail at TypeScript/runtime level.

- [ ] **Step 2: Run failing CLI test**

Run:

```bash
npm run test --workspace @ptce/cli -- cli.test.ts
```

Expected: FAIL because `buildProgram` does not accept `createResearchPackage`, and `tools research` does not expose the new options.

- [ ] **Step 3: Add injectable research package dependency**

Modify `packages/cli/src/commands/tools.ts`:

```ts
type CreateResearchPackage = typeof createResearchPackage;

interface ToolsCommandDependencies {
  createToolsProvider: () => Partial<ResearchMediaProvider>;
  createResearchPackage?: CreateResearchPackage;
  stdout: Writer;
}
```

Inside `registerToolsCommands`, set:

```ts
const createResearch = dependencies.createResearchPackage ?? createResearchPackage;
```

This requires changing the function signature to name the dependencies object:

```ts
export const registerToolsCommands = (
  program: Command,
  dependencies: ToolsCommandDependencies,
): void => {
  const { createToolsProvider, stdout } = dependencies;
  const createResearch = dependencies.createResearchPackage ?? createResearchPackage;
```

- [ ] **Step 4: Expose research CLI options**

Modify the `tools research` command in `packages/cli/src/commands/tools.ts`:

```ts
      .requiredOption('--query <query>', 'Research query')
      .option('--topic <topic>', 'Search topic', 'news')
      .option('--max-results <count>', 'Max search results', parsePositiveInt)
      .option('--time-range <range>', 'Search time range (day, week, month, year)', createChoiceParser(['day', 'week', 'month', 'year'] as const, '--time-range'))
      .option('--include-raw-content', 'Include raw provider content', false)
      .action(async (options: CommonOptions & {
        query: string;
        topic: 'general' | 'news';
        maxResults?: number;
        timeRange?: 'day' | 'week' | 'month' | 'year';
        includeRawContent: boolean;
      }) => {
        const provider = createToolsProvider() as ResearchMediaProvider;
        const result = await createResearch({
          queries: [{
            query: options.query,
            topic: options.topic,
            maxResults: options.maxResults,
            timeRange: options.timeRange,
            includeRawContent: options.includeRawContent,
          }],
          provider,
        });
        writeRenderedOutput(stdout, result, options.render);
      }),
```

Add a local parser near the bottom:

```ts
const parsePositiveInt = (value: string): number => {
  if (!/^\\d+$/.test(value)) {
    throw new InvalidArgumentError('--max-results must be a positive integer');
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new InvalidArgumentError('--max-results must be a positive integer');
  }
  return parsed;
};
```

Import `InvalidArgumentError` from commander:

```ts
import { Command, InvalidArgumentError } from 'commander';
```

- [ ] **Step 5: Thread dependency through buildProgram**

Modify `packages/cli/src/index.ts`:

```ts
import {
  createDefaultToolsProvider,
  registerToolsCommands,
  type CreateResearchPackageLike,
} from './commands/tools.js';
```

Add to `BuildProgramDependencies`:

```ts
createResearchPackage?: CreateResearchPackageLike;
```

Pass into `registerToolsCommands`:

```ts
registerToolsCommands(program, {
  createToolsProvider,
  createResearchPackage,
  stdout,
});
```

- [ ] **Step 6: Run CLI tests**

Run:

```bash
npm run test --workspace @ptce/cli -- cli.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/cli/src/index.ts packages/cli/src/commands/tools.ts packages/cli/tests/cli.test.ts
git commit -m "feat: expose research freshness options"
```

---

### Task 6: Topic Package Runner MVP

**Files:**
- Create: `packages/cli/src/write/topic-package-runner.ts`
- Modify: `packages/cli/src/write/types.ts`
- Modify: `packages/cli/src/commands/write.ts`
- Modify: `packages/cli/src/index.ts`
- Test: `packages/cli/tests/write/topic-package-runner.test.ts`
- Test: `packages/cli/tests/cli.test.ts`

- [ ] **Step 1: Add topic write types**

Append to `packages/cli/src/write/types.ts`:

```ts
export interface TopicWriteOptions {
  topic: string;
  audience: string;
  purpose?: string;
  channel: ExportChannel;
  output: string;
  withRealResearch: boolean;
  withMedia: boolean;
  currentDate: string;
}

export interface TopicWriteResult {
  articlePath: string;
  packageDirectory: string;
  researchPackagePath: string;
  freshnessAuditPath: string;
  evidenceBedrockPath: string;
  visualBriefsPath: string;
  mediaPlanPath: string;
  layoutReportPath: string;
  assetDirectory: string;
}
```

- [ ] **Step 2: Write failing topic runner test**

Create `packages/cli/tests/write/topic-package-runner.test.ts`:

```ts
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { afterEach, describe, expect, it } from 'vitest';

import { createTopicPackageRunner } from '../../src/write/topic-package-runner.js';

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('createTopicPackageRunner', () => {
  it('writes an auditable topic package with research, freshness, evidence, visual briefs, and article', async () => {
    const root = await mkdtemp(join(tmpdir(), 'ptce-topic-'));
    tempDirs.push(root);
    const output = join(root, 'article.md');
    const runner = createTopicPackageRunner();

    const result = await runner.run({
      topic: '前端工程师在 AI 时代的出路',
      audience: '3-5年经验前端工程师',
      channel: 'wechat',
      output,
      withRealResearch: false,
      withMedia: false,
      currentDate: '2026-05-04',
    });

    expect(result.articlePath).toBe(output);
    expect(JSON.parse(await readFile(result.researchPackagePath, 'utf8'))).toMatchObject({
      id: expect.any(String),
    });
    expect(JSON.parse(await readFile(result.freshnessAuditPath, 'utf8'))).toMatchObject({
      currentDate: '2026-05-04',
    });
    expect(JSON.parse(await readFile(result.visualBriefsPath, 'utf8'))).toHaveLength(4);
    expect(await readFile(output, 'utf8')).toContain('# 前端工程师在 AI 时代的出路');
  });
});
```

- [ ] **Step 3: Run failing topic runner test**

Run:

```bash
npm run test --workspace @ptce/cli -- topic-package-runner.test.ts
```

Expected: FAIL because `topic-package-runner.ts` does not exist.

- [ ] **Step 4: Implement topic package runner**

Create `packages/cli/src/write/topic-package-runner.ts`:

```ts
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
  ].join('\\n');

const writeJson = async (path: string, value: unknown): Promise<void> => {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\\n`);
};

const slugify = (value: string): string =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 48) || 'topic';
```

- [ ] **Step 5: Run topic runner test**

Run:

```bash
npm run test --workspace @ptce/cli -- topic-package-runner.test.ts
```

Expected: PASS.

- [ ] **Step 6: Add write topic command test**

Add to `packages/cli/tests/cli.test.ts`:

```ts
  it('maps write topic options into the topic package runner', async () => {
    const stdout = createCaptureStream();
    const run = vi.fn().mockResolvedValue({
      articlePath: '/tmp/article.md',
      packageDirectory: '/tmp',
      researchPackagePath: '/tmp/research-package.json',
      freshnessAuditPath: '/tmp/freshness-audit.json',
      evidenceBedrockPath: '/tmp/evidence-bedrock.json',
      visualBriefsPath: '/tmp/visual-briefs.json',
      mediaPlanPath: '/tmp/media-plan.json',
      layoutReportPath: '/tmp/layout-report.json',
      assetDirectory: '/tmp/assets',
    });
    const program = buildProgram({
      stdout,
      createTopicPackageRunner: () => ({ run }),
    });

    await program.parseAsync([
      'node',
      'ptce',
      'write',
      'topic',
      '--topic',
      '前端工程师在 AI 时代的出路',
      '--audience',
      '3-5年经验前端工程师',
      '--channel',
      'wechat',
      '--output',
      '/tmp/article.md',
      '--with-real-research',
      '--with-media',
      '--current-date',
      '2026-05-04',
      '--render',
      'json',
    ]);

    expect(run).toHaveBeenCalledWith({
      topic: '前端工程师在 AI 时代的出路',
      audience: '3-5年经验前端工程师',
      channel: 'wechat',
      output: '/tmp/article.md',
      purpose: undefined,
      withRealResearch: true,
      withMedia: true,
      currentDate: '2026-05-04',
    });
    expect(JSON.parse(stdout.output).articlePath).toBe('/tmp/article.md');
  });
```

- [ ] **Step 7: Run failing command test**

Run:

```bash
npm run test --workspace @ptce/cli -- cli.test.ts
```

Expected: FAIL because `write topic` is not registered.

- [ ] **Step 8: Implement write topic command**

Modify `packages/cli/src/commands/write.ts`.

Add import:

```ts
import type { TopicWriteOptions, TopicWriteResult } from '../write/types.js';
```

Add dependency:

```ts
export interface TopicPackageRunnerLike {
  run(options: TopicWriteOptions): Promise<TopicWriteResult>;
}
```

Extend `WriteCommandDependencies`:

```ts
createTopicPackageRunner: () => TopicPackageRunnerLike;
```

Add interface:

```ts
interface TopicCommandOptions extends CommonOptions {
  topic: string;
  audience: string;
  purpose?: string;
  channel: ExportChannel;
  output: string;
  withRealResearch: boolean;
  withMedia: boolean;
  currentDate: string;
}
```

Inside `registerWriteCommands`, after `write.project`, add:

```ts
  withCommonOptions(
    write
      .command('topic')
      .description('Generate an auditable article package from a topic')
      .requiredOption('--topic <topic>', 'Writing topic')
      .requiredOption('--audience <audience>', 'Target reader')
      .option('--purpose <purpose>', 'Writing purpose')
      .option(
        '--channel <channel>',
        `Preferred channel (${CHANNELS.join(', ')})`,
        createChoiceParser(CHANNELS, '--channel'),
        'wechat',
      )
      .requiredOption('--output <path>', 'Article markdown output path')
      .option('--with-real-research', 'Require real research providers', false)
      .option('--with-media', 'Generate media assets', false)
      .requiredOption('--current-date <date>', 'Current date in YYYY-MM-DD format')
      .action(async (options: TopicCommandOptions) => {
        const runner = createTopicPackageRunner();
        const result = await runner.run({
          topic: options.topic,
          audience: options.audience,
          purpose: options.purpose,
          channel: options.channel,
          output: options.output,
          withRealResearch: options.withRealResearch,
          withMedia: options.withMedia,
          currentDate: options.currentDate,
        });

        writeRenderedOutput(stdout, result, options.render);
      }),
  );
```

- [ ] **Step 9: Thread runner through buildProgram**

Modify `packages/cli/src/index.ts`:

```ts
import { createTopicPackageRunner } from './write/topic-package-runner.js';
```

Add to `BuildProgramDependencies`:

```ts
createTopicPackageRunner?: typeof createTopicPackageRunner;
```

Default destructuring:

```ts
createTopicPackageRunner = createTopicPackageRunner,
```

If name shadowing is awkward, import as:

```ts
import { createTopicPackageRunner as defaultCreateTopicPackageRunner } from './write/topic-package-runner.js';
```

Then default:

```ts
createTopicPackageRunner = defaultCreateTopicPackageRunner,
```

Pass to `registerWriteCommands`:

```ts
registerWriteCommands(program, {
  createApiClient,
  createWriteProjectRunner,
  createTopicPackageRunner,
  stdout,
});
```

- [ ] **Step 10: Run CLI and topic runner tests**

Run:

```bash
npm run test --workspace @ptce/cli -- cli.test.ts topic-package-runner.test.ts
```

Expected: PASS.

- [ ] **Step 11: Commit**

```bash
git add packages/cli/src/index.ts packages/cli/src/commands/write.ts packages/cli/src/write/types.ts packages/cli/src/write/topic-package-runner.ts packages/cli/tests/cli.test.ts packages/cli/tests/write/topic-package-runner.test.ts
git commit -m "feat: add topic article package command"
```

---

### Task 7: Documentation And Full Verification

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update README with topic package command**

Add under the CLI section:

```md
### 从主题生成文章输出包

```bash
node --env-file=.env.local --import tsx packages/cli/src/index.ts write topic \
  --topic "前端工程师在 AI 时代的出路" \
  --audience "3-5年经验前端工程师" \
  --channel wechat \
  --output /Users/a1234/Workspace/youmind/outputs/frontend-engineer-ai-era-wechat.md \
  --with-real-research \
  --with-media \
  --current-date 2026-05-04 \
  --render json
```

输出同级 package 文件：

- `research-package.json`
- `freshness-audit.json`
- `evidence-bedrock.json`
- `visual-briefs.json`
- `media-plan.json`
- `layout-report.json`
- `assets/`
```

- [ ] **Step 2: Run full verification**

Run:

```bash
npm run test --workspace @ptce/research-media-tools
npm run test --workspace @ptce/cli
```

Expected:

```text
@ptce/research-media-tools: all test files pass
@ptce/cli: all test files pass
```

- [ ] **Step 3: Commit docs**

```bash
git add README.md
git commit -m "docs: document topic article package workflow"
```

- [ ] **Step 4: Final status check**

Run:

```bash
git status --short
```

Expected: no tracked changes.


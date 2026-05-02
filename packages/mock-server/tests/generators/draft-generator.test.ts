import { describe, expect, it } from 'vitest';

import type { ArticleOutline, InformationBedrock, WritingTask } from '@ptce/shared';

import { generateDraftMarkdown } from '../../src/generators/draft-generator.js';

const retrospectiveTask: WritingTask = {
  id: 'task-1',
  title: 'AI Homework Review 的 vibecoding 实践分享',
  articleType: 'build-retrospective',
  preferredChannel: 'blog',
  reader: '对 agent 感兴趣但还没真正上手的开发者',
  stage: 'collecting_materials',
  createdAt: '2026-04-26T00:00:00.000Z',
  updatedAt: '2026-04-26T00:00:00.000Z',
};

const genericTask: WritingTask = {
  id: 'task-2',
  title: 'Fiber Architecture Notes',
  articleType: 'deep-dive',
  preferredChannel: 'blog',
  reader: '工程团队',
  stage: 'collecting_materials',
  createdAt: '2026-04-26T00:00:00.000Z',
  updatedAt: '2026-04-26T00:00:00.000Z',
};

const productFlowTask: WritingTask = {
  id: 'task-3',
  title: '通知中心链路复盘',
  articleType: 'build-retrospective',
  preferredChannel: 'blog',
  reader: '负责业务联调的工程师',
  stage: 'collecting_materials',
  createdAt: '2026-04-26T00:00:00.000Z',
  updatedAt: '2026-04-26T00:00:00.000Z',
};

const bedrock: InformationBedrock = {
  id: 'bedrock-1',
  taskId: retrospectiveTask.id,
  theme: retrospectiveTask.title,
  coreQuestion: '看起来像通了，其实没通，问题到底出在哪？',
  arguments: [
    '先把项目做成可验证的最小闭环。',
    '先把空白期的起步动作做出来。',
    '再把真实链路打通，而不是停留在演示态。',
    '随着 batch review 和异步流程加入，系统开始复杂化。',
    '工程收口时，需要把边界、依赖和执行方式定下来。',
    '最后要回到什么是真实可用。',
  ],
  evidence: [
    '写作任务说明',
    '从假演示到真实可用',
    '最近项目演进时间线',
  ],
  uncertainties: [],
  confirmed: true,
};

const productFlowBedrock: InformationBedrock = {
  id: 'bedrock-2',
  taskId: productFlowTask.id,
  theme: productFlowTask.title,
  coreQuestion: '接口已经返回了，为什么用户侧状态还是没跟上？',
  arguments: [
    '先把入口和回写分开看清楚。',
    '把路由和状态回写串成一条可验证的链路。',
    '再用日志和错误提示确认问题点。',
    '最后把收口的判断落到数据链路上。',
  ],
  evidence: [
    '接口草稿',
    '状态记录',
    '联调备注',
  ],
  uncertainties: [],
  confirmed: true,
};

const retrospectiveOutline: ArticleOutline = {
  id: 'outline-1',
  taskId: retrospectiveTask.id,
  title: retrospectiveTask.title,
  confirmed: true,
  sections: [
    { title: '开场问题', goal: bedrock.coreQuestion, evidenceRefs: ['写作任务说明'] },
    { title: '项目起步', goal: bedrock.arguments[0], evidenceRefs: ['写作任务说明'] },
    { title: '真实链路打通', goal: bedrock.arguments[2], evidenceRefs: ['从假演示到真实可用'] },
    { title: '项目复杂化', goal: bedrock.arguments[3], evidenceRefs: ['最近项目演进时间线'] },
    { title: '工程收口', goal: bedrock.arguments[4], evidenceRefs: ['最近项目演进时间线'] },
    { title: '最后的判断', goal: bedrock.arguments[5], evidenceRefs: ['从假演示到真实可用'] },
  ],
};

const productFlowOutline: ArticleOutline = {
  id: 'outline-2',
  taskId: productFlowTask.id,
  title: productFlowTask.title,
  confirmed: true,
  sections: [
    { title: '开场问题', goal: productFlowBedrock.coreQuestion, evidenceRefs: ['接口草稿'] },
    { title: '项目起步', goal: productFlowBedrock.arguments[0], evidenceRefs: ['接口草稿'] },
    { title: '真实链路打通', goal: productFlowBedrock.arguments[1], evidenceRefs: ['状态记录'] },
    { title: '项目复杂化', goal: productFlowBedrock.arguments[2], evidenceRefs: ['联调备注'] },
    { title: '工程收口', goal: productFlowBedrock.arguments[3], evidenceRefs: ['状态记录'] },
    { title: '最后的判断', goal: productFlowBedrock.arguments[3], evidenceRefs: ['联调备注'] },
  ],
};

const genericOutline: ArticleOutline = {
  id: 'outline-3',
  taskId: genericTask.id,
  title: genericTask.title,
  confirmed: true,
  sections: [
    {
      title: 'Why this matters',
      goal: bedrock.coreQuestion,
      evidenceRefs: ['写作任务说明', '从假演示到真实可用'],
    },
  ],
};

describe('generateDraftMarkdown', () => {
  it('starts with the concrete problem and gives each retrospective section real body prose', () => {
    const markdown = generateDraftMarkdown(retrospectiveTask, bedrock, retrospectiveOutline);
    const [lead, ...sectionBlocks] = markdown.split(/\n## /);
    const retrospectiveBlocks = sectionBlocks.slice(0, retrospectiveOutline.sections.length);
    const concreteTerms = [
      'API',
      '状态流转',
      '批量批改',
      '异步任务',
      '路由',
      '队列',
      '数据链路',
    ];

    expect(markdown.length).toBeGreaterThan(1200);
    expect(markdown.length).toBeLessThan(1900);
    expect(markdown).toContain(`# `);
    expect(markdown).not.toContain('Reader:');
    expect(markdown).not.toContain('Core question:');
    expect(markdown).not.toContain('Evidence anchors:');
    expect(markdown).not.toMatch(/^-\s/m);
    expect(markdown).not.toContain('写作任务说明');
    expect(markdown).not.toContain('从假演示到真实可用');
    expect(markdown).not.toContain('最近项目演进时间线');
    expect(markdown).not.toContain('我把这篇稿子写成');
    expect(markdown).not.toContain('这一节的结论很直接');
    expect(markdown).not.toContain('回头看，这一段解决的不是抽象概念');
    expect(markdown).not.toContain('## 结尾');
    expect(markdown.trim()).toMatch(/项目才算真的从演示走到可用。$/);
    expect(markdown).toContain('所以这篇复盘最后留下的，不是模板化的方法论');
    expect(lead).toContain(`${bedrock.coreQuestion}`);
    expect(lead).toContain('最直接的失败模式');

    expect(retrospectiveBlocks.length).toBe(retrospectiveOutline.sections.length);
    expect(retrospectiveBlocks[0]).toContain('第一道墙');
    expect(retrospectiveBlocks[1]).toContain('最小闭环');
    expect(retrospectiveBlocks[2]).toContain('可追踪');
    expect(retrospectiveBlocks[3]).toContain('批量批改');
    expect(retrospectiveBlocks[4]).toContain('工程边界');
    expect(retrospectiveBlocks[5]).toContain('反复验证');

    expect(new Set(retrospectiveBlocks).size).toBe(retrospectiveBlocks.length);

    expect(concreteTerms.filter((term) => markdown.includes(term)).length).toBeGreaterThanOrEqual(6);

    for (const block of retrospectiveBlocks) {
      const paragraphs = block
        .split('\n\n')
        .map((paragraph) => paragraph.trim())
        .filter(Boolean);
      const bodyParagraphs = paragraphs.slice(1);
      const proseParagraphs = bodyParagraphs.filter(
        (paragraph) => !paragraph.startsWith('所以这篇复盘最后留下的'),
      );

      expect(proseParagraphs.length).toBeGreaterThanOrEqual(3);
      expect(proseParagraphs.length).toBeLessThanOrEqual(4);
    }
  });

  it('stays concrete without hallucinating infra or batch-review language when the signals are absent', () => {
    const markdown = generateDraftMarkdown(productFlowTask, productFlowBedrock, productFlowOutline);

    expect(markdown.length).toBeGreaterThan(1000);
    expect(markdown).toContain('接口');
    expect(markdown).toContain('路由');
    expect(markdown).toContain('状态回写');
    expect(markdown).toContain('日志');
    expect(markdown).toContain('数据链路');
    expect(markdown).not.toContain('MySQL');
    expect(markdown).not.toContain('VPC');
    expect(markdown).not.toContain('batch review');
    expect(markdown).not.toContain('批量批改');
    expect(markdown).not.toContain('worker');
  });

  it('keeps the generic fallback output unchanged for non-target tasks', () => {
    const markdown = generateDraftMarkdown(genericTask, bedrock, genericOutline);

    expect(markdown).toContain(`# ${genericTask.title}`);
    expect(markdown).toContain('Reader: 工程团队');
    expect(markdown).toContain('Core question: 看起来像通了，其实没通，问题到底出在哪？');
    expect(markdown).toContain('Evidence anchors:');
    expect(markdown).toContain('- 写作任务说明');
  });
});

import { describe, expect, it } from 'vitest';

import { TaskStage, type Material, type WritingTask } from '@ptce/shared';

import { generateBedrock } from '../../src/generators/bedrock-generator.js';

const retrospectiveTask: WritingTask = {
  id: 'task-1',
  title: 'AI Homework Review 的 vibecoding 实践分享',
  articleType: 'build-retrospective',
  preferredChannel: 'blog',
  reader: '对 agent 感兴趣但还没真正上手的开发者',
  stage: TaskStage.CollectingMaterials,
  createdAt: '2026-04-26T00:00:00.000Z',
  updatedAt: '2026-04-26T00:00:00.000Z',
};

const genericTask: WritingTask = {
  id: 'task-2',
  title: 'Fiber Architecture Notes',
  articleType: 'deep-dive',
  preferredChannel: 'blog',
  reader: '工程团队',
  stage: TaskStage.CollectingMaterials,
  createdAt: '2026-04-26T00:00:00.000Z',
  updatedAt: '2026-04-26T00:00:00.000Z',
};

const retrospectiveMaterials: Material[] = [
  {
    id: 'm1',
    taskId: 'task-1',
    type: 'prompt',
    title: '写作任务说明',
    source: 'inline',
    content: '文章主轴是第一人称，按时间线讲我是怎么用 AI/agent 把这个项目做出来的。',
    createdAt: '2026-04-26T00:00:00.000Z',
  },
  {
    id: 'm2',
    taskId: 'task-1',
    type: 'article',
    title: '从假演示到真实可用',
    source: 'obsidian',
    content: '做 AI 产品最容易踩的一个坑，不是模型效果不够好，而是看起来像通了，其实没通。',
    createdAt: '2026-04-26T00:00:00.000Z',
    relativePath: 'docs/articles/2026-04-11.md',
  },
  {
    id: 'm3',
    taskId: 'task-1',
    type: 'note',
    title: '最近项目演进时间线',
    source: 'inline',
    content: '1638f56 feat: build offline batch review task center\n3c11695 fix: attach fc mysql access to vpc',
    createdAt: '2026-04-26T00:00:00.000Z',
  },
];

const genericMaterials: Material[] = [
  {
    id: 'm4',
    taskId: 'task-2',
    type: 'article',
    title: 'Fiber notes',
    source: 'inline',
    content: '# Fiber\nThis is a source note for the architecture article.',
    createdAt: '2026-04-26T00:00:00.000Z',
  },
];

describe('generateBedrock', () => {
  it('builds retrospective-oriented fields for build-retrospective tasks', () => {
    const bedrock = generateBedrock(retrospectiveTask, retrospectiveMaterials, 'blog');

    expect(bedrock.theme).toBe(retrospectiveTask.title);
    expect(bedrock.coreQuestion).toContain('看起来像通了');
    expect(bedrock.coreQuestion).not.toContain('How should');
    expect(bedrock.arguments[0]).toContain('第一人称');
    expect(bedrock.arguments[0]).toContain('AI/agent');
    expect(bedrock.arguments.join('\n')).toContain('offline batch review task center');
    expect(bedrock.arguments.join('\n')).toContain('VPC');
    expect(bedrock.arguments.join('\n')).toContain('真实可用');
    expect(bedrock.evidence).toEqual([
      '写作任务说明',
      '从假演示到真实可用 (docs/articles/2026-04-11.md)',
      '最近项目演进时间线',
    ]);
    expect(bedrock.uncertainties).toEqual([]);
  });

  it('keeps the generic fallback for non-retrospective tasks', () => {
    const bedrock = generateBedrock(genericTask, genericMaterials, 'blog');

    expect(bedrock.coreQuestion).toContain('How should');
    expect(bedrock.arguments[0]).toContain('Fiber');
    expect(bedrock.evidence).toEqual(['Fiber notes']);
  });

  it('keeps the generic fallback for build-retrospective tasks outside the blog lane', () => {
    const wechatTask: WritingTask = {
      ...retrospectiveTask,
      preferredChannel: 'wechat',
    };

    const bedrock = generateBedrock(wechatTask, retrospectiveMaterials, 'wechat');

    expect(bedrock.coreQuestion).toContain('How should');
    expect(bedrock.arguments[0]).toContain('写作任务说明');
    expect(bedrock.evidence).toEqual([
      '写作任务说明',
      '从假演示到真实可用 (docs/articles/2026-04-11.md)',
      '最近项目演进时间线',
    ]);
  });

  it('prefers the latest matching materials and keeps signal order stable', () => {
    const scrambledMaterials: Material[] = [
      {
        id: 'm-old-prompt',
        taskId: 'task-3',
        type: 'prompt',
        title: '旧写作任务说明',
        source: 'inline',
        content: '旧提示，没什么方向。',
        createdAt: '2026-04-01T00:00:00.000Z',
      },
      {
        id: 'm-new-prompt',
        taskId: 'task-3',
        type: 'prompt',
        title: '新写作任务说明',
        source: 'inline',
        content: '文章主轴是第一人称，按时间线讲我是怎么用 AI/agent 把这个项目做出来的。',
        createdAt: '2026-04-03T00:00:00.000Z',
      },
      {
        id: 'm-old-article',
        taskId: 'task-3',
        type: 'article',
        title: '旧文章',
        source: 'obsidian',
        content: '做 AI 产品最容易踩的一个坑，不是模型效果不够好，而是看起来像通了，其实没通。',
        createdAt: '2026-04-02T00:00:00.000Z',
      },
      {
        id: 'm-new-article',
        taskId: 'task-3',
        type: 'article',
        title: '新文章',
        source: 'obsidian',
        content: '新的开场问题是：看起来像通了，其实没通。',
        createdAt: '2026-04-04T00:00:00.000Z',
      },
      {
        id: 'm-old-timeline',
        taskId: 'task-3',
        type: 'note',
        title: 'timeline-a',
        source: 'inline',
        content: '111111 feat: mock demo',
        createdAt: '2026-04-01T12:00:00.000Z',
      },
      {
        id: 'm-new-timeline',
        taskId: 'task-3',
        type: 'note',
        title: 'timeline-b',
        source: 'inline',
        content: '222222 feat: build offline batch review task center',
        createdAt: '2026-04-05T12:00:00.000Z',
      },
      {
        id: 'm-scope-old',
        taskId: 'task-3',
        type: 'note',
        title: 'scope-a',
        source: 'inline',
        content: 'worker 要先接上。',
        createdAt: '2026-04-02T12:00:00.000Z',
      },
      {
        id: 'm-scope-new',
        taskId: 'task-3',
        type: 'note',
        title: 'scope-b',
        source: 'inline',
        content: 'MySQL 访问和 VPC 收口需要一起处理。',
        createdAt: '2026-04-06T12:00:00.000Z',
      },
    ];

    const bedrock = generateBedrock(
      {
        ...retrospectiveTask,
        id: 'task-3',
      },
      scrambledMaterials,
      'blog',
    );

    const output = bedrock.arguments.join('\n');

    expect(bedrock.arguments[0]).toContain('第一人称');
    expect(bedrock.coreQuestion).toContain('新的开场问题');
    expect(output).toContain('mock demo');
    expect(output).toContain('build offline batch review task center');
    expect(output.indexOf('mock demo')).toBeLessThan(output.indexOf('build offline batch review task center'));
    expect(output).toContain('worker 要先接上');
    expect(output).toContain('真正重要的是把看起来能跑的东西推进成真实可用。');
  });
});

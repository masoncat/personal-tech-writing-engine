import { describe, expect, it } from 'vitest';

import { TaskStage, type InformationBedrock, type WritingTask } from '@ptce/shared';

import { generateOutline } from '../../src/generators/outline-generator.js';

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

const retrospectiveWeChatTask: WritingTask = {
  ...retrospectiveTask,
  id: 'task-3',
  preferredChannel: 'wechat',
};

const bedrock: InformationBedrock = {
  id: 'bedrock-1',
  taskId: 'task-1',
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
    '写作任务说明：第一人称，按时间线讲清楚项目是怎么做出来的',
    '从假演示到真实可用：看起来像通了，其实没通',
    '最近项目演进时间线：offline batch review task center',
    '工程收口笔记：worker、VPC、MySQL',
    '复盘结论：真正重要的是把看起来能跑的东西推进成真实可用',
  ],
  uncertainties: ['还有哪些细节没有完全收口？'],
  confirmed: true,
};

const sparseRetrospectiveBedrock: InformationBedrock = {
  ...bedrock,
  id: 'bedrock-3',
  coreQuestion: '项目到底为什么看起来通了却没真的通？',
  arguments: ['先把项目做成可验证的最小闭环。'],
  evidence: ['unrelated note one', 'unrelated note two'],
};

describe('generateOutline', () => {
  it('uses the Chinese phase-based outline for build-retrospective blog tasks', () => {
    const outline = generateOutline(retrospectiveTask, bedrock);

    expect(outline.title).toBe(retrospectiveTask.title);
    expect(outline.sections).toEqual([
      {
        title: '开场问题',
        goal: bedrock.coreQuestion,
        evidenceRefs: [
          '写作任务说明：第一人称，按时间线讲清楚项目是怎么做出来的',
          '从假演示到真实可用：看起来像通了，其实没通',
        ],
      },
      {
        title: '项目起步',
        goal: bedrock.arguments[0],
        evidenceRefs: [
          '写作任务说明：第一人称，按时间线讲清楚项目是怎么做出来的',
          '从假演示到真实可用：看起来像通了，其实没通',
        ],
      },
      {
        title: '真实链路打通',
        goal: bedrock.arguments[2],
        evidenceRefs: [
          '从假演示到真实可用：看起来像通了，其实没通',
          '复盘结论：真正重要的是把看起来能跑的东西推进成真实可用',
        ],
      },
      {
        title: '项目复杂化',
        goal: bedrock.arguments[3],
        evidenceRefs: [
          '最近项目演进时间线：offline batch review task center',
          '工程收口笔记：worker、VPC、MySQL',
        ],
      },
      {
        title: '工程收口',
        goal: bedrock.arguments[4],
        evidenceRefs: [
          '工程收口笔记：worker、VPC、MySQL',
          '最近项目演进时间线：offline batch review task center',
        ],
      },
      {
        title: '最后的判断',
        goal: bedrock.arguments.at(-1),
        evidenceRefs: [
          '复盘结论：真正重要的是把看起来能跑的东西推进成真实可用',
          '最近项目演进时间线：offline batch review task center',
        ],
      },
    ]);
  });

  it('falls back to the generic English outline for build-retrospective wechat tasks', () => {
    const outline = generateOutline(retrospectiveWeChatTask, bedrock);

    expect(outline.sections).toEqual([
      {
        title: 'Why this matters',
        goal: bedrock.coreQuestion,
        evidenceRefs: [
          '写作任务说明：第一人称，按时间线讲清楚项目是怎么做出来的',
          '从假演示到真实可用：看起来像通了，其实没通',
        ],
      },
      {
        title: 'How the system works',
        goal: bedrock.arguments[0],
        evidenceRefs: [
          '写作任务说明：第一人称，按时间线讲清楚项目是怎么做出来的',
          '从假演示到真实可用：看起来像通了，其实没通',
        ],
      },
      {
        title: 'Tradeoffs and open questions',
        goal: bedrock.arguments[1],
        evidenceRefs: [
          '从假演示到真实可用：看起来像通了，其实没通',
          '最近项目演进时间线：offline batch review task center',
        ],
      },
    ]);
  });

  it('falls back on sparse retrospective input when section signals are missing', () => {
    const outline = generateOutline(retrospectiveTask, sparseRetrospectiveBedrock);

    expect(outline.sections).toEqual([
      {
        title: '开场问题',
        goal: sparseRetrospectiveBedrock.coreQuestion,
        evidenceRefs: ['unrelated note one', 'unrelated note two'],
      },
      {
        title: '项目起步',
        goal: sparseRetrospectiveBedrock.arguments[0],
        evidenceRefs: ['unrelated note one', 'unrelated note two'],
      },
      {
        title: '真实链路打通',
        goal: sparseRetrospectiveBedrock.arguments[0],
        evidenceRefs: ['unrelated note one', 'unrelated note two'],
      },
      {
        title: '项目复杂化',
        goal: sparseRetrospectiveBedrock.arguments[0],
        evidenceRefs: ['unrelated note one', 'unrelated note two'],
      },
      {
        title: '工程收口',
        goal: sparseRetrospectiveBedrock.arguments[0],
        evidenceRefs: ['unrelated note one', 'unrelated note two'],
      },
      {
        title: '最后的判断',
        goal: sparseRetrospectiveBedrock.arguments[0],
        evidenceRefs: ['unrelated note one', 'unrelated note two'],
      },
    ]);
  });

  it('keeps the generic English fallback for non-target tasks', () => {
    const outline = generateOutline(genericTask, bedrock);

    expect(outline.sections).toEqual([
      {
        title: 'Why this matters',
        goal: bedrock.coreQuestion,
        evidenceRefs: [
          '写作任务说明：第一人称，按时间线讲清楚项目是怎么做出来的',
          '从假演示到真实可用：看起来像通了，其实没通',
        ],
      },
      {
        title: 'How the system works',
        goal: bedrock.arguments[0],
        evidenceRefs: [
          '写作任务说明：第一人称，按时间线讲清楚项目是怎么做出来的',
          '从假演示到真实可用：看起来像通了，其实没通',
        ],
      },
      {
        title: 'Tradeoffs and open questions',
        goal: bedrock.arguments[1],
        evidenceRefs: [
          '从假演示到真实可用：看起来像通了，其实没通',
          '最近项目演进时间线：offline batch review task center',
        ],
      },
    ]);
  });
});

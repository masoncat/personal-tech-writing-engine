import { describe, expect, it } from 'vitest';

import type { ArticleVersion, StyleProfile } from '@ptce/shared';

import { rewriteMarkdown } from '../../src/generators/rewrite-generator.js';

const version: ArticleVersion = {
  id: 'version-1',
  taskId: 'task-1',
  versionType: 'draft',
  content: `# AI Homework Review 的 vibecoding 实践分享

看起来像通了，其实没通，问题到底出在哪？

## 开场问题

一开始撞上的第一道墙，是 API 已经能出结果，但路由和状态回写还没真正咬合。

我先把问题压回到可验证的链路上，重新看输入和状态流转。

## 项目起步

起步阶段做的第一件事，是把目标压成一个能验证的最小闭环。

我先从最小入口搭起接口，让一次请求能走到执行侧。

## 真实链路打通

真正把链路打通的时候，问题就从“能不能开始”变成了“每一跳是不是都是真的”。

我对照推进过程去核对路由和数据落点，发现需要把触发点和回写点一起收紧。

## 项目复杂化

当更多并行步骤进来以后，系统就不再只是单次执行，而是开始变成一串需要调度的动作。

我把并行处理、状态回写和执行侧的配合方式拆开。

## 工程收口

收口阶段看的是工程边界，不是功能想象。

我去看路由、日志和环境边界，确认哪些依赖必须收在一起。

## 最后的判断

最后的判断不在于用了多少技巧，而在于这条链路是不是已经能被反复验证。

回头看，我更愿意把 agent 当成一个推进器，而不是一个能替我做判断的人。`,
  basedOnBedrockId: 'bedrock-1',
  basedOnOutlineId: 'outline-1',
  styleProfileId: 'style-1',
  changeSummary: 'Initial draft',
};

const styleProfile: StyleProfile = {
  id: 'style-1',
  taskId: 'task-1',
  sourceMaterialIds: [],
  openingTraits: ['Start with the practical problem.'],
  rhythmTraits: ['Alternate short claims with one explanatory paragraph.'],
  explanationTraits: ['Name the mechanism before explaining the consequences.'],
  forbiddenPatterns: ['Do not overuse hype language.'],
  summary: 'Use a direct first-person retrospective voice with clear stakes.',
};

describe('rewriteMarkdown', () => {
  it('returns a cleaner retrospective article instead of appending metadata blocks', () => {
    const content = rewriteMarkdown(
      version,
      styleProfile,
      '更像第一人称复盘，强调 agent 的作用和边界。',
    );

    expect(content).toContain('# AI Homework Review 的 vibecoding 实践分享');
    expect(content).toContain('## 开场问题');
    expect(content).toContain('## 项目复杂化');
    expect(content).toContain('## 工程收口');
    expect(content).toContain('## 最后的判断');
    expect(content).toContain('我');
    expect(content).toContain('agent');
    expect(content).toContain('边界');
    expect(content).not.toContain(styleProfile.summary);
    expect(content).not.toContain('## Revision instruction');
    expect(content).not.toContain('## Style cues applied');
    expect(content).not.toContain('## Editorial note');
    expect(content).not.toContain('Revision instruction');
    expect(content).not.toContain('Style cues applied');
    expect(content).not.toContain('Editorial note');
    expect(content).not.toContain('我把这篇稿子写成');
    expect(content).not.toContain('把 把');
    expect(content).not.toContain('。。');
    expect(content).not.toContain('最先卡住的还是 一开始撞上的第一道墙');
    expect(content).not.toContain('复杂化之后，并行步骤进来以后');
    expect(content).not.toContain('不是功能想象，不是功能想象');
    expect(content).toContain('我把问题压回到可验证的链路上，重新看输入、路由和状态流转，先确认断点在哪。');
  });

  it('keeps normal mode on the full major outline while allowing short mode to compress', () => {
    const normal = rewriteMarkdown(version, styleProfile, '更像第一人称复盘，强调 agent 的作用和边界。');
    const short = rewriteMarkdown(version, styleProfile, '更短一点，保持第一人称，突出 agent 的作用和限制。');

    expect(normal).toContain('## 项目复杂化');
    expect(normal).toContain('## 工程收口');
    expect(normal).not.toContain(styleProfile.summary);
    expect(normal).not.toContain('把 把');
    expect(normal).not.toContain('。。');
    expect(normal).not.toContain('最先卡住的还是 一开始撞上的第一道墙');
    expect(normal).not.toContain('复杂化之后，并行步骤进来以后');
    expect(normal).not.toContain('不是功能想象，不是功能想象');
    expect(normal).toContain('工程收口看的是部署和边界，不是功能想象。');
    expect(normal).toContain('我让 agent 帮我梳理路由、日志和状态回写，确认每一跳是不是都真的落到了下一步。');
    expect(short.length).toBeLessThan(normal.length);
    expect(short).toContain('## 最后的判断');
    expect(short).not.toContain(styleProfile.summary);
    expect(short).not.toContain('最先卡住的还是 一开始撞上的第一道墙');
    expect(short).not.toContain('复杂化之后，并行步骤进来以后');
  });
});

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

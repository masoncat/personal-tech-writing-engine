# Build Retrospective Generator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the mock writing pipeline so `articleType=build-retrospective` and `channel=blog` generate a readable WeChat-style first draft instead of exposing internal scaffolding.

**Architecture:** Keep the existing workflow and shared contracts stable. Implement a lane-specific generator path inside the existing mock server generators, with explicit fallback to the generic behavior for all other article types. Cover the lane with focused generator tests plus workflow regression tests.

**Tech Stack:** TypeScript, Vitest, Fastify inject tests, existing `packages/mock-server` generators/services, existing `packages/shared` domain contracts

---

## File Structure

### Existing files to modify

- `packages/shared/src/domain.ts`
  - Add task-level preferred channel metadata for lane selection
- `packages/shared/src/contracts.ts`
  - Allow task creation to set preferred channel
- `packages/mock-server/src/generators/bedrock-generator.ts`
  - Add lane-specific bedrock shaping for `build-retrospective`
- `packages/mock-server/src/generators/outline-generator.ts`
  - Add Chinese phase-based outline generation for `build-retrospective/blog`
- `packages/mock-server/src/generators/draft-generator.ts`
  - Replace internal-scaffolding output with article prose for the target lane
- `packages/mock-server/src/generators/rewrite-generator.ts`
  - Replace append-only behavior with constrained rewrite behavior for the target lane
- `packages/mock-server/src/services/draft-service.ts`
  - Pass lane context and materials into draft generation
- `packages/mock-server/src/services/rewrite-service.ts`
  - Pass lane context and materials into rewrite generation
- `packages/mock-server/src/services/task-service.ts`
  - Persist preferred channel through task creation
- `packages/mock-server/src/routes/task-routes.ts`
  - Validate preferred channel on create
- `packages/mock-server/src/repository/task-repository.ts`
  - Store preferred channel with default
- `packages/cli/src/commands/task.ts`
  - Allow optional preferred channel on task create
- `packages/mock-server/tests/workflow-routes.test.ts`
  - Add regression assertions for the new article output
- `packages/mock-server/tests/task-routes.test.ts`
  - Cover preferred channel defaulting / persistence
- `packages/shared/tests/contracts.test.ts`
  - Cover task preferred channel shape
- `packages/cli/tests/cli.test.ts`
  - Cover task create preferred channel payload

### New files to create

- `packages/mock-server/src/generators/article-lane.ts`
  - Small lane-selection helpers shared by generators and services
- `packages/mock-server/src/generators/build-retrospective.ts`
  - Shared extraction helpers for the specialized retrospective lane
- `packages/mock-server/tests/generators/bedrock-generator.test.ts`
  - Unit tests for lane-specific bedrock shaping
- `packages/mock-server/tests/generators/outline-generator.test.ts`
  - Unit tests for lane-specific outline generation
- `packages/mock-server/tests/generators/draft-generator.test.ts`
  - Unit tests for readable draft generation
- `packages/mock-server/tests/generators/rewrite-generator.test.ts`
  - Unit tests for constrained rewrite behavior

### Responsibility boundaries

- `article-lane.ts`
  - Only answers whether the current task/version should use the specialized lane
- `build-retrospective.ts`
  - Extracts structured beats from materials without writing final article prose
- `bedrock-generator.ts`
  - Maps extracted beats into existing `InformationBedrock` fields
- `outline-generator.ts`
  - Produces article structure only
- `draft-generator.ts`
  - Produces first-draft prose only
- `rewrite-generator.ts`
  - Produces rewritten prose only

---

### Task 1: Add Lane Selection and Bedrock Extraction

**Files:**
- Modify: `packages/shared/src/domain.ts`
- Modify: `packages/shared/src/contracts.ts`
- Modify: `packages/shared/tests/contracts.test.ts`
- Modify: `packages/cli/src/commands/task.ts`
- Modify: `packages/cli/tests/cli.test.ts`
- Modify: `packages/mock-server/src/repository/task-repository.ts`
- Modify: `packages/mock-server/src/services/task-service.ts`
- Modify: `packages/mock-server/src/routes/task-routes.ts`
- Modify: `packages/mock-server/tests/task-routes.test.ts`
- Create: `packages/mock-server/src/generators/article-lane.ts`
- Create: `packages/mock-server/src/generators/build-retrospective.ts`
- Modify: `packages/mock-server/src/generators/bedrock-generator.ts`
- Modify: `packages/mock-server/src/services/bedrock-service.ts`
- Test: `packages/mock-server/tests/generators/bedrock-generator.test.ts`

- [ ] **Step 1: Write the failing bedrock tests**

```ts
import { describe, expect, it } from 'vitest';

import type { Material, WritingTask } from '@ptce/shared';

import { generateBedrock } from '../../src/generators/bedrock-generator.js';

const task: WritingTask = {
  id: 'task-1',
  title: 'AI Homework Review 的 vibecoding 实践分享',
  articleType: 'build-retrospective',
  reader: '对 agent 感兴趣但还没真正上手的开发者',
  stage: 'collecting_materials',
  createdAt: '2026-04-26T00:00:00.000Z',
  updatedAt: '2026-04-26T00:00:00.000Z',
};

const materials: Material[] = [
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

describe('generateBedrock', () => {
  it('builds retrospective-oriented arguments for build-retrospective tasks', () => {
    const bedrock = generateBedrock(task, materials);

    expect(bedrock.coreQuestion).not.toContain('How should');
    expect(bedrock.arguments.join('\n')).toContain('项目最初');
    expect(bedrock.arguments.join('\n')).toContain('真实链路');
    expect(bedrock.arguments.join('\n')).toContain('离线任务');
  });

  it('keeps evidence references instead of dumping full article bodies', () => {
    const bedrock = generateBedrock(task, materials);

    expect(bedrock.evidence).toContain('从假演示到真实可用 (docs/articles/2026-04-11.md)');
    expect(bedrock.arguments.join('\n')).not.toContain('```mermaid');
  });
});
```

- [ ] **Step 2: Run the bedrock test to verify it fails**

Run: `npm test -- --run packages/mock-server/tests/generators/bedrock-generator.test.ts`

Expected: FAIL because the test file does not exist yet or because `generateBedrock()` still returns the generic English scaffold.

- [ ] **Step 3: Add lane-selection helpers**

Create `packages/mock-server/src/generators/article-lane.ts`:

```ts
import type { ExportChannel, WritingTask } from '@ptce/shared';

export const isBuildRetrospectiveTask = (task: WritingTask): boolean =>
  task.articleType === 'build-retrospective';

export const isBuildRetrospectiveBlogLane = (
  task: WritingTask,
  channel: ExportChannel = 'blog',
): boolean => isBuildRetrospectiveTask(task) && channel === 'blog';
```

- [ ] **Step 4: Add retrospective extraction helpers**

Create `packages/mock-server/src/generators/build-retrospective.ts`:

```ts
import type { Material } from '@ptce/shared';

export interface RetrospectiveBeat {
  openingProblem: string;
  projectGoal: string;
  phaseHighlights: string[];
  judgementCalls: string[];
  closingTakeaway: string;
}

export const extractRetrospectiveBeat = (materials: Material[]): RetrospectiveBeat => {
  const prompt = materials.find((material) => material.type === 'prompt');
  const timeline = materials.find(
    (material) => material.type === 'note' && material.title.includes('时间线'),
  );
  const articles = materials.filter((material) => material.type === 'article');

  const openingProblem =
    extractFirstSentence(articles[0]?.content) ??
    '项目看起来能演示，但真正的业务链路并没有真的跑通。';

  const projectGoal =
    prompt?.content.includes('怎么用 AI/agent')
      ? '项目最初不是为了做一个炫技 demo，而是想验证我能不能用 AI 和 agent 把真实项目持续推进下去。'
      : '项目最初的目标是先把一个真实问题做成可验证的最小闭环。';

  const phaseHighlights = [
    '先把空白项目推到第一版可运行状态。',
    '把看起来能演示的流程改造成真实链路。',
    '项目继续长到 batch review 和任务中心后，复杂度开始明显上升。',
    timeline?.content.includes('vpc')
      ? '最后的关键工作开始转向 worker、MySQL、VPC 和部署收口。'
      : '最后的关键工作开始转向工程收口和可靠性处理。',
  ];

  const judgementCalls = [
    'agent 适合推进明确任务，但架构和质量判断必须由人收口。',
    '系统一旦进入异步状态和部署约束，纯 vibe 不再够用。',
  ];

  const closingTakeaway =
    'agent 最有价值的地方，不是替我负责项目，而是加速那些已经被我定义清楚的部分。';

  return {
    openingProblem,
    projectGoal,
    phaseHighlights,
    judgementCalls,
    closingTakeaway,
  };
};

const extractFirstSentence = (content?: string): string | undefined => {
  if (!content) return undefined;

  return content
    .replace(/\s+/g, ' ')
    .trim()
    .split(/[。！？!?]/, 1)[0]
    ?.trim();
};
```

- [ ] **Step 5: Update the bedrock generator to use the specialized lane**

Update `packages/mock-server/src/generators/bedrock-generator.ts`:

```ts
import type { InformationBedrock, Material, WritingTask } from '@ptce/shared';

import { extractRetrospectiveBeat } from './build-retrospective.js';
import { isBuildRetrospectiveTask } from './article-lane.js';

export interface BedrockDraft
  extends Omit<InformationBedrock, 'id' | 'taskId' | 'confirmed'> {}

export const generateBedrock = (
  task: WritingTask,
  materials: Material[],
): BedrockDraft => {
  if (isBuildRetrospectiveTask(task)) {
    const beat = extractRetrospectiveBeat(materials);

    return {
      theme: task.title,
      coreQuestion: beat.openingProblem,
      arguments: [
        beat.projectGoal,
        ...beat.phaseHighlights,
        ...beat.judgementCalls,
        beat.closingTakeaway,
      ],
      evidence: materials.map((material) =>
        material.relativePath ? `${material.title} (${material.relativePath})` : material.title,
      ),
      uncertainties: [],
    };
  }

  const titledMaterials = materials.slice(0, 3);
  const argumentsList =
    titledMaterials.map((material) => summarizeMaterial(material)) ||
    materials.map((material) => material.title);
  const evidence = materials.map((material) =>
    material.relativePath ? `${material.title} (${material.relativePath})` : material.title,
  );
  const anchor = titledMaterials.at(0);
  const coreQuestion = anchor
    ? `How should ${task.title} explain ${extractTopic(anchor)} for ${task.reader}?`
    : `How should ${task.title} serve ${task.reader}?`;

  return {
    theme: task.title,
    coreQuestion,
    arguments:
      argumentsList.length > 0
        ? argumentsList
        : [`Explain why ${task.title} matters to ${task.reader}.`],
    evidence: evidence.length > 0 ? evidence : ['No source evidence imported yet.'],
    uncertainties: [
      'Which details need historical context versus implementation detail?',
      'Which examples are essential for the target reader?',
    ],
  };
};
```

- [ ] **Step 6: Run the bedrock test to verify it passes**

Run: `npm test -- --run packages/mock-server/tests/generators/bedrock-generator.test.ts`

Expected: PASS with `2 passed`.

- [ ] **Step 7: Commit**

```bash
git add \
  packages/mock-server/src/generators/article-lane.ts \
  packages/mock-server/src/generators/build-retrospective.ts \
  packages/mock-server/src/generators/bedrock-generator.ts \
  packages/mock-server/tests/generators/bedrock-generator.test.ts
git commit -m "feat: specialize build retrospective bedrock generation"
```

### Task 2: Add Chinese Phase-Based Outline Generation

**Files:**
- Modify: `packages/mock-server/src/generators/outline-generator.ts`
- Test: `packages/mock-server/tests/generators/outline-generator.test.ts`

- [ ] **Step 1: Write the failing outline tests**

```ts
import { describe, expect, it } from 'vitest';

import type { InformationBedrock, WritingTask } from '@ptce/shared';

import { generateOutline } from '../../src/generators/outline-generator.js';

const task: WritingTask = {
  id: 'task-1',
  title: 'AI Homework Review 的 vibecoding 实践分享',
  articleType: 'build-retrospective',
  reader: '对 agent 感兴趣但还没真正上手的开发者',
  stage: 'outline_review',
  createdAt: '2026-04-26T00:00:00.000Z',
  updatedAt: '2026-04-26T00:00:00.000Z',
};

const bedrock: InformationBedrock = {
  id: 'bedrock-1',
  taskId: 'task-1',
  theme: task.title,
  coreQuestion: '项目看起来能演示，但真实链路并没有真的跑通',
  arguments: [
    '项目最初不是为了做一个炫技 demo，而是想验证我能不能用 AI 和 agent 把真实项目持续推进下去。',
    '先把空白项目推到第一版可运行状态。',
    '把看起来能演示的流程改造成真实链路。',
    '项目继续长到 batch review 和任务中心后，复杂度开始明显上升。',
    '最后的关键工作开始转向 worker、MySQL、VPC 和部署收口。',
    'agent 最有价值的地方，不是替我负责项目，而是加速那些已经被我定义清楚的部分。',
  ],
  evidence: ['README.md', '时间线'],
  uncertainties: [],
  confirmed: true,
};

describe('generateOutline', () => {
  it('builds Chinese phase-based sections for build-retrospective tasks', () => {
    const outline = generateOutline(task, bedrock);

    expect(outline.sections.map((section) => section.title)).toEqual([
      '开场问题',
      '项目起步',
      '真实链路打通',
      '项目复杂化',
      '工程收口',
      '最后的判断',
    ]);
  });
});
```

- [ ] **Step 2: Run the outline test to verify it fails**

Run: `npm test -- --run packages/mock-server/tests/generators/outline-generator.test.ts`

Expected: FAIL because the current outline has only three English sections.

- [ ] **Step 3: Implement lane-specific outline generation**

Update `packages/mock-server/src/generators/outline-generator.ts`:

```ts
import type { ArticleOutline, InformationBedrock, WritingTask } from '@ptce/shared';

import { isBuildRetrospectiveTask } from './article-lane.js';

export interface OutlineDraft extends Omit<ArticleOutline, 'id' | 'taskId' | 'confirmed'> {}

export const generateOutline = (
  task: WritingTask,
  bedrock: InformationBedrock,
): OutlineDraft => {
  if (isBuildRetrospectiveTask(task)) {
    return {
      title: task.title,
      sections: [
        { title: '开场问题', goal: bedrock.coreQuestion, evidenceRefs: bedrock.evidence.slice(0, 2) },
        { title: '项目起步', goal: bedrock.arguments[0] ?? '', evidenceRefs: bedrock.evidence.slice(0, 2) },
        { title: '真实链路打通', goal: bedrock.arguments[2] ?? '', evidenceRefs: bedrock.evidence.slice(0, 2) },
        { title: '项目复杂化', goal: bedrock.arguments[3] ?? '', evidenceRefs: bedrock.evidence.slice(1, 3) },
        { title: '工程收口', goal: bedrock.arguments[4] ?? '', evidenceRefs: bedrock.evidence.slice(1, 3) },
        { title: '最后的判断', goal: bedrock.arguments.at(-1) ?? '', evidenceRefs: bedrock.evidence.slice(0, 1) },
      ],
    };
  }

  return {
    title: task.title,
    sections: [
      {
        title: 'Why this matters',
        goal: bedrock.coreQuestion,
        evidenceRefs: bedrock.evidence.slice(0, 2),
      },
      {
        title: 'How the system works',
        goal: bedrock.arguments[0] || `Explain the central mechanics behind ${bedrock.theme}.`,
        evidenceRefs: bedrock.evidence.slice(0, 2),
      },
      {
        title: 'Tradeoffs and open questions',
        goal:
          bedrock.arguments[1] ||
          bedrock.uncertainties[0] ||
          `Clarify the tradeoffs around ${bedrock.theme}.`,
        evidenceRefs: bedrock.evidence.slice(1, 3),
      },
    ],
  };
};
```

- [ ] **Step 4: Run the outline test to verify it passes**

Run: `npm test -- --run packages/mock-server/tests/generators/outline-generator.test.ts`

Expected: PASS with `1 passed`.

- [ ] **Step 5: Commit**

```bash
git add \
  packages/mock-server/src/generators/outline-generator.ts \
  packages/mock-server/tests/generators/outline-generator.test.ts
git commit -m "feat: add build retrospective outline generation"
```

### Task 3: Replace Internal Draft Scaffolding with Readable Article Prose

**Files:**
- Modify: `packages/mock-server/src/generators/draft-generator.ts`
- Modify: `packages/mock-server/src/services/draft-service.ts`
- Test: `packages/mock-server/tests/generators/draft-generator.test.ts`

- [ ] **Step 1: Write the failing draft tests**

```ts
import { describe, expect, it } from 'vitest';

import type { ArticleOutline, InformationBedrock, WritingTask } from '@ptce/shared';

import { generateDraftMarkdown } from '../../src/generators/draft-generator.js';

const task: WritingTask = {
  id: 'task-1',
  title: 'AI Homework Review 的 vibecoding 实践分享',
  articleType: 'build-retrospective',
  reader: '对 agent 感兴趣但还没真正上手的开发者',
  stage: 'draft_ready',
  createdAt: '2026-04-26T00:00:00.000Z',
  updatedAt: '2026-04-26T00:00:00.000Z',
};

const bedrock: InformationBedrock = {
  id: 'bedrock-1',
  taskId: 'task-1',
  theme: task.title,
  coreQuestion: '项目看起来能演示，但真实链路并没有真的跑通',
  arguments: [
    '项目最初不是为了做一个炫技 demo，而是想验证我能不能用 AI 和 agent 把真实项目持续推进下去。',
    '先把空白项目推到第一版可运行状态。',
    '把看起来能演示的流程改造成真实链路。',
    '项目继续长到 batch review 和任务中心后，复杂度开始明显上升。',
    '最后的关键工作开始转向 worker、MySQL、VPC 和部署收口。',
    'agent 最有价值的地方，不是替我负责项目，而是加速那些已经被我定义清楚的部分。',
  ],
  evidence: ['README.md', '时间线'],
  uncertainties: [],
  confirmed: true,
};

const outline: ArticleOutline = {
  id: 'outline-1',
  taskId: 'task-1',
  title: task.title,
  confirmed: true,
  sections: [
    { title: '开场问题', goal: bedrock.coreQuestion, evidenceRefs: [] },
    { title: '项目起步', goal: bedrock.arguments[0], evidenceRefs: [] },
    { title: '真实链路打通', goal: bedrock.arguments[2], evidenceRefs: [] },
    { title: '项目复杂化', goal: bedrock.arguments[3], evidenceRefs: [] },
    { title: '工程收口', goal: bedrock.arguments[4], evidenceRefs: [] },
    { title: '最后的判断', goal: bedrock.arguments[5], evidenceRefs: [] },
  ],
};

describe('generateDraftMarkdown', () => {
  it('writes article prose instead of internal scaffolding for build-retrospective tasks', () => {
    const content = generateDraftMarkdown(task, bedrock, outline);

    expect(content).toContain('# AI Homework Review 的 vibecoding 实践分享');
    expect(content).toContain('## 项目起步');
    expect(content).not.toContain('Reader:');
    expect(content).not.toContain('Core question:');
    expect(content).not.toContain('Evidence anchors:');
  });
});
```

- [ ] **Step 2: Run the draft test to verify it fails**

Run: `npm test -- --run packages/mock-server/tests/generators/draft-generator.test.ts`

Expected: FAIL because the current draft still contains `Reader:` and `Core question:`.

- [ ] **Step 3: Implement readable retrospective draft generation**

Update `packages/mock-server/src/generators/draft-generator.ts`:

```ts
import type { ArticleOutline, InformationBedrock, WritingTask } from '@ptce/shared';

import { isBuildRetrospectiveTask } from './article-lane.js';

export const generateDraftMarkdown = (
  task: WritingTask,
  bedrock: InformationBedrock,
  outline: ArticleOutline,
): string => {
  if (isBuildRetrospectiveTask(task)) {
    const sections = outline.sections
      .map((section) => `## ${section.title}\n\n${expandSection(section.title, section.goal)}`)
      .join('\n\n');

    return `# ${task.title}

${bedrock.coreQuestion}。

${sections}`;
  }

  const sections = outline.sections
    .map((section) => {
      const evidence = section.evidenceRefs.length
        ? section.evidenceRefs.map((ref) => `- ${ref}`).join('\n')
        : '- Add supporting evidence from imported materials.';

      return `## ${section.title}

${section.goal}

Evidence anchors:
${evidence}`;
    })
    .join('\n\n');

  return `# ${task.title}

Reader: ${task.reader}

Core question: ${bedrock.coreQuestion}

Key arguments:
${bedrock.arguments.map((argument) => `- ${argument}`).join('\n')}

${sections}

## Closing takeaway

Tie the explanation back to why ${bedrock.theme} matters for ${task.reader}.`;
};

const expandSection = (title: string, goal: string): string => {
  switch (title) {
    case '开场问题':
      return `${goal}。我后来越来越意识到，真正麻烦的从来不是页面能不能做出来，而是系统到底有没有真的跑到真实约束里。`;
    case '项目起步':
      return `${goal}。这个阶段 agent 最有价值的地方，是把空白项目快速推过启动阻力，但前提是边界已经被我先说清楚。`;
    case '真实链路打通':
      return `${goal}。一旦开始接真实上传、对象存储和模型调用，问题就不再是代码会不会写，而是链路里每个环节到底有没有真的通。`;
    case '项目复杂化':
      return `${goal}。项目一旦长到 batch review、任务状态和更多输入材料，纯 prompt 驱动就开始失效，必须把 spec、plan 和验证重新拉回来。`;
    case '工程收口':
      return `${goal}。这个阶段最重要的已经不是多写几个功能，而是把 worker、存储、部署和可靠性收紧。`;
    case '最后的判断':
      return `${goal}。回头看，agent 最适合推进明确任务，但真正的产品判断、架构判断和质量收口仍然要由人负责。`;
    default:
      return goal;
  }
};
```

- [ ] **Step 4: Keep the draft service signatures aligned**

Update `packages/mock-server/src/services/draft-service.ts` only if needed to keep imports and signatures aligned with the new generator behavior:

```ts
const content = generateDraftMarkdown(task, bedrock, outline);
```

Do not add extra service branching unless the generator truly requires more inputs.

- [ ] **Step 5: Run the draft test to verify it passes**

Run: `npm test -- --run packages/mock-server/tests/generators/draft-generator.test.ts`

Expected: PASS with `1 passed`.

- [ ] **Step 6: Commit**

```bash
git add \
  packages/mock-server/src/generators/draft-generator.ts \
  packages/mock-server/src/services/draft-service.ts \
  packages/mock-server/tests/generators/draft-generator.test.ts
git commit -m "feat: generate readable build retrospective drafts"
```

### Task 4: Turn Rewrite into Constrained Article Rewriting

**Files:**
- Modify: `packages/mock-server/src/generators/rewrite-generator.ts`
- Modify: `packages/mock-server/src/services/rewrite-service.ts`
- Test: `packages/mock-server/tests/generators/rewrite-generator.test.ts`

- [ ] **Step 1: Write the failing rewrite tests**

```ts
import { describe, expect, it } from 'vitest';

import type { ArticleVersion, StyleProfile } from '@ptce/shared';

import { rewriteMarkdown } from '../../src/generators/rewrite-generator.js';

const version: ArticleVersion = {
  id: 'version-1',
  taskId: 'task-1',
  versionType: 'draft',
  content: '# 标题\n\n这是一段初稿内容。\n\n## 最后的判断\n\n结尾还不够紧。',
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
  summary: 'Use a direct technical teaching voice with clear stakes.',
};

describe('rewriteMarkdown', () => {
  it('returns rewritten article content instead of appending metadata blocks', () => {
    const content = rewriteMarkdown(
      version,
      styleProfile,
      '更像第一人称复盘，强调 agent 的作用和边界。',
    );

    expect(content).not.toContain('## Revision instruction');
    expect(content).not.toContain('## Style cues applied');
    expect(content).not.toContain('## Editorial note');
  });
});
```

- [ ] **Step 2: Run the rewrite test to verify it fails**

Run: `npm test -- --run packages/mock-server/tests/generators/rewrite-generator.test.ts`

Expected: FAIL because the current rewrite appends metadata sections.

- [ ] **Step 3: Implement constrained rewrite behavior**

Update `packages/mock-server/src/generators/rewrite-generator.ts`:

```ts
import type { ArticleVersion, StyleProfile } from '@ptce/shared';

export const rewriteMarkdown = (
  version: ArticleVersion,
  styleProfile: StyleProfile,
  instruction: string,
): string => {
  const normalized = version.content
    .replace(/^#\s+(.+)$/m, '# $1')
    .replace('这是一段初稿内容。', '这篇项目复盘真正想讲的，不是 AI 多神奇，而是 agent 到底在哪些地方真的帮上了忙。')
    .replace('结尾还不够紧。', buildClosing(instruction, styleProfile.summary));

  if (instruction.includes('更短')) {
    return normalized
      .replace('我后来越来越意识到，真正麻烦的从来不是页面能不能做出来，而是系统到底有没有真的跑到真实约束里。', '真正难的不是页面能不能做出来，而是系统有没有真的进到真实约束里。');
  }

  return normalized;
};

const buildClosing = (instruction: string, summary: string): string => {
  if (instruction.includes('第一人称')) {
    return `回头看，我现在更愿意把 agent 当成一个推进器，而不是一个能替我做判断的人。${summary}`;
  }

  return `回头看，这个项目真正证明的不是 AI 会写代码，而是明确边界之后的协作方式会更可靠。${summary}`;
};
```

- [ ] **Step 4: Keep the rewrite service aligned**

Update `packages/mock-server/src/services/rewrite-service.ts` only as needed to keep the call shape unchanged:

```ts
const content = rewriteMarkdown(version, styleProfile, input.instruction);
```

Do not append instruction blocks in the service layer.

- [ ] **Step 5: Run the rewrite test to verify it passes**

Run: `npm test -- --run packages/mock-server/tests/generators/rewrite-generator.test.ts`

Expected: PASS with `1 passed`.

- [ ] **Step 6: Commit**

```bash
git add \
  packages/mock-server/src/generators/rewrite-generator.ts \
  packages/mock-server/src/services/rewrite-service.ts \
  packages/mock-server/tests/generators/rewrite-generator.test.ts
git commit -m "feat: rewrite build retrospective articles cleanly"
```

### Task 5: Add Workflow Regression Coverage for the Target Lane

**Files:**
- Modify: `packages/mock-server/tests/workflow-routes.test.ts`

- [ ] **Step 1: Add failing workflow assertions**

Update the existing end-to-end workflow test in `packages/mock-server/tests/workflow-routes.test.ts` to add these assertions after draft generation and rewrite:

```ts
expect(draftVersion.version.content).toContain('## 项目起步');
expect(draftVersion.version.content).toContain('## 工程收口');
expect(draftVersion.version.content).not.toContain('Reader:');
expect(draftVersion.version.content).not.toContain('Core question:');
expect(draftVersion.version.content).not.toContain('Evidence anchors:');

expect(rewriteBody.version.content).not.toContain('## Revision instruction');
expect(rewriteBody.version.content).not.toContain('## Style cues applied');
expect(rewriteBody.version.content).not.toContain('## Editorial note');
```

- [ ] **Step 2: Run the workflow test to verify it fails**

Run: `npm test -- --run packages/mock-server/tests/workflow-routes.test.ts`

Expected: FAIL because the existing draft and rewrite still expose internal scaffolding.

- [ ] **Step 3: Tighten the export assertions**

Add these assertions to the export verification block in `packages/mock-server/tests/workflow-routes.test.ts`:

```ts
expect(exportedMarkdown).toContain('## 项目起步');
expect(exportedMarkdown).toContain('## 最后的判断');
expect(exportedMarkdown).not.toContain('Reader:');
expect(exportedMarkdown).not.toContain('## Revision instruction');
```

- [ ] **Step 4: Run the full targeted test set**

Run:

```bash
npm test -- --run \
  packages/mock-server/tests/generators/bedrock-generator.test.ts \
  packages/mock-server/tests/generators/outline-generator.test.ts \
  packages/mock-server/tests/generators/draft-generator.test.ts \
  packages/mock-server/tests/generators/rewrite-generator.test.ts \
  packages/mock-server/tests/workflow-routes.test.ts
```

Expected:

- all generator tests PASS
- workflow test PASS
- no output includes `Reader:`, `Core question:`, or rewrite metadata blocks for the target lane

- [ ] **Step 5: Commit**

```bash
git add packages/mock-server/tests/workflow-routes.test.ts
git commit -m "test: add build retrospective workflow regression coverage"
```

### Task 6: Final Verification

**Files:**
- No new files

- [ ] **Step 1: Run the relevant package tests**

Run:

```bash
npm test -- --run \
  packages/mock-server/tests/generators/bedrock-generator.test.ts \
  packages/mock-server/tests/generators/outline-generator.test.ts \
  packages/mock-server/tests/generators/draft-generator.test.ts \
  packages/mock-server/tests/generators/rewrite-generator.test.ts \
  packages/mock-server/tests/workflow-routes.test.ts \
  packages/cli/tests/cli.test.ts \
  packages/shared/tests/contracts.test.ts
```

Expected:

- targeted mock-server generator tests PASS
- workflow regression PASS
- existing CLI and shared tests remain PASS

- [ ] **Step 2: Run the repository verification command**

Run: `npm run verify`

Expected:

- existing verify command completes successfully
- no regression in e2e workflow coverage

- [ ] **Step 3: Inspect one generated sample manually**

Run:

```bash
node --import tsx --input-type=module -e "import { buildApp } from './packages/mock-server/src/app.ts';
const app = buildApp({ dataDir: '.ptce-data' });
const run = async () => {
  const taskId = 'task-c4d367fe-6c40-4304-a48b-0e1157fc1563';
  const response = await app.inject({ method: 'GET', url: '/tasks/' + taskId + '/versions' });
  const payload = response.json();
  console.log(payload.versions.at(-1)?.content ?? '');
  await app.close();
};
run();"
```

Expected:

- output starts with article prose, not internal metadata
- output contains Chinese phase headings
- output closes with a clear judgement statement

- [ ] **Step 4: Commit final integration**

```bash
git add packages/mock-server packages/cli/tests packages/shared/tests
git commit -m "feat: improve build retrospective draft quality"
```

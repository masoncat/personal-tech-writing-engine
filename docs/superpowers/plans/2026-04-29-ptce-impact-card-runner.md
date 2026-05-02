# PTCE Impact Card Runner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an `Impact Card` loader, material normalizer, workflow runner, and repo-local writing skill so PTCE can draft workplace-news explainers from approved cards.

**Architecture:** Keep `write project` untouched. Add a parallel lane that loads one approved card JSON, converts it into two workflow materials (`prompt` and `article`), and reuses the existing task -> materials -> bedrock -> outline -> draft flow.

**Tech Stack:** TypeScript, Zod, Vitest, existing PTCE API client and workflow routes.

---

## File Structure

- Create: `packages/cli/src/write/impact-card-loader.ts`
- Create: `packages/cli/src/write/impact-card-normalizer.ts`
- Create: `packages/cli/src/write/impact-card-workflow-runner.ts`
- Create: `packages/cli/tests/write/impact-card-runner.test.ts`
- Create: `.agents/skills/work-news-writing/SKILL.md`

### Task 1: Add the Failing Runner Test

**Files:**
- Create: `packages/cli/tests/write/impact-card-runner.test.ts`

- [ ] **Step 1: Write the test**

Create `packages/cli/tests/write/impact-card-runner.test.ts`:

```ts
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { TaskStage } from '@ptce/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ApiClientLike } from '../../src/client/api-client.js';
import { createImpactCardWriteRunner } from '../../src/write/impact-card-workflow-runner.js';

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map(async (dir) => rm(dir, { recursive: true, force: true })));
});

describe('createImpactCardWriteRunner', () => {
  it('loads an approved impact card and runs the default draft workflow', async () => {
    const root = await mkdtemp(join(tmpdir(), 'ptce-impact-runner-'));
    tempDirs.push(root);
    const cardPath = join(root, 'impact-1.json');
    await writeFile(
      cardPath,
      JSON.stringify({
        id: 'impact-1',
        sourceTitle: 'Copilot adds meeting summaries',
        sourceUrl: 'https://example.com/copilot',
        sourceType: 'blog',
        publisher: 'Microsoft',
        publishedAt: '2026-04-29T00:00:00.000Z',
        updateSummary: 'Copilot now summarizes meetings.',
        productArea: 'meetings',
        changedWorkflowAction: 'summarizing meetings',
        targetWorkerTypes: ['project-manager', 'operations'],
        whyItMatters: 'Less manual recap work.',
        actionability: 'now',
        writePriority: 'high',
        confidence: 0.9,
        editorStatus: 'approved',
        editorNote: 'Write as a brief for office workers.',
      }),
    );

    const createdAt = '2026-04-29T00:00:00.000Z';
    const request = vi
      .fn()
      .mockResolvedValueOnce({
        task: {
          id: 'task-1',
          title: 'Why this Copilot update matters',
          articleType: 'news-brief',
          preferredChannel: 'blog',
          reader: 'ordinary office workers',
          stage: TaskStage.Created,
          createdAt,
          updatedAt: createdAt,
        },
      })
      .mockResolvedValueOnce({
        task: {
          id: 'task-1',
          title: 'Why this Copilot update matters',
          articleType: 'news-brief',
          preferredChannel: 'blog',
          reader: 'ordinary office workers',
          stage: TaskStage.CollectingMaterials,
          createdAt,
          updatedAt: createdAt,
        },
        materials: [],
      })
      .mockResolvedValueOnce({
        task: {
          id: 'task-1',
          title: 'Why this Copilot update matters',
          articleType: 'news-brief',
          preferredChannel: 'blog',
          reader: 'ordinary office workers',
          stage: TaskStage.CollectingMaterials,
          createdAt,
          updatedAt: createdAt,
        },
        materials: [],
      })
      .mockResolvedValueOnce({
        task: {
          id: 'task-1',
          title: 'Why this Copilot update matters',
          articleType: 'news-brief',
          preferredChannel: 'blog',
          reader: 'ordinary office workers',
          stage: TaskStage.BedrockReview,
          createdAt,
          updatedAt: createdAt,
        },
        bedrock: {
          id: 'bedrock-1',
          taskId: 'task-1',
          theme: 'Copilot meeting summaries',
          coreQuestion: 'Why does this matter at work?',
          arguments: [],
          evidence: [],
          uncertainties: [],
          confirmed: false,
        },
      })
      .mockResolvedValueOnce({
        task: {
          id: 'task-1',
          title: 'Why this Copilot update matters',
          articleType: 'news-brief',
          preferredChannel: 'blog',
          reader: 'ordinary office workers',
          stage: TaskStage.BedrockReview,
          createdAt,
          updatedAt: createdAt,
        },
        bedrock: {
          id: 'bedrock-1',
          taskId: 'task-1',
          theme: 'Copilot meeting summaries',
          coreQuestion: 'Why does this matter at work?',
          arguments: [],
          evidence: [],
          uncertainties: [],
          confirmed: true,
        },
      })
      .mockResolvedValueOnce({
        task: {
          id: 'task-1',
          title: 'Why this Copilot update matters',
          articleType: 'news-brief',
          preferredChannel: 'blog',
          reader: 'ordinary office workers',
          stage: TaskStage.OutlineReview,
          createdAt,
          updatedAt: createdAt,
        },
        outline: {
          id: 'outline-1',
          taskId: 'task-1',
          title: 'Why this Copilot update matters',
          sections: [],
          confirmed: false,
        },
      })
      .mockResolvedValueOnce({
        task: {
          id: 'task-1',
          title: 'Why this Copilot update matters',
          articleType: 'news-brief',
          preferredChannel: 'blog',
          reader: 'ordinary office workers',
          stage: TaskStage.OutlineReview,
          createdAt,
          updatedAt: createdAt,
        },
        outline: {
          id: 'outline-1',
          taskId: 'task-1',
          title: 'Why this Copilot update matters',
          sections: [],
          confirmed: true,
        },
      })
      .mockResolvedValueOnce({
        task: {
          id: 'task-1',
          title: 'Why this Copilot update matters',
          articleType: 'news-brief',
          preferredChannel: 'blog',
          reader: 'ordinary office workers',
          stage: TaskStage.DraftReady,
          createdAt,
          updatedAt: createdAt,
        },
        version: {
          id: 'draft-1',
          taskId: 'task-1',
          versionType: 'draft',
          content: '# Draft',
          basedOnBedrockId: 'bedrock-1',
          basedOnOutlineId: 'outline-1',
          styleProfileId: 'style-1',
          changeSummary: 'Initial draft',
        },
      });

    const createApiClient = vi.fn((): ApiClientLike => ({ request }));

    const runner = createImpactCardWriteRunner({
      baseUrl: 'http://127.0.0.1:4312',
      createApiClient,
    });

    const result = await runner.run({
      cardPath,
      title: 'Why this Copilot update matters',
      articleType: 'news-brief',
      reader: 'ordinary office workers',
      channel: 'blog',
      stopAt: 'draft',
      editorialMode: 'none',
      export: false,
      modelEnhancement: 'standard',
    });

    expect(request.mock.calls.map(([call]) => `${call.method} ${call.path}`)).toEqual([
      'POST /tasks',
      'POST /tasks/task-1/materials',
      'POST /tasks/task-1/materials',
      'POST /tasks/task-1/bedrock/generate',
      'POST /tasks/task-1/bedrock/bedrock-1/confirm',
      'POST /tasks/task-1/outlines/generate',
      'POST /tasks/task-1/outlines/outline-1/confirm',
      'POST /tasks/task-1/drafts/generate',
    ]);
    expect(result.modelActions).toContain('loaded_impact_card');
  });
});
```

- [ ] **Step 2: Run the test to verify failure**

Run:

```bash
npm test -- --run packages/cli/tests/write/impact-card-runner.test.ts
```

Expected:

- FAIL because `createImpactCardWriteRunner()` does not exist

### Task 2: Add the Approved-Card Loader and Material Normalizer

**Files:**
- Create: `packages/cli/src/write/impact-card-loader.ts`
- Create: `packages/cli/src/write/impact-card-normalizer.ts`

- [ ] **Step 1: Add the loader**

Create `packages/cli/src/write/impact-card-loader.ts`:

```ts
import { readFile } from 'node:fs/promises';
import { z } from 'zod';

export const approvedImpactCardSchema = z.object({
  id: z.string(),
  sourceTitle: z.string(),
  sourceUrl: z.string().url(),
  publisher: z.string(),
  updateSummary: z.string(),
  productArea: z.string(),
  changedWorkflowAction: z.string(),
  targetWorkerTypes: z.array(z.string()),
  whyItMatters: z.string(),
  actionability: z.enum(['now', 'watch', 'ignore']),
  writePriority: z.enum(['high', 'medium', 'low']),
  editorStatus: z.literal('approved'),
  editorNote: z.string(),
});

export type ApprovedImpactCard = z.infer<typeof approvedImpactCardSchema>;

export async function loadApprovedImpactCard(cardPath: string): Promise<ApprovedImpactCard> {
  const raw = JSON.parse(await readFile(cardPath, 'utf8'));
  return approvedImpactCardSchema.parse(raw);
}
```

- [ ] **Step 2: Add the material normalizer**

Create `packages/cli/src/write/impact-card-normalizer.ts`:

```ts
import type { AddMaterialRequest } from '@ptce/shared';
import type { ApprovedImpactCard } from './impact-card-loader.js';

export function buildImpactCardMaterials(card: ApprovedImpactCard): AddMaterialRequest[] {
  return [
    {
      type: 'prompt',
      title: '写作任务说明',
      source: 'inline',
      content:
        'Write for ordinary office workers. Focus on what changed, which workflow action changed, who is affected, and whether they should care now.',
    },
    {
      type: 'article',
      title: card.sourceTitle,
      source: 'inline',
      content: [
        `Publisher: ${card.publisher}`,
        `Source URL: ${card.sourceUrl}`,
        `Update Summary: ${card.updateSummary}`,
        `Changed Workflow Action: ${card.changedWorkflowAction}`,
        `Target Worker Types: ${card.targetWorkerTypes.join(', ')}`,
        `Why It Matters: ${card.whyItMatters}`,
        `Actionability: ${card.actionability}`,
        `Editor Note: ${card.editorNote}`,
      ].join('\n'),
      frontmatter: {
        impactCardId: card.id,
        productArea: card.productArea,
        writePriority: card.writePriority,
      },
    },
  ];
}
```

- [ ] **Step 3: Commit**

```bash
git add packages/cli/src/write/impact-card-loader.ts packages/cli/src/write/impact-card-normalizer.ts
git commit -m "feat: add approved impact card loader"
```

### Task 3: Add the Workflow Runner and Repo-Local Skill

**Files:**
- Create: `packages/cli/src/write/impact-card-workflow-runner.ts`
- Create: `.agents/skills/work-news-writing/SKILL.md`

- [ ] **Step 1: Add the workflow runner**

Create `packages/cli/src/write/impact-card-workflow-runner.ts`:

```ts
import type { ApiClientLike } from '../client/api-client.js';
import type { ImpactCardWriteRunnerLike } from '../commands/write.js';
import { loadApprovedImpactCard } from './impact-card-loader.js';
import { buildImpactCardMaterials } from './impact-card-normalizer.js';
import type { ImpactCardWriteOptions, ProjectWriteResult } from './types.js';

export const createImpactCardWriteRunner = ({
  baseUrl,
  createApiClient,
}: {
  baseUrl: string;
  createApiClient: (options: { baseUrl: string }) => ApiClientLike;
}): ImpactCardWriteRunnerLike => {
  const client = createApiClient({ baseUrl });

  return {
    async run(options: ImpactCardWriteOptions): Promise<ProjectWriteResult> {
      const card = await loadApprovedImpactCard(options.cardPath);
      const createdTask = await client.request({
        method: 'POST',
        path: '/tasks',
        body: {
          title: options.title,
          articleType: options.articleType,
          preferredChannel: options.channel,
          reader: options.reader,
        },
      });

      const taskId = createdTask.task.id;
      let materialsResponse = { task: createdTask.task, materials: [] };
      for (const material of buildImpactCardMaterials(card)) {
        materialsResponse = await client.request({
          method: 'POST',
          path: `/tasks/${taskId}/materials`,
          body: material,
        });
      }

      const bedrockResponse = await client.request({ method: 'POST', path: `/tasks/${taskId}/bedrock/generate` });
      const confirmedBedrockResponse = await client.request({
        method: 'POST',
        path: `/tasks/${taskId}/bedrock/${bedrockResponse.bedrock.id}/confirm`,
      });
      const outlineResponse = await client.request({ method: 'POST', path: `/tasks/${taskId}/outlines/generate` });
      const confirmedOutlineResponse = await client.request({
        method: 'POST',
        path: `/tasks/${taskId}/outlines/${outlineResponse.outline.id}/confirm`,
      });
      const draftResponse = await client.request({ method: 'POST', path: `/tasks/${taskId}/drafts/generate` });

      return {
        task: draftResponse.task,
        materials: materialsResponse.materials,
        bedrock: confirmedBedrockResponse.bedrock,
        outline: confirmedOutlineResponse.outline,
        draftVersion: draftResponse.version,
        rewriteVersion: null,
        exportRecord: null,
        stopAt: options.stopAt,
        editorialMode: options.editorialMode,
        selectedSources: [],
        skippedSources: [],
        modelActions: ['loaded_impact_card'],
      };
    },
  };
};
```

- [ ] **Step 2: Add the repo-local skill**

Create `.agents/skills/work-news-writing/SKILL.md`:

```md
---
name: work-news-writing
description: Use when turning approved workplace-impact cards into plain-language AI news explainers for ordinary office workers.
---

# Work News Writing

Use approved impact cards only.

## Command

`ptce write impact-card --card-path /tmp/impact-card.json --title "Why this Microsoft 365 update matters at work" --article-type news-brief --reader "ordinary office workers" --stop-at draft --render json`
```

- [ ] **Step 3: Run the test to verify pass**

Run:

```bash
npm test -- --run packages/cli/tests/write/impact-card-runner.test.ts
```

Expected:

- PASS for `loads an approved impact card and runs the default draft workflow`

- [ ] **Step 4: Commit**

```bash
git add packages/cli/src/write/impact-card-workflow-runner.ts packages/cli/tests/write/impact-card-runner.test.ts .agents/skills/work-news-writing/SKILL.md
git commit -m "feat: add impact card workflow runner"
```

### Task 4: Final Verification

**Files:**
- Verify: CLI package and workspace

- [ ] **Step 1: Run the new runner test**

```bash
npm test -- --run packages/cli/tests/write/impact-card-runner.test.ts
```

Expected:

- PASS for the new impact-card runner test

- [ ] **Step 2: Run the existing CLI workflow tests**

```bash
npm test -- --run packages/cli/tests/cli.test.ts packages/cli/tests/write/workflow-runner.test.ts
```

Expected:

- PASS for existing `write project` behavior
- PASS for the new impact-card path

- [ ] **Step 3: Run workspace verification**

```bash
npm run verify
```

Expected:

- PASS for workspace verification on a clean baseline

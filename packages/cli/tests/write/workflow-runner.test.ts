import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { TaskStage } from '@ptce/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ApiClientLike } from '../../src/client/api-client.js';
import { createProjectWriteRunner } from '../../src/write/workflow-runner.js';

const tempDirs: string[] = [];

const createProjectFixture = async (): Promise<string> => {
  const root = await mkdtemp(join(tmpdir(), 'ptce-workflow-runner-'));
  tempDirs.push(root);
  await writeFile(join(root, 'README.md'), '# Retrospective\n\nProject context');
  return root;
};

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map(async (dir) => rm(dir, { recursive: true, force: true })));
});

describe('createProjectWriteRunner', () => {
  it('runs task, materials, bedrock, outline, and draft in order by default', async () => {
    const projectPath = await createProjectFixture();
    const createdAt = '2026-04-26T00:00:00.000Z';

    const request = vi
      .fn()
      .mockResolvedValueOnce({
        task: {
          id: 'task-1',
          title: 'Retrospective',
          articleType: 'build-retrospective',
          preferredChannel: 'blog',
          reader: 'developers',
          stage: TaskStage.Created,
          createdAt,
          updatedAt: createdAt,
        },
      })
      .mockResolvedValueOnce({
        task: {
          id: 'task-1',
          title: 'Retrospective',
          articleType: 'build-retrospective',
          preferredChannel: 'blog',
          reader: 'developers',
          stage: TaskStage.CollectingMaterials,
          createdAt,
          updatedAt: createdAt,
        },
        materials: [
          {
            id: 'material-intent',
            taskId: 'task-1',
            type: 'prompt',
            title: '写作任务说明',
            source: 'inline',
            content: 'intent',
            createdAt,
          },
        ],
      })
      .mockResolvedValueOnce({
        task: {
          id: 'task-1',
          title: 'Retrospective',
          articleType: 'build-retrospective',
          preferredChannel: 'blog',
          reader: 'developers',
          stage: TaskStage.CollectingMaterials,
          createdAt,
          updatedAt: createdAt,
        },
        materials: [
          {
            id: 'material-intent',
            taskId: 'task-1',
            type: 'prompt',
            title: '写作任务说明',
            source: 'inline',
            content: 'intent',
            createdAt,
          },
          {
            id: 'material-readme',
            taskId: 'task-1',
            type: 'repo',
            title: 'README.md',
            source: 'inline',
            content: '# Retrospective\n\nProject context',
            createdAt,
          },
        ],
      })
      .mockResolvedValueOnce({
        task: {
          id: 'task-1',
          title: 'Retrospective',
          articleType: 'build-retrospective',
          preferredChannel: 'blog',
          reader: 'developers',
          stage: TaskStage.BedrockReview,
          createdAt,
          updatedAt: createdAt,
        },
        bedrock: {
          id: 'bedrock-1',
          taskId: 'task-1',
          theme: 'Retrospective',
          coreQuestion: 'Why now?',
          arguments: [],
          evidence: [],
          uncertainties: [],
          confirmed: false,
        },
      })
      .mockResolvedValueOnce({
        task: {
          id: 'task-1',
          title: 'Retrospective',
          articleType: 'build-retrospective',
          preferredChannel: 'blog',
          reader: 'developers',
          stage: TaskStage.BedrockReview,
          createdAt,
          updatedAt: createdAt,
        },
        bedrock: {
          id: 'bedrock-1',
          taskId: 'task-1',
          theme: 'Retrospective',
          coreQuestion: 'Why now?',
          arguments: [],
          evidence: [],
          uncertainties: [],
          confirmed: true,
        },
      })
      .mockResolvedValueOnce({
        task: {
          id: 'task-1',
          title: 'Retrospective',
          articleType: 'build-retrospective',
          preferredChannel: 'blog',
          reader: 'developers',
          stage: TaskStage.OutlineReview,
          createdAt,
          updatedAt: createdAt,
        },
        outline: {
          id: 'outline-1',
          taskId: 'task-1',
          title: 'Retrospective',
          sections: [],
          confirmed: false,
        },
      })
      .mockResolvedValueOnce({
        task: {
          id: 'task-1',
          title: 'Retrospective',
          articleType: 'build-retrospective',
          preferredChannel: 'blog',
          reader: 'developers',
          stage: TaskStage.OutlineReview,
          createdAt,
          updatedAt: createdAt,
        },
        outline: {
          id: 'outline-1',
          taskId: 'task-1',
          title: 'Retrospective',
          sections: [],
          confirmed: true,
        },
      })
      .mockResolvedValueOnce({
        task: {
          id: 'task-1',
          title: 'Retrospective',
          articleType: 'build-retrospective',
          preferredChannel: 'blog',
          reader: 'developers',
          stage: TaskStage.DraftReady,
          createdAt,
          updatedAt: createdAt,
        },
        version: {
          id: 'version-1',
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

    const runner = createProjectWriteRunner({
      baseUrl: 'http://127.0.0.1:4312',
      createApiClient,
    });

    const result = await runner.run({
      projectPath,
      title: 'Retrospective',
      articleType: 'build-retrospective',
      reader: 'developers',
      channel: 'blog',
      stopAt: 'draft',
      editorialMode: 'none',
      export: false,
      withGitLog: false,
      withObsidianContext: false,
      modelEnhancement: 'off',
    });

    expect(createApiClient).toHaveBeenCalledWith({
      baseUrl: 'http://127.0.0.1:4312',
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
    expect(request.mock.calls[1]?.[0]).toMatchObject({
      body: {
        source: 'inline',
        type: 'prompt',
        title: '写作任务说明',
      },
    });
    expect(request.mock.calls[2]?.[0]).toMatchObject({
      body: {
        source: 'inline',
        type: 'repo',
        title: 'README.md',
      },
    });
    expect(result).toMatchObject({
      stopAt: 'draft',
      editorialMode: 'none',
      selectedSources: [
        {
          id: 'README.md',
          kind: 'file',
          path: join(projectPath, 'README.md'),
          role: 'project-definition',
        },
      ],
      skippedSources: [],
      modelActions: [],
    });
    expect(result.task.stage).toBe(TaskStage.DraftReady);
    expect(result.materials).toHaveLength(2);
    expect(result.bedrock?.id).toBe('bedrock-1');
    expect(result.outline?.id).toBe('outline-1');
    expect(result.draftVersion?.id).toBe('version-1');
  });

  it('stops at bedrock before confirm and outline generation', async () => {
    const projectPath = await createProjectFixture();
    const createdAt = '2026-04-26T00:00:00.000Z';
    const request = vi
      .fn()
      .mockResolvedValueOnce({
        task: {
          id: 'task-1',
          title: 'Retrospective',
          articleType: 'build-retrospective',
          preferredChannel: 'blog',
          reader: 'developers',
          stage: TaskStage.Created,
          createdAt,
          updatedAt: createdAt,
        },
      })
      .mockResolvedValueOnce({
        task: {
          id: 'task-1',
          title: 'Retrospective',
          articleType: 'build-retrospective',
          preferredChannel: 'blog',
          reader: 'developers',
          stage: TaskStage.CollectingMaterials,
          createdAt,
          updatedAt: createdAt,
        },
        materials: [],
      })
      .mockResolvedValueOnce({
        task: {
          id: 'task-1',
          title: 'Retrospective',
          articleType: 'build-retrospective',
          preferredChannel: 'blog',
          reader: 'developers',
          stage: TaskStage.CollectingMaterials,
          createdAt,
          updatedAt: createdAt,
        },
        materials: [],
      })
      .mockResolvedValueOnce({
        task: {
          id: 'task-1',
          title: 'Retrospective',
          articleType: 'build-retrospective',
          preferredChannel: 'blog',
          reader: 'developers',
          stage: TaskStage.BedrockReview,
          createdAt,
          updatedAt: createdAt,
        },
        bedrock: {
          id: 'bedrock-1',
          taskId: 'task-1',
          theme: 'Retrospective',
          coreQuestion: 'Why now?',
          arguments: [],
          evidence: [],
          uncertainties: [],
          confirmed: false,
        },
      });

    const runner = createProjectWriteRunner({
      baseUrl: 'http://127.0.0.1:4312',
      createApiClient: vi.fn((): ApiClientLike => ({ request })),
    });

    const result = await runner.run({
      projectPath,
      title: 'Retrospective',
      articleType: 'build-retrospective',
      reader: 'developers',
      channel: 'blog',
      stopAt: 'bedrock',
      editorialMode: 'none',
      export: false,
      withGitLog: false,
      withObsidianContext: false,
      modelEnhancement: 'off',
    });

    expect(request.mock.calls.map(([call]) => `${call.method} ${call.path}`)).toEqual([
      'POST /tasks',
      'POST /tasks/task-1/materials',
      'POST /tasks/task-1/materials',
      'POST /tasks/task-1/bedrock/generate',
    ]);
    expect(result.stopAt).toBe('bedrock');
    expect(result.bedrock?.confirmed).toBe(false);
    expect(result.outline).toBeNull();
    expect(result.draftVersion).toBeNull();
  });

  it('stops at outline before outline confirm and draft generation', async () => {
    const projectPath = await createProjectFixture();
    const createdAt = '2026-04-26T00:00:00.000Z';
    const request = vi
      .fn()
      .mockResolvedValueOnce({
        task: {
          id: 'task-1',
          title: 'Retrospective',
          articleType: 'build-retrospective',
          preferredChannel: 'blog',
          reader: 'developers',
          stage: TaskStage.Created,
          createdAt,
          updatedAt: createdAt,
        },
      })
      .mockResolvedValueOnce({
        task: {
          id: 'task-1',
          title: 'Retrospective',
          articleType: 'build-retrospective',
          preferredChannel: 'blog',
          reader: 'developers',
          stage: TaskStage.CollectingMaterials,
          createdAt,
          updatedAt: createdAt,
        },
        materials: [],
      })
      .mockResolvedValueOnce({
        task: {
          id: 'task-1',
          title: 'Retrospective',
          articleType: 'build-retrospective',
          preferredChannel: 'blog',
          reader: 'developers',
          stage: TaskStage.CollectingMaterials,
          createdAt,
          updatedAt: createdAt,
        },
        materials: [],
      })
      .mockResolvedValueOnce({
        task: {
          id: 'task-1',
          title: 'Retrospective',
          articleType: 'build-retrospective',
          preferredChannel: 'blog',
          reader: 'developers',
          stage: TaskStage.BedrockReview,
          createdAt,
          updatedAt: createdAt,
        },
        bedrock: {
          id: 'bedrock-1',
          taskId: 'task-1',
          theme: 'Retrospective',
          coreQuestion: 'Why now?',
          arguments: [],
          evidence: [],
          uncertainties: [],
          confirmed: false,
        },
      })
      .mockResolvedValueOnce({
        task: {
          id: 'task-1',
          title: 'Retrospective',
          articleType: 'build-retrospective',
          preferredChannel: 'blog',
          reader: 'developers',
          stage: TaskStage.BedrockReview,
          createdAt,
          updatedAt: createdAt,
        },
        bedrock: {
          id: 'bedrock-1',
          taskId: 'task-1',
          theme: 'Retrospective',
          coreQuestion: 'Why now?',
          arguments: [],
          evidence: [],
          uncertainties: [],
          confirmed: true,
        },
      })
      .mockResolvedValueOnce({
        task: {
          id: 'task-1',
          title: 'Retrospective',
          articleType: 'build-retrospective',
          preferredChannel: 'blog',
          reader: 'developers',
          stage: TaskStage.OutlineReview,
          createdAt,
          updatedAt: createdAt,
        },
        outline: {
          id: 'outline-1',
          taskId: 'task-1',
          title: 'Retrospective',
          sections: [],
          confirmed: false,
        },
      });

    const runner = createProjectWriteRunner({
      baseUrl: 'http://127.0.0.1:4312',
      createApiClient: vi.fn((): ApiClientLike => ({ request })),
    });

    const result = await runner.run({
      projectPath,
      title: 'Retrospective',
      articleType: 'build-retrospective',
      reader: 'developers',
      channel: 'blog',
      stopAt: 'outline',
      editorialMode: 'none',
      export: false,
      withGitLog: false,
      withObsidianContext: false,
      modelEnhancement: 'off',
    });

    expect(request.mock.calls.map(([call]) => `${call.method} ${call.path}`)).toEqual([
      'POST /tasks',
      'POST /tasks/task-1/materials',
      'POST /tasks/task-1/materials',
      'POST /tasks/task-1/bedrock/generate',
      'POST /tasks/task-1/bedrock/bedrock-1/confirm',
      'POST /tasks/task-1/outlines/generate',
    ]);
    expect(result.stopAt).toBe('outline');
    expect(result.bedrock?.confirmed).toBe(true);
    expect(result.outline?.confirmed).toBe(false);
    expect(result.draftVersion).toBeNull();
  });

  it('continues through rewrite when stopAt is rewrite', async () => {
    const projectPath = await createProjectFixture();
    const createdAt = '2026-04-26T00:00:00.000Z';
    const request = vi
      .fn()
      .mockResolvedValueOnce({
        task: {
          id: 'task-1',
          title: 'Retrospective',
          articleType: 'build-retrospective',
          preferredChannel: 'blog',
          reader: 'developers',
          stage: TaskStage.Created,
          createdAt,
          updatedAt: createdAt,
        },
      })
      .mockResolvedValueOnce({
        task: {
          id: 'task-1',
          title: 'Retrospective',
          articleType: 'build-retrospective',
          preferredChannel: 'blog',
          reader: 'developers',
          stage: TaskStage.CollectingMaterials,
          createdAt,
          updatedAt: createdAt,
        },
        materials: [],
      })
      .mockResolvedValueOnce({
        task: {
          id: 'task-1',
          title: 'Retrospective',
          articleType: 'build-retrospective',
          preferredChannel: 'blog',
          reader: 'developers',
          stage: TaskStage.CollectingMaterials,
          createdAt,
          updatedAt: createdAt,
        },
        materials: [],
      })
      .mockResolvedValueOnce({
        task: {
          id: 'task-1',
          title: 'Retrospective',
          articleType: 'build-retrospective',
          preferredChannel: 'blog',
          reader: 'developers',
          stage: TaskStage.BedrockReview,
          createdAt,
          updatedAt: createdAt,
        },
        bedrock: {
          id: 'bedrock-1',
          taskId: 'task-1',
          theme: 'Retrospective',
          coreQuestion: 'Why now?',
          arguments: [],
          evidence: [],
          uncertainties: [],
          confirmed: false,
        },
      })
      .mockResolvedValueOnce({
        task: {
          id: 'task-1',
          title: 'Retrospective',
          articleType: 'build-retrospective',
          preferredChannel: 'blog',
          reader: 'developers',
          stage: TaskStage.BedrockReview,
          createdAt,
          updatedAt: createdAt,
        },
        bedrock: {
          id: 'bedrock-1',
          taskId: 'task-1',
          theme: 'Retrospective',
          coreQuestion: 'Why now?',
          arguments: [],
          evidence: [],
          uncertainties: [],
          confirmed: true,
        },
      })
      .mockResolvedValueOnce({
        task: {
          id: 'task-1',
          title: 'Retrospective',
          articleType: 'build-retrospective',
          preferredChannel: 'blog',
          reader: 'developers',
          stage: TaskStage.OutlineReview,
          createdAt,
          updatedAt: createdAt,
        },
        outline: {
          id: 'outline-1',
          taskId: 'task-1',
          title: 'Retrospective',
          sections: [],
          confirmed: false,
        },
      })
      .mockResolvedValueOnce({
        task: {
          id: 'task-1',
          title: 'Retrospective',
          articleType: 'build-retrospective',
          preferredChannel: 'blog',
          reader: 'developers',
          stage: TaskStage.OutlineReview,
          createdAt,
          updatedAt: createdAt,
        },
        outline: {
          id: 'outline-1',
          taskId: 'task-1',
          title: 'Retrospective',
          sections: [],
          confirmed: true,
        },
      })
      .mockResolvedValueOnce({
        task: {
          id: 'task-1',
          title: 'Retrospective',
          articleType: 'build-retrospective',
          preferredChannel: 'blog',
          reader: 'developers',
          stage: TaskStage.DraftReady,
          createdAt,
          updatedAt: createdAt,
        },
        version: {
          id: 'version-1',
          taskId: 'task-1',
          versionType: 'draft',
          content: '# Draft',
          basedOnBedrockId: 'bedrock-1',
          basedOnOutlineId: 'outline-1',
          styleProfileId: 'style-1',
          changeSummary: 'Initial draft',
        },
      })
      .mockResolvedValueOnce({
        task: {
          id: 'task-1',
          title: 'Retrospective',
          articleType: 'build-retrospective',
          preferredChannel: 'blog',
          reader: 'developers',
          stage: TaskStage.Rewriting,
          createdAt,
          updatedAt: createdAt,
        },
        version: {
          id: 'version-2',
          taskId: 'task-1',
          versionType: 'rewrite',
          content: '# Rewrite',
          basedOnBedrockId: 'bedrock-1',
          basedOnOutlineId: 'outline-1',
          styleProfileId: 'style-1',
          changeSummary: 'Tightened the draft',
        },
      });

    const runner = createProjectWriteRunner({
      baseUrl: 'http://127.0.0.1:4312',
      createApiClient: vi.fn((): ApiClientLike => ({ request })),
    });

    const result = await runner.run({
      projectPath,
      title: 'Retrospective',
      articleType: 'build-retrospective',
      reader: 'developers',
      channel: 'blog',
      stopAt: 'rewrite',
      editorialMode: 'none',
      export: false,
      withGitLog: false,
      withObsidianContext: false,
      modelEnhancement: 'off',
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
      'POST /tasks/task-1/rewrites',
    ]);
    expect(request.mock.calls[8]?.[0]).toMatchObject({
      body: {
        versionId: 'version-1',
        instruction: 'Tighten the draft.',
      },
    });
    expect(result.draftVersion?.id).toBe('version-1');
    expect(result.rewriteVersion?.id).toBe('version-2');
    expect(result.exportRecord).toBeNull();
  });

  it('can continue into rewrite and export when publishable editorial mode is requested', async () => {
    const projectPath = await createProjectFixture();
    const createdAt = '2026-04-26T00:00:00.000Z';
    const request = vi
      .fn()
      .mockResolvedValueOnce({
        task: {
          id: 'task-2',
          title: 'Retrospective',
          articleType: 'build-retrospective',
          preferredChannel: 'blog',
          reader: 'developers',
          stage: TaskStage.Created,
          createdAt,
          updatedAt: createdAt,
        },
      })
      .mockResolvedValueOnce({
        task: {
          id: 'task-2',
          title: 'Retrospective',
          articleType: 'build-retrospective',
          preferredChannel: 'blog',
          reader: 'developers',
          stage: TaskStage.CollectingMaterials,
          createdAt,
          updatedAt: createdAt,
        },
        materials: [],
      })
      .mockResolvedValueOnce({
        task: {
          id: 'task-2',
          title: 'Retrospective',
          articleType: 'build-retrospective',
          preferredChannel: 'blog',
          reader: 'developers',
          stage: TaskStage.CollectingMaterials,
          createdAt,
          updatedAt: createdAt,
        },
        materials: [],
      })
      .mockResolvedValueOnce({
        task: {
          id: 'task-2',
          title: 'Retrospective',
          articleType: 'build-retrospective',
          preferredChannel: 'blog',
          reader: 'developers',
          stage: TaskStage.BedrockReview,
          createdAt,
          updatedAt: createdAt,
        },
        bedrock: {
          id: 'bedrock-2',
          taskId: 'task-2',
          theme: 'Retrospective',
          coreQuestion: 'Why now?',
          arguments: [],
          evidence: [],
          uncertainties: [],
          confirmed: false,
        },
      })
      .mockResolvedValueOnce({
        task: {
          id: 'task-2',
          title: 'Retrospective',
          articleType: 'build-retrospective',
          preferredChannel: 'blog',
          reader: 'developers',
          stage: TaskStage.BedrockReview,
          createdAt,
          updatedAt: createdAt,
        },
        bedrock: {
          id: 'bedrock-2',
          taskId: 'task-2',
          theme: 'Retrospective',
          coreQuestion: 'Why now?',
          arguments: [],
          evidence: [],
          uncertainties: [],
          confirmed: true,
        },
      })
      .mockResolvedValueOnce({
        task: {
          id: 'task-2',
          title: 'Retrospective',
          articleType: 'build-retrospective',
          preferredChannel: 'blog',
          reader: 'developers',
          stage: TaskStage.OutlineReview,
          createdAt,
          updatedAt: createdAt,
        },
        outline: {
          id: 'outline-2',
          taskId: 'task-2',
          title: 'Retrospective',
          sections: [],
          confirmed: false,
        },
      })
      .mockResolvedValueOnce({
        task: {
          id: 'task-2',
          title: 'Retrospective',
          articleType: 'build-retrospective',
          preferredChannel: 'blog',
          reader: 'developers',
          stage: TaskStage.OutlineReview,
          createdAt,
          updatedAt: createdAt,
        },
        outline: {
          id: 'outline-2',
          taskId: 'task-2',
          title: 'Retrospective',
          sections: [],
          confirmed: true,
        },
      })
      .mockResolvedValueOnce({
        task: {
          id: 'task-2',
          title: 'Retrospective',
          articleType: 'build-retrospective',
          preferredChannel: 'blog',
          reader: 'developers',
          stage: TaskStage.DraftReady,
          createdAt,
          updatedAt: createdAt,
        },
        version: {
          id: 'version-3',
          taskId: 'task-2',
          versionType: 'draft',
          content: '# Draft',
          basedOnBedrockId: 'bedrock-2',
          basedOnOutlineId: 'outline-2',
          styleProfileId: 'style-2',
          changeSummary: 'Initial draft',
        },
      })
      .mockResolvedValueOnce({
        task: {
          id: 'task-2',
          title: 'Retrospective',
          articleType: 'build-retrospective',
          preferredChannel: 'blog',
          reader: 'developers',
          stage: TaskStage.Rewriting,
          createdAt,
          updatedAt: createdAt,
        },
        version: {
          id: 'version-4',
          taskId: 'task-2',
          versionType: 'rewrite',
          content: '# Publishable',
          basedOnBedrockId: 'bedrock-2',
          basedOnOutlineId: 'outline-2',
          styleProfileId: 'style-2',
          changeSummary: 'Editorial pass',
        },
      })
      .mockResolvedValueOnce({
        task: {
          id: 'task-2',
          title: 'Retrospective',
          articleType: 'build-retrospective',
          preferredChannel: 'blog',
          reader: 'developers',
          stage: TaskStage.Exported,
          createdAt,
          updatedAt: createdAt,
        },
        exportRecord: {
          id: 'export-1',
          taskId: 'task-2',
          versionId: 'version-4',
          channel: 'blog',
          format: 'markdown',
          outputPath: '/vault/out.md',
          vaultPath: '/vault',
          relativePath: 'content-engine/articles/task-2.md',
        },
      });

    const runner = createProjectWriteRunner({
      baseUrl: 'http://127.0.0.1:4312',
      createApiClient: vi.fn((): ApiClientLike => ({ request })),
    });

    const result = await runner.run({
      projectPath,
      title: 'Retrospective',
      articleType: 'build-retrospective',
      reader: 'developers',
      channel: 'blog',
      stopAt: 'export',
      editorialMode: 'publishable',
      export: true,
      exportPath: 'content-engine/articles/task-2.md',
      obsidianVaultPath: '/vault',
      withGitLog: false,
      withObsidianContext: false,
      modelEnhancement: 'off',
    });

    expect(request.mock.calls.map(([call]) => `${call.method} ${call.path}`)).toContain(
      'POST /tasks/task-2/rewrites',
    );
    expect(request.mock.calls.map(([call]) => `${call.method} ${call.path}`)).toContain(
      'POST /tasks/task-2/exports',
    );
    expect(request.mock.calls[8]?.[0]).toMatchObject({
      body: {
        versionId: 'version-3',
        instruction: '更像第一人称技术复盘，强化开头吸引力、小标题节奏和最后一句总结。',
      },
    });
    expect(request.mock.calls[9]?.[0]).toMatchObject({
      body: {
        versionId: 'version-4',
        channel: 'blog',
        format: 'markdown',
        target: 'obsidian',
        vaultPath: '/vault',
        outputPath: 'content-engine/articles/task-2.md',
      },
    });
    expect(result.rewriteVersion?.versionType).toBe('rewrite');
    expect(result.exportRecord?.outputPath).toBe('/vault/out.md');
  });

  it('returns the rewrite task when publishable mode rewrites without export', async () => {
    const projectPath = await createProjectFixture();
    const createdAt = '2026-04-26T00:00:00.000Z';
    const request = vi
      .fn()
      .mockResolvedValueOnce({
        task: {
          id: 'task-4',
          title: 'Retrospective',
          articleType: 'build-retrospective',
          preferredChannel: 'blog',
          reader: 'developers',
          stage: TaskStage.Created,
          createdAt,
          updatedAt: createdAt,
        },
      })
      .mockResolvedValueOnce({
        task: {
          id: 'task-4',
          title: 'Retrospective',
          articleType: 'build-retrospective',
          preferredChannel: 'blog',
          reader: 'developers',
          stage: TaskStage.CollectingMaterials,
          createdAt,
          updatedAt: createdAt,
        },
        materials: [],
      })
      .mockResolvedValueOnce({
        task: {
          id: 'task-4',
          title: 'Retrospective',
          articleType: 'build-retrospective',
          preferredChannel: 'blog',
          reader: 'developers',
          stage: TaskStage.CollectingMaterials,
          createdAt,
          updatedAt: createdAt,
        },
        materials: [],
      })
      .mockResolvedValueOnce({
        task: {
          id: 'task-4',
          title: 'Retrospective',
          articleType: 'build-retrospective',
          preferredChannel: 'blog',
          reader: 'developers',
          stage: TaskStage.BedrockReview,
          createdAt,
          updatedAt: createdAt,
        },
        bedrock: {
          id: 'bedrock-4',
          taskId: 'task-4',
          theme: 'Retrospective',
          coreQuestion: 'Why now?',
          arguments: [],
          evidence: [],
          uncertainties: [],
          confirmed: false,
        },
      })
      .mockResolvedValueOnce({
        task: {
          id: 'task-4',
          title: 'Retrospective',
          articleType: 'build-retrospective',
          preferredChannel: 'blog',
          reader: 'developers',
          stage: TaskStage.BedrockReview,
          createdAt,
          updatedAt: createdAt,
        },
        bedrock: {
          id: 'bedrock-4',
          taskId: 'task-4',
          theme: 'Retrospective',
          coreQuestion: 'Why now?',
          arguments: [],
          evidence: [],
          uncertainties: [],
          confirmed: true,
        },
      })
      .mockResolvedValueOnce({
        task: {
          id: 'task-4',
          title: 'Retrospective',
          articleType: 'build-retrospective',
          preferredChannel: 'blog',
          reader: 'developers',
          stage: TaskStage.OutlineReview,
          createdAt,
          updatedAt: createdAt,
        },
        outline: {
          id: 'outline-4',
          taskId: 'task-4',
          title: 'Retrospective',
          sections: [],
          confirmed: false,
        },
      })
      .mockResolvedValueOnce({
        task: {
          id: 'task-4',
          title: 'Retrospective',
          articleType: 'build-retrospective',
          preferredChannel: 'blog',
          reader: 'developers',
          stage: TaskStage.OutlineReview,
          createdAt,
          updatedAt: createdAt,
        },
        outline: {
          id: 'outline-4',
          taskId: 'task-4',
          title: 'Retrospective',
          sections: [],
          confirmed: true,
        },
      })
      .mockResolvedValueOnce({
        task: {
          id: 'task-4',
          title: 'Retrospective',
          articleType: 'build-retrospective',
          preferredChannel: 'blog',
          reader: 'developers',
          stage: TaskStage.DraftReady,
          createdAt,
          updatedAt: createdAt,
        },
        version: {
          id: 'version-7',
          taskId: 'task-4',
          versionType: 'draft',
          content: '# Draft',
          basedOnBedrockId: 'bedrock-4',
          basedOnOutlineId: 'outline-4',
          styleProfileId: 'style-4',
          changeSummary: 'Initial draft',
        },
      })
      .mockResolvedValueOnce({
        task: {
          id: 'task-4',
          title: 'Retrospective',
          articleType: 'build-retrospective',
          preferredChannel: 'blog',
          reader: 'developers',
          stage: 'rewrite_ready',
          createdAt,
          updatedAt: createdAt,
        },
        version: {
          id: 'version-8',
          taskId: 'task-4',
          versionType: 'rewrite',
          content: '# Publishable rewrite',
          basedOnBedrockId: 'bedrock-4',
          basedOnOutlineId: 'outline-4',
          styleProfileId: 'style-4',
          changeSummary: 'Editorial pass',
        },
      });

    const runner = createProjectWriteRunner({
      baseUrl: 'http://127.0.0.1:4312',
      createApiClient: vi.fn((): ApiClientLike => ({ request })),
    });

    const result = await runner.run({
      projectPath,
      title: 'Retrospective',
      articleType: 'build-retrospective',
      reader: 'developers',
      channel: 'blog',
      stopAt: 'draft',
      editorialMode: 'publishable',
      export: false,
      withGitLog: false,
      withObsidianContext: false,
      modelEnhancement: 'off',
    });

    expect(request.mock.calls.map(([call]) => `${call.method} ${call.path}`)).toEqual([
      'POST /tasks',
      'POST /tasks/task-4/materials',
      'POST /tasks/task-4/materials',
      'POST /tasks/task-4/bedrock/generate',
      'POST /tasks/task-4/bedrock/bedrock-4/confirm',
      'POST /tasks/task-4/outlines/generate',
      'POST /tasks/task-4/outlines/outline-4/confirm',
      'POST /tasks/task-4/drafts/generate',
      'POST /tasks/task-4/rewrites',
    ]);
    expect(result.task.stage).toBe('rewrite_ready');
    expect(result.draftVersion?.id).toBe('version-7');
    expect(result.rewriteVersion?.id).toBe('version-8');
    expect(result.exportRecord).toBeNull();
  });

  it('runs rewrite before export when export is requested from the draft stop point', async () => {
    const projectPath = await createProjectFixture();
    const createdAt = '2026-04-26T00:00:00.000Z';
    const request = vi
      .fn()
      .mockResolvedValueOnce({
        task: {
          id: 'task-3',
          title: 'Retrospective',
          articleType: 'build-retrospective',
          preferredChannel: 'blog',
          reader: 'developers',
          stage: TaskStage.Created,
          createdAt,
          updatedAt: createdAt,
        },
      })
      .mockResolvedValueOnce({
        task: {
          id: 'task-3',
          title: 'Retrospective',
          articleType: 'build-retrospective',
          preferredChannel: 'blog',
          reader: 'developers',
          stage: TaskStage.CollectingMaterials,
          createdAt,
          updatedAt: createdAt,
        },
        materials: [],
      })
      .mockResolvedValueOnce({
        task: {
          id: 'task-3',
          title: 'Retrospective',
          articleType: 'build-retrospective',
          preferredChannel: 'blog',
          reader: 'developers',
          stage: TaskStage.CollectingMaterials,
          createdAt,
          updatedAt: createdAt,
        },
        materials: [],
      })
      .mockResolvedValueOnce({
        task: {
          id: 'task-3',
          title: 'Retrospective',
          articleType: 'build-retrospective',
          preferredChannel: 'blog',
          reader: 'developers',
          stage: TaskStage.BedrockReview,
          createdAt,
          updatedAt: createdAt,
        },
        bedrock: {
          id: 'bedrock-3',
          taskId: 'task-3',
          theme: 'Retrospective',
          coreQuestion: 'Why now?',
          arguments: [],
          evidence: [],
          uncertainties: [],
          confirmed: false,
        },
      })
      .mockResolvedValueOnce({
        task: {
          id: 'task-3',
          title: 'Retrospective',
          articleType: 'build-retrospective',
          preferredChannel: 'blog',
          reader: 'developers',
          stage: TaskStage.BedrockReview,
          createdAt,
          updatedAt: createdAt,
        },
        bedrock: {
          id: 'bedrock-3',
          taskId: 'task-3',
          theme: 'Retrospective',
          coreQuestion: 'Why now?',
          arguments: [],
          evidence: [],
          uncertainties: [],
          confirmed: true,
        },
      })
      .mockResolvedValueOnce({
        task: {
          id: 'task-3',
          title: 'Retrospective',
          articleType: 'build-retrospective',
          preferredChannel: 'blog',
          reader: 'developers',
          stage: TaskStage.OutlineReview,
          createdAt,
          updatedAt: createdAt,
        },
        outline: {
          id: 'outline-3',
          taskId: 'task-3',
          title: 'Retrospective',
          sections: [],
          confirmed: false,
        },
      })
      .mockResolvedValueOnce({
        task: {
          id: 'task-3',
          title: 'Retrospective',
          articleType: 'build-retrospective',
          preferredChannel: 'blog',
          reader: 'developers',
          stage: TaskStage.OutlineReview,
          createdAt,
          updatedAt: createdAt,
        },
        outline: {
          id: 'outline-3',
          taskId: 'task-3',
          title: 'Retrospective',
          sections: [],
          confirmed: true,
        },
      })
      .mockResolvedValueOnce({
        task: {
          id: 'task-3',
          title: 'Retrospective',
          articleType: 'build-retrospective',
          preferredChannel: 'blog',
          reader: 'developers',
          stage: TaskStage.DraftReady,
          createdAt,
          updatedAt: createdAt,
        },
        version: {
          id: 'version-5',
          taskId: 'task-3',
          versionType: 'draft',
          content: '# Draft',
          basedOnBedrockId: 'bedrock-3',
          basedOnOutlineId: 'outline-3',
          styleProfileId: 'style-3',
          changeSummary: 'Initial draft',
        },
      })
      .mockResolvedValueOnce({
        task: {
          id: 'task-3',
          title: 'Retrospective',
          articleType: 'build-retrospective',
          preferredChannel: 'blog',
          reader: 'developers',
          stage: TaskStage.Rewriting,
          createdAt,
          updatedAt: createdAt,
        },
        version: {
          id: 'version-6',
          taskId: 'task-3',
          versionType: 'rewrite',
          content: '# Rewrite',
          basedOnBedrockId: 'bedrock-3',
          basedOnOutlineId: 'outline-3',
          styleProfileId: 'style-3',
          changeSummary: 'Export-ready rewrite',
        },
      })
      .mockResolvedValueOnce({
        task: {
          id: 'task-3',
          title: 'Retrospective',
          articleType: 'build-retrospective',
          preferredChannel: 'blog',
          reader: 'developers',
          stage: TaskStage.Exported,
          createdAt,
          updatedAt: createdAt,
        },
        exportRecord: {
          id: 'export-2',
          taskId: 'task-3',
          versionId: 'version-6',
          channel: 'blog',
          format: 'markdown',
          outputPath: '/tmp/task-3.md',
        },
      });

    const runner = createProjectWriteRunner({
      baseUrl: 'http://127.0.0.1:4312',
      createApiClient: vi.fn((): ApiClientLike => ({ request })),
    });

    const result = await runner.run({
      projectPath,
      title: 'Retrospective',
      articleType: 'build-retrospective',
      reader: 'developers',
      channel: 'blog',
      stopAt: 'draft',
      editorialMode: 'none',
      export: true,
      exportPath: '/tmp/task-3.md',
      withGitLog: false,
      withObsidianContext: false,
      modelEnhancement: 'off',
    });

    expect(request.mock.calls.map(([call]) => `${call.method} ${call.path}`)).toEqual([
      'POST /tasks',
      'POST /tasks/task-3/materials',
      'POST /tasks/task-3/materials',
      'POST /tasks/task-3/bedrock/generate',
      'POST /tasks/task-3/bedrock/bedrock-3/confirm',
      'POST /tasks/task-3/outlines/generate',
      'POST /tasks/task-3/outlines/outline-3/confirm',
      'POST /tasks/task-3/drafts/generate',
      'POST /tasks/task-3/rewrites',
      'POST /tasks/task-3/exports',
    ]);
    expect(request.mock.calls[8]?.[0]).toMatchObject({
      body: {
        versionId: 'version-5',
        instruction: 'Tighten the draft.',
      },
    });
    expect(request.mock.calls[9]?.[0]).toMatchObject({
      body: {
        versionId: 'version-6',
        channel: 'blog',
        format: 'markdown',
        target: 'local',
        outputPath: '/tmp/task-3.md',
      },
    });
    expect(result.draftVersion?.id).toBe('version-5');
    expect(result.rewriteVersion?.id).toBe('version-6');
    expect(result.exportRecord?.versionId).toBe('version-6');
  });
});

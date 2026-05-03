import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { TaskStage, type TaskEnvelope } from '@ptce/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { buildProgram, type ApiClientLike } from '../src/index.js';
import { renderOutput } from '../src/output/renderers.js';
import type { ProjectWriteResult } from '../src/write/types.js';

interface CaptureStream {
  output: string;
  write: (chunk: string) => boolean;
}

const tempDirs: string[] = [];

const createCaptureStream = (): CaptureStream => ({
  output: '',
  write(chunk: string) {
    this.output += chunk;
    return true;
  },
});

const createProjectFixture = async (): Promise<string> => {
  const root = await mkdtemp(join(tmpdir(), 'ptce-cli-'));
  tempDirs.push(root);
  await writeFile(join(root, 'README.md'), '# Retrospective\n\nProject context');
  return root;
};

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map(async (dir) => rm(dir, { recursive: true, force: true })));
});

describe('buildProgram', () => {
  it('registers the full PTCE command surface', () => {
    const program = buildProgram();
    const commandNames = program.commands.map((command) => command.name());

    expect(commandNames).toEqual([
      'task',
      'material',
      'bedrock',
      'outline',
      'draft',
      'rewrite',
      'export',
      'write',
      'content',
      'tools',
    ]);

    expect(program.commands.find((command) => command.name() === 'task')?.commands.map((command) => command.name())).toEqual([
      'create',
    ]);
    expect(program.commands.find((command) => command.name() === 'material')?.commands.map((command) => command.name())).toEqual([
      'add',
      'import-obsidian',
      'list',
    ]);
    expect(program.commands.find((command) => command.name() === 'bedrock')?.commands.map((command) => command.name())).toEqual([
      'generate',
      'confirm',
      'get',
    ]);
    expect(program.commands.find((command) => command.name() === 'outline')?.commands.map((command) => command.name())).toEqual([
      'generate',
      'confirm',
      'get',
    ]);
    expect(program.commands.find((command) => command.name() === 'draft')?.commands.map((command) => command.name())).toEqual([
      'generate',
      'list',
    ]);
    expect(program.commands.find((command) => command.name() === 'rewrite')?.commands.map((command) => command.name())).toEqual([
      'run',
    ]);
    expect(program.commands.find((command) => command.name() === 'export')?.commands.map((command) => command.name())).toEqual([
      'run',
    ]);
    expect(program.commands.find((command) => command.name() === 'write')?.commands.map((command) => command.name())).toEqual([
      'project',
    ]);
    expect(program.commands.find((command) => command.name() === 'content')?.commands.map((command) => command.name())).toEqual([
      'create',
      'run',
      'artifact',
      'complete',
    ]);
    expect(program.commands.find((command) => command.name() === 'tools')?.commands.map((command) => command.name())).toEqual([
      'search',
      'page',
      'meme',
      'image',
      'media',
      'research',
    ]);
  });

  it('registers the write command group with the project subcommand', () => {
    const program = buildProgram();
    const writeCommand = program.commands.find((command) => command.name() === 'write');

    expect(writeCommand?.commands.map((command) => command.name())).toEqual(['project']);
  });

  it('posts content create payloads and renders json output', async () => {
    const stdout = createCaptureStream();
    const request = vi.fn().mockResolvedValue({
      task: {
        id: 'content-task-1',
        title: 'MVP review flow',
        contentType: 'prd',
        contentSubtype: 'mvp_scope',
        workflowProfileId: 'prd.default',
        qualityRubricId: 'prd.default',
        skillBindingId: 'prd.primary',
        audience: 'founder and implementation agent',
        currentActionId: 'problem_brief',
        sourceRequirements: [],
        status: 'planning',
        createdAt: '2026-05-02T00:00:00.000Z',
        updatedAt: '2026-05-02T00:00:00.000Z',
      },
      workflowProfile: { id: 'prd.default' },
      qualityRubric: { id: 'prd.default' },
      skillBinding: { id: 'prd.primary' },
      outputPackage: { id: 'output-package-1' },
    });
    const createApiClient = vi.fn(
      (): ApiClientLike => ({
        request,
      }),
    );
    const program = buildProgram({ createApiClient, stdout });

    await program.parseAsync([
      'node',
      'ptce',
      'content',
      'create',
      '--title',
      'MVP review flow',
      '--type',
      'prd',
      '--subtype',
      'mvp_scope',
      '--audience',
      'founder and implementation agent',
      '--purpose',
      'align scope',
      '--render',
      'json',
    ]);

    expect(request).toHaveBeenCalledWith({
      method: 'POST',
      path: '/content-tasks',
      body: {
        title: 'MVP review flow',
        contentType: 'prd',
        contentSubtype: 'mvp_scope',
        audience: 'founder and implementation agent',
        purpose: 'align scope',
        preferredChannel: undefined,
      },
    });
    expect(JSON.parse(stdout.output).task.id).toBe('content-task-1');
  });

  it('posts content run requests and renders json output', async () => {
    const stdout = createCaptureStream();
    const request = vi.fn().mockResolvedValue({
      task: {
        id: 'content-task-1',
        title: 'Build retrospective',
        contentType: 'public_article',
        contentSubtype: 'project_retrospective',
        workflowProfileId: 'public_article.default',
        qualityRubricId: 'public_article.default',
        skillBindingId: 'public_article.primary',
        audience: 'technical founders',
        currentActionId: 'finish',
        sourceRequirements: [],
        status: 'completed',
        createdAt: '2026-05-02T00:00:00.000Z',
        updatedAt: '2026-05-02T00:00:00.000Z',
      },
      workflowProfile: { id: 'public_article.default' },
      qualityRubric: { id: 'public_article.default' },
      skillBinding: { id: 'public_article.primary' },
      outputPackage: { id: 'output-package-1' },
      executedActionIds: ['appeal_brief'],
    });
    const createApiClient = vi.fn(
      (): ApiClientLike => ({
        request,
      }),
    );
    const program = buildProgram({ createApiClient, stdout });

    await program.parseAsync([
      'node',
      'ptce',
      'content',
      'run',
      '--task-id',
      'content-task-1',
      '--until',
      'draft',
      '--render',
      'json',
    ]);

    expect(request).toHaveBeenCalledWith({
      method: 'POST',
      path: '/content-tasks/content-task-1/runs',
      body: {
        untilActionId: 'draft',
      },
    });
    expect(JSON.parse(stdout.output).executedActionIds).toEqual(['appeal_brief']);
  });

  it('posts content artifact add requests from a file and renders json output', async () => {
    const stdout = createCaptureStream();
    const root = await mkdtemp(join(tmpdir(), 'ptce-cli-artifact-'));
    tempDirs.push(root);
    const draftPath = join(root, 'draft.md');
    await writeFile(draftPath, '# 技术设计文档\n\n正文');
    const request = vi.fn().mockResolvedValue({
      task: { id: 'content-task-1' },
      workflowProfile: { id: 'technical_doc.default' },
      qualityRubric: { id: 'technical_doc.default' },
      skillBinding: { id: 'technical_doc.primary' },
      outputPackage: { id: 'output-package-1' },
      artifacts: [{ id: 'artifact-1' }],
    });
    const createApiClient = vi.fn(
      (): ApiClientLike => ({
        request,
      }),
    );
    const program = buildProgram({ createApiClient, stdout });

    await program.parseAsync([
      'node',
      'ptce',
      'content',
      'artifact',
      'add',
      '--task-id',
      'content-task-1',
      '--type',
      'technical_draft',
      '--title',
      '技术设计文档',
      '--content-file',
      draftPath,
      '--format',
      'markdown',
      '--created-by',
      'agent',
      '--render',
      'json',
    ]);

    expect(request).toHaveBeenCalledWith({
      method: 'POST',
      path: '/content-tasks/content-task-1/artifacts',
      body: {
        artifactType: 'technical_draft',
        title: '技术设计文档',
        content: '# 技术设计文档\n\n正文',
        format: 'markdown',
        createdBy: 'agent',
      },
    });
    expect(JSON.parse(stdout.output).artifacts[0].id).toBe('artifact-1');
  });

  it('posts content complete requests and renders json output', async () => {
    const stdout = createCaptureStream();
    const request = vi.fn().mockResolvedValue({
      task: { id: 'content-task-1', status: 'completed' },
      workflowProfile: { id: 'general.default' },
      qualityRubric: { id: 'general.default' },
      skillBinding: { id: 'general.primary' },
      outputPackage: { id: 'output-package-1', readiness: 'review_ready' },
    });
    const createApiClient = vi.fn(
      (): ApiClientLike => ({
        request,
      }),
    );
    const program = buildProgram({ createApiClient, stdout });

    await program.parseAsync([
      'node',
      'ptce',
      'content',
      'complete',
      '--task-id',
      'content-task-1',
      '--render',
      'json',
    ]);

    expect(request).toHaveBeenCalledWith({
      method: 'POST',
      path: '/content-tasks/content-task-1/complete',
      body: {},
    });
    expect(JSON.parse(stdout.output).task.status).toBe('completed');
  });

  it('runs tools search web with an injected tools provider', async () => {
    const stdout = createCaptureStream();
    const toolsProvider = {
      async searchWeb() {
        return {
          query: 'latest ai news',
          provider: 'mock',
          results: [],
        };
      },
    };
    const program = buildProgram({ stdout, createToolsProvider: () => toolsProvider });

    await program.parseAsync([
      'node',
      'ptce',
      'tools',
      'search',
      'web',
      '--query',
      'latest ai news',
      '--render',
      'json',
    ]);

    expect(JSON.parse(stdout.output)).toEqual({
      query: 'latest ai news',
      provider: 'mock',
      results: [],
    });
  });

  it('lets tools image generate use the provider default model when --model is omitted', async () => {
    const stdout = createCaptureStream();
    const generateImage = vi.fn().mockResolvedValue({
      id: 'generated-1',
      kind: 'generated_image',
      localPath: 'artifacts/images/generated-1.png',
      provider: 'openai',
      generated: true,
      model: 'proxy-image-model',
      prompt: 'A concept image',
    });
    const program = buildProgram({ stdout, createToolsProvider: () => ({ generateImage }) });

    await program.parseAsync([
      'node',
      'ptce',
      'tools',
      'image',
      'generate',
      '--prompt',
      'A concept image',
      '--render',
      'json',
    ]);

    expect(generateImage).toHaveBeenCalledWith({
      prompt: 'A concept image',
      model: undefined,
    });
    expect(JSON.parse(stdout.output).model).toBe('proxy-image-model');
  });

  it('uses the default base URL for task create and renders text output', async () => {
    const stdout = createCaptureStream();
    const request = vi.fn().mockResolvedValue({
      task: {
        id: 'task-1',
        title: 'Fiber Architecture',
        articleType: 'deep-dive',
        preferredChannel: 'blog',
        reader: 'frontend engineers',
        stage: TaskStage.Created,
        createdAt: '2026-04-26T00:00:00.000Z',
        updatedAt: '2026-04-26T00:00:00.000Z',
      },
    } satisfies TaskEnvelope);
    const createApiClient = vi.fn(
      (): ApiClientLike => ({
        request,
      }),
    );

    const program = buildProgram({ createApiClient, stdout });

    await program.parseAsync([
      'node',
      'ptce',
      'task',
      'create',
      '--title',
      'Fiber Architecture',
      '--article-type',
      'deep-dive',
      '--reader',
      'frontend engineers',
    ]);

    expect(createApiClient).toHaveBeenCalledWith({
      baseUrl: 'http://127.0.0.1:4312',
    });
    expect(request).toHaveBeenCalledWith({
      method: 'POST',
      path: '/tasks',
      body: {
        title: 'Fiber Architecture',
        articleType: 'deep-dive',
        preferredChannel: 'blog',
        reader: 'frontend engineers',
      },
    });
    expect(stdout.output).toContain('task:');
    expect(stdout.output).toContain('id: task-1');
    expect(stdout.output).toContain('stage: created');
  });

  it('accepts an explicit preferred channel for task create', async () => {
    const stdout = createCaptureStream();
    const request = vi.fn().mockResolvedValue({
      task: {
        id: 'task-2',
        title: 'Fiber Architecture',
        articleType: 'deep-dive',
        preferredChannel: 'wechat',
        reader: 'frontend engineers',
        stage: TaskStage.Created,
        createdAt: '2026-04-26T00:00:00.000Z',
        updatedAt: '2026-04-26T00:00:00.000Z',
      },
    } satisfies TaskEnvelope);
    const createApiClient = vi.fn(
      (): ApiClientLike => ({
        request,
      }),
    );

    const program = buildProgram({ createApiClient, stdout });

    await program.parseAsync([
      'node',
      'ptce',
      'task',
      'create',
      '--title',
      'Fiber Architecture',
      '--article-type',
      'deep-dive',
      '--preferred-channel',
      'wechat',
      '--reader',
      'frontend engineers',
    ]);

    expect(request).toHaveBeenCalledWith({
      method: 'POST',
      path: '/tasks',
      body: {
        title: 'Fiber Architecture',
        articleType: 'deep-dive',
        preferredChannel: 'wechat',
        reader: 'frontend engineers',
      },
    });
    expect(stdout.output).toContain('preferredChannel: wechat');
  });

  it('maps export run options to the obsidian export payload and renders json', async () => {
    const stdout = createCaptureStream();
    const request = vi.fn().mockResolvedValue({
      task: {
        id: 'task-1',
        title: 'Fiber Architecture',
        articleType: 'deep-dive',
        preferredChannel: 'blog',
        reader: 'frontend engineers',
        stage: TaskStage.Exported,
        createdAt: '2026-04-26T00:00:00.000Z',
        updatedAt: '2026-04-26T00:00:00.000Z',
      },
      exportRecord: {
        id: 'export-1',
        taskId: 'task-1',
        versionId: 'version-2',
        channel: 'blog',
        format: 'markdown',
        outputPath: '/vault/exports/fiber-architecture.md',
        vaultPath: '/vault',
        relativePath: 'exports/fiber-architecture.md',
      },
    });
    const createApiClient = vi.fn(
      (): ApiClientLike => ({
        request,
      }),
    );

    const program = buildProgram({ createApiClient, stdout });

    await program.parseAsync([
      'node',
      'ptce',
      'export',
      'run',
      'task-1',
      '--version-id',
      'version-2',
      '--channel',
      'blog',
      '--format',
      'markdown',
      '--target',
      'obsidian',
      '--vault-path',
      '/vault',
      '--output-path',
      'exports/fiber-architecture.md',
      '--render',
      'json',
    ]);

    expect(request).toHaveBeenCalledWith({
      method: 'POST',
      path: '/tasks/task-1/exports',
      body: {
        versionId: 'version-2',
        channel: 'blog',
        format: 'markdown',
        target: 'obsidian',
        vaultPath: '/vault',
        outputPath: 'exports/fiber-architecture.md',
      },
    });
    expect(stdout.output).toContain('"exportRecord"');
    expect(stdout.output).toContain('"relativePath": "exports/fiber-architecture.md"');
  });

  it('maps write project options into a high-level runner request and renders json', async () => {
    const stdout = createCaptureStream();
    const runProjectWrite = vi.fn().mockResolvedValue({
      task: {
        id: 'task-1',
        title: 'AI Homework Review Retrospective',
        articleType: 'build-retrospective',
        preferredChannel: 'blog',
        reader: 'agent curious developers',
        stage: TaskStage.DraftReady,
        createdAt: '2026-04-26T00:00:00.000Z',
        updatedAt: '2026-04-26T00:00:00.000Z',
      },
      materials: [],
      bedrock: null,
      outline: null,
      draftVersion: null,
      rewriteVersion: null,
      exportRecord: null,
      stopAt: 'draft',
      editorialMode: 'none',
      selectedSources: [
        {
          id: 'source-readme',
          kind: 'file',
          path: '/repo/README.md',
          role: 'project-definition',
        },
      ],
      skippedSources: [],
      modelActions: ['selected_materials', 'enhanced_intent'],
    } satisfies ProjectWriteResult);
    const createApiClient = vi.fn();
    const createWriteProjectRunner = vi.fn(() => ({ run: runProjectWrite }));

    const program = buildProgram({
      createApiClient,
      createWriteProjectRunner,
      stdout,
    });

    await program.parseAsync([
      'node',
      'ptce',
      'write',
      'project',
      '--base-url',
      'http://127.0.0.1:4999',
      '--project-path',
      '/repo',
      '--title',
      'AI Homework Review Retrospective',
      '--article-type',
      'build-retrospective',
      '--reader',
      'agent curious developers',
      '--editorial-mode',
      'publishable',
      '--export',
      '--export-path',
      'exports/ai-homework-review.md',
      '--obsidian-vault-path',
      '/vault',
      '--source-paths',
      'README.md',
      'docs/notes.md',
      '--with-obsidian-context',
      '--without-git-log',
      '--max-materials',
      '7',
      '--model-enhancement',
      'select-only',
      '--stop-at',
      'draft',
      '--render',
      'json',
    ]);

    expect(createWriteProjectRunner).toHaveBeenCalledWith({
      baseUrl: 'http://127.0.0.1:4999',
      createApiClient,
    });
    expect(runProjectWrite).toHaveBeenCalledWith({
      projectPath: '/repo',
      title: 'AI Homework Review Retrospective',
      articleType: 'build-retrospective',
      reader: 'agent curious developers',
      goal: undefined,
      channel: 'blog',
      stopAt: 'draft',
      editorialMode: 'publishable',
      export: true,
      exportPath: 'exports/ai-homework-review.md',
      obsidianVaultPath: '/vault',
      sourcePaths: ['README.md', 'docs/notes.md'],
      withGitLog: false,
      withObsidianContext: true,
      maxMaterials: 7,
      modelEnhancement: 'select-only',
    });
    expect(stdout.output).toContain('"selectedSources"');
    expect(stdout.output).toContain('"modelActions"');
  });

  it('uses the default write project runner to execute the real workflow through draft by default', async () => {
    const projectPath = await createProjectFixture();
    const stdout = createCaptureStream();
    const createdAt = '2026-04-26T00:00:00.000Z';
    const request = vi
      .fn()
      .mockResolvedValueOnce({
        task: {
          id: 'task-write-1',
          title: 'AI Homework Review Retrospective',
          articleType: 'build-retrospective',
          preferredChannel: 'blog',
          reader: 'agent curious developers',
          stage: TaskStage.Created,
          createdAt,
          updatedAt: createdAt,
        },
      } satisfies TaskEnvelope)
      .mockResolvedValueOnce({
        task: {
          id: 'task-write-1',
          title: 'AI Homework Review Retrospective',
          articleType: 'build-retrospective',
          preferredChannel: 'blog',
          reader: 'agent curious developers',
          stage: TaskStage.CollectingMaterials,
          createdAt,
          updatedAt: createdAt,
        },
        materials: [
          {
            id: 'material-intent',
            taskId: 'task-write-1',
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
          id: 'task-write-1',
          title: 'AI Homework Review Retrospective',
          articleType: 'build-retrospective',
          preferredChannel: 'blog',
          reader: 'agent curious developers',
          stage: TaskStage.CollectingMaterials,
          createdAt,
          updatedAt: createdAt,
        },
        materials: [
          {
            id: 'material-intent',
            taskId: 'task-write-1',
            type: 'prompt',
            title: '写作任务说明',
            source: 'inline',
            content: 'intent',
            createdAt,
          },
          {
            id: 'material-readme',
            taskId: 'task-write-1',
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
          id: 'task-write-1',
          title: 'AI Homework Review Retrospective',
          articleType: 'build-retrospective',
          preferredChannel: 'blog',
          reader: 'agent curious developers',
          stage: TaskStage.BedrockReview,
          createdAt,
          updatedAt: createdAt,
        },
        bedrock: {
          id: 'bedrock-1',
          taskId: 'task-write-1',
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
          id: 'task-write-1',
          title: 'AI Homework Review Retrospective',
          articleType: 'build-retrospective',
          preferredChannel: 'blog',
          reader: 'agent curious developers',
          stage: TaskStage.BedrockReview,
          createdAt,
          updatedAt: createdAt,
        },
        bedrock: {
          id: 'bedrock-1',
          taskId: 'task-write-1',
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
          id: 'task-write-1',
          title: 'AI Homework Review Retrospective',
          articleType: 'build-retrospective',
          preferredChannel: 'blog',
          reader: 'agent curious developers',
          stage: TaskStage.OutlineReview,
          createdAt,
          updatedAt: createdAt,
        },
        outline: {
          id: 'outline-1',
          taskId: 'task-write-1',
          title: 'AI Homework Review Retrospective',
          sections: [],
          confirmed: false,
        },
      })
      .mockResolvedValueOnce({
        task: {
          id: 'task-write-1',
          title: 'AI Homework Review Retrospective',
          articleType: 'build-retrospective',
          preferredChannel: 'blog',
          reader: 'agent curious developers',
          stage: TaskStage.OutlineReview,
          createdAt,
          updatedAt: createdAt,
        },
        outline: {
          id: 'outline-1',
          taskId: 'task-write-1',
          title: 'AI Homework Review Retrospective',
          sections: [],
          confirmed: true,
        },
      })
      .mockResolvedValueOnce({
        task: {
          id: 'task-write-1',
          title: 'AI Homework Review Retrospective',
          articleType: 'build-retrospective',
          preferredChannel: 'blog',
          reader: 'agent curious developers',
          stage: TaskStage.DraftReady,
          createdAt,
          updatedAt: createdAt,
        },
        version: {
          id: 'version-1',
          taskId: 'task-write-1',
          versionType: 'draft',
          content: '# Draft',
          basedOnBedrockId: 'bedrock-1',
          basedOnOutlineId: 'outline-1',
          styleProfileId: 'style-1',
          changeSummary: 'Initial draft',
        },
      });
    const createApiClient = vi.fn(
      (): ApiClientLike => ({
        request,
      }),
    );

    const program = buildProgram({ createApiClient, stdout });

    await program.parseAsync([
      'node',
      'ptce',
      'write',
      'project',
      '--project-path',
      projectPath,
      '--title',
      'AI Homework Review Retrospective',
      '--article-type',
      'build-retrospective',
      '--reader',
      'agent curious developers',
      '--without-git-log',
      '--render',
      'json',
    ]);

    expect(createApiClient).toHaveBeenCalledWith({
      baseUrl: 'http://127.0.0.1:4312',
    });
    expect(request).toHaveBeenNthCalledWith(1, {
      method: 'POST',
      path: '/tasks',
      body: {
        title: 'AI Homework Review Retrospective',
        articleType: 'build-retrospective',
        preferredChannel: 'blog',
        reader: 'agent curious developers',
      },
    });
    expect(request).toHaveBeenCalledTimes(8);
    expect(stdout.output).toContain('"task"');
    expect(stdout.output).toContain('"stopAt": "draft"');
    expect(stdout.output).toContain('"selectedSources"');
    expect(stdout.output).toContain('"id": "README.md"');
    expect(stdout.output).toContain('"modelActions"');
  });

  it('fails fast for invalid write project max-materials values before invoking the runner', async () => {
    const stdout = createCaptureStream();
    const stderr = createCaptureStream();
    const runProjectWrite = vi.fn();
    const createWriteProjectRunner = vi.fn(() => ({ run: runProjectWrite }));
    const program = buildProgram({
      createWriteProjectRunner,
      stdout,
      stderr,
    });
    program.exitOverride();

    for (const invalidValue of ['10foo', 'abc', '0', '-1']) {
      await expect(
        program.parseAsync([
          'node',
          'ptce',
          'write',
          'project',
          '--project-path',
          '/repo',
          '--title',
          'AI Homework Review Retrospective',
          '--article-type',
          'build-retrospective',
          '--reader',
          'agent curious developers',
          '--max-materials',
          invalidValue,
        ]),
      ).rejects.toThrow(/process\.exit unexpectedly called with "1"/);
    }

    expect(createWriteProjectRunner).not.toHaveBeenCalled();
    expect(runProjectWrite).not.toHaveBeenCalled();
  });

  it('defaults export run to the configured obsidian vault and generated output path', async () => {
    vi.stubEnv('PTCE_OBSIDIAN_VAULT_PATH', '/Users/a1234/Documents/Obsidian Vault');

    const stdout = createCaptureStream();
    const request = vi.fn().mockResolvedValue({
      task: {
        id: 'task-obsidian',
        title: 'AI Homework Review 的 vibecoding 实践分享',
        articleType: 'build-retrospective',
        preferredChannel: 'blog',
        reader: 'agent curious developers',
        stage: TaskStage.Exported,
        createdAt: '2026-04-26T00:00:00.000Z',
        updatedAt: '2026-04-26T00:00:00.000Z',
      },
      exportRecord: {
        id: 'export-obsidian',
        taskId: 'task-obsidian',
        versionId: 'version-9',
        channel: 'blog',
        format: 'markdown',
        outputPath:
          '/Users/a1234/Documents/Obsidian Vault/content-engine/articles/task-obsidian-blog.md',
        vaultPath: '/Users/a1234/Documents/Obsidian Vault',
        relativePath: 'content-engine/articles/task-obsidian-blog.md',
      },
    });
    const createApiClient = vi.fn(
      (): ApiClientLike => ({
        request,
      }),
    );

    const program = buildProgram({ createApiClient, stdout });

    await program.parseAsync([
      'node',
      'ptce',
      'export',
      'run',
      'task-obsidian',
      '--version-id',
      'version-9',
      '--channel',
      'blog',
      '--format',
      'markdown',
      '--render',
      'json',
    ]);

    expect(request).toHaveBeenCalledWith({
      method: 'POST',
      path: '/tasks/task-obsidian/exports',
      body: {
        versionId: 'version-9',
        channel: 'blog',
        format: 'markdown',
        target: 'obsidian',
        vaultPath: '/Users/a1234/Documents/Obsidian Vault',
        outputPath: 'content-engine/articles/task-obsidian-blog.md',
      },
    });
    expect(stdout.output).toContain('"relativePath": "content-engine/articles/task-obsidian-blog.md"');

    vi.unstubAllEnvs();
  });

  it('maps material add file-source options to the material payload', async () => {
    const stdout = createCaptureStream();
    const request = vi.fn().mockResolvedValue({
      task: {
        id: 'task-1',
        title: 'Fiber Architecture',
        articleType: 'deep-dive',
        preferredChannel: 'blog',
        reader: 'frontend engineers',
        stage: TaskStage.CollectingMaterials,
        createdAt: '2026-04-26T00:00:00.000Z',
        updatedAt: '2026-04-26T00:00:00.000Z',
      },
      materials: [],
    });
    const createApiClient = vi.fn(
      (): ApiClientLike => ({
        request,
      }),
    );

    const program = buildProgram({ createApiClient, stdout });

    await program.parseAsync([
      'node',
      'ptce',
      'material',
      'add',
      'task-1',
      '--type',
      'repo',
      '--title',
      'PTCE repo',
      '--source',
      'file',
      '--content',
      'packages/cli',
      '--relative-path',
      'packages/cli',
    ]);

    expect(request).toHaveBeenCalledWith({
      method: 'POST',
      path: '/tasks/task-1/materials',
      body: {
        type: 'repo',
        title: 'PTCE repo',
        source: 'file',
        content: 'packages/cli',
        relativePath: 'packages/cli',
      },
    });
  });

  it('maps bedrock get, outline confirm, draft list, and rewrite run to workflow routes', async () => {
    const stdout = createCaptureStream();
    const request = vi
      .fn()
      .mockResolvedValueOnce({
        task: { id: 'task-1', title: 'Fiber', articleType: 'deep-dive', preferredChannel: 'blog', reader: 'eng', stage: TaskStage.BedrockReview, createdAt: '2026-04-26T00:00:00.000Z', updatedAt: '2026-04-26T00:00:00.000Z' },
        bedrock: { id: 'bedrock-1', taskId: 'task-1', theme: 'Fiber', coreQuestion: 'Why', arguments: [], evidence: [], uncertainties: [], confirmed: false },
      })
      .mockResolvedValueOnce({
        task: { id: 'task-1', title: 'Fiber', articleType: 'deep-dive', preferredChannel: 'blog', reader: 'eng', stage: TaskStage.DraftReady, createdAt: '2026-04-26T00:00:00.000Z', updatedAt: '2026-04-26T00:00:00.000Z' },
        outline: { id: 'outline-1', taskId: 'task-1', title: 'Fiber Outline', sections: [], confirmed: true },
      })
      .mockResolvedValueOnce({
        task: { id: 'task-1', title: 'Fiber', articleType: 'deep-dive', preferredChannel: 'blog', reader: 'eng', stage: TaskStage.DraftReady, createdAt: '2026-04-26T00:00:00.000Z', updatedAt: '2026-04-26T00:00:00.000Z' },
        versions: [],
      })
      .mockResolvedValueOnce({
        task: { id: 'task-1', title: 'Fiber', articleType: 'deep-dive', preferredChannel: 'blog', reader: 'eng', stage: TaskStage.Rewriting, createdAt: '2026-04-26T00:00:00.000Z', updatedAt: '2026-04-26T00:00:00.000Z' },
        version: {
          id: 'version-2',
          taskId: 'task-1',
          versionType: 'rewrite',
          content: 'Updated',
          basedOnBedrockId: 'bedrock-1',
          basedOnOutlineId: 'outline-1',
          styleProfileId: 'style-1',
          changeSummary: 'Tighter close',
        },
      });
    const createApiClient = vi.fn(
      (): ApiClientLike => ({
        request,
      }),
    );

    await buildProgram({ createApiClient, stdout }).parseAsync([
      'node',
      'ptce',
      'bedrock',
      'get',
      'task-1',
    ]);
    await buildProgram({ createApiClient, stdout }).parseAsync([
      'node',
      'ptce',
      'outline',
      'confirm',
      'task-1',
      'outline-1',
    ]);
    await buildProgram({ createApiClient, stdout }).parseAsync([
      'node',
      'ptce',
      'draft',
      'list',
      'task-1',
    ]);
    await buildProgram({ createApiClient, stdout }).parseAsync([
      'node',
      'ptce',
      'rewrite',
      'run',
      'task-1',
      '--version-id',
      'version-1',
      '--instruction',
      'Make the close sharper.',
    ]);

    expect(request).toHaveBeenNthCalledWith(1, {
      method: 'GET',
      path: '/tasks/task-1/bedrock/latest',
    });
    expect(request).toHaveBeenNthCalledWith(2, {
      method: 'POST',
      path: '/tasks/task-1/outlines/outline-1/confirm',
    });
    expect(request).toHaveBeenNthCalledWith(3, {
      method: 'GET',
      path: '/tasks/task-1/versions',
    });
    expect(request).toHaveBeenNthCalledWith(4, {
      method: 'POST',
      path: '/tasks/task-1/rewrites',
      body: {
        versionId: 'version-1',
        instruction: 'Make the close sharper.',
      },
    });
  });

  it('fails fast for invalid enum options before issuing a request', async () => {
    const stdout = createCaptureStream();
    const stderr = createCaptureStream();
    const request = vi.fn();
    const createApiClient = vi.fn(
      (): ApiClientLike => ({
        request,
      }),
    );
    const program = buildProgram({ createApiClient, stdout, stderr });
    program.exitOverride();

    await expect(
      program.parseAsync([
        'node',
        'ptce',
        'export',
        'run',
        'task-1',
        '--version-id',
        'version-2',
        '--channel',
        'newsletter',
        '--format',
        'markdown',
      ]),
    ).rejects.toThrow(/process\.exit unexpectedly called with "1"/);

    expect(request).not.toHaveBeenCalled();
  });

  it('renders multiline strings structurally in text and markdown output', () => {
    const text = renderOutput(
      {
        version: {
          id: 'version-1',
          content: 'Line one\nLine two',
        },
      },
      'text',
    );
    const markdown = renderOutput(
      {
        version: {
          id: 'version-1',
          content: 'Line one\nLine two',
        },
      },
      'markdown',
    );

    expect(text).toContain('content: |');
    expect(text).toContain('  Line one');
    expect(text).toContain('  Line two');
    expect(markdown).toContain('- **content:**');
    expect(markdown).toContain('```text');
    expect(markdown).toContain('Line one');
    expect(markdown).toContain('Line two');
  });
});

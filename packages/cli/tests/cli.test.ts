import { TaskStage, type TaskEnvelope } from '@ptce/shared';
import { describe, expect, it, vi } from 'vitest';

import { buildProgram, type ApiClientLike } from '../src/index.js';
import { renderOutput } from '../src/output/renderers.js';

interface CaptureStream {
  output: string;
  write: (chunk: string) => boolean;
}

const createCaptureStream = (): CaptureStream => ({
  output: '',
  write(chunk: string) {
    this.output += chunk;
    return true;
  },
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
  });

  it('uses the default base URL for task create and renders text output', async () => {
    const stdout = createCaptureStream();
    const request = vi.fn().mockResolvedValue({
      task: {
        id: 'task-1',
        title: 'Fiber Architecture',
        articleType: 'deep-dive',
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
        reader: 'frontend engineers',
      },
    });
    expect(stdout.output).toContain('task:');
    expect(stdout.output).toContain('id: task-1');
    expect(stdout.output).toContain('stage: created');
  });

  it('maps export run options to the obsidian export payload and renders json', async () => {
    const stdout = createCaptureStream();
    const request = vi.fn().mockResolvedValue({
      task: {
        id: 'task-1',
        title: 'Fiber Architecture',
        articleType: 'deep-dive',
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

  it('maps material add file-source options to the material payload', async () => {
    const stdout = createCaptureStream();
    const request = vi.fn().mockResolvedValue({
      task: {
        id: 'task-1',
        title: 'Fiber Architecture',
        articleType: 'deep-dive',
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
        task: { id: 'task-1', title: 'Fiber', articleType: 'deep-dive', reader: 'eng', stage: TaskStage.BedrockReview, createdAt: '2026-04-26T00:00:00.000Z', updatedAt: '2026-04-26T00:00:00.000Z' },
        bedrock: { id: 'bedrock-1', taskId: 'task-1', theme: 'Fiber', coreQuestion: 'Why', arguments: [], evidence: [], uncertainties: [], confirmed: false },
      })
      .mockResolvedValueOnce({
        task: { id: 'task-1', title: 'Fiber', articleType: 'deep-dive', reader: 'eng', stage: TaskStage.DraftReady, createdAt: '2026-04-26T00:00:00.000Z', updatedAt: '2026-04-26T00:00:00.000Z' },
        outline: { id: 'outline-1', taskId: 'task-1', title: 'Fiber Outline', sections: [], confirmed: true },
      })
      .mockResolvedValueOnce({
        task: { id: 'task-1', title: 'Fiber', articleType: 'deep-dive', reader: 'eng', stage: TaskStage.DraftReady, createdAt: '2026-04-26T00:00:00.000Z', updatedAt: '2026-04-26T00:00:00.000Z' },
        versions: [],
      })
      .mockResolvedValueOnce({
        task: { id: 'task-1', title: 'Fiber', articleType: 'deep-dive', reader: 'eng', stage: TaskStage.Rewriting, createdAt: '2026-04-26T00:00:00.000Z', updatedAt: '2026-04-26T00:00:00.000Z' },
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

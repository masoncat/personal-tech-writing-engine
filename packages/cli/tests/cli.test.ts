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

  it('renders markdown output for nested API responses', () => {
    const markdown = renderOutput(
      {
        task: {
          id: 'task-1',
          stage: TaskStage.DraftReady,
        },
        versions: [
          {
            id: 'version-1',
            versionType: 'draft',
          },
        ],
      },
      'markdown',
    );

    expect(markdown).toContain('## task');
    expect(markdown).toContain('- **id:** task-1');
    expect(markdown).toContain('## versions');
    expect(markdown).toContain('- **versionType:** draft');
  });
});

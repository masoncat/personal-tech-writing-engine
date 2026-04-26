import { cp, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  TaskStage,
  type BedrockResponse,
  type ExportResponse,
  type MaterialListResponse,
  type OutlineResponse,
  type TaskEnvelope,
  type VersionResponse,
} from '../../packages/shared/src/index.js';
import { afterEach, describe, expect, it } from 'vitest';

import { buildProgram } from '../../packages/cli/src/index.js';
import { buildApp } from '../../packages/mock-server/src/app.js';

interface CaptureStream {
  output: string;
  write: (chunk: string) => boolean;
}

const tempDirs: string[] = [];
const fixturesDir = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../fixtures/obsidian-vault',
);

const createCaptureStream = (): CaptureStream => ({
  output: '',
  write(chunk: string) {
    this.output += chunk;
    return true;
  },
});

const createTempDir = async (prefix: string) => {
  const dir = await mkdtemp(join(tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
};

const runCli = async <T>(
  args: string[],
  request: (options: { method: 'GET' | 'POST'; path: string; body?: unknown }) => Promise<unknown>,
): Promise<T> => {
  const stdout = createCaptureStream();
  const stderr = createCaptureStream();
  const program = buildProgram({
    createApiClient: () => ({
      request,
    }),
    stdout,
    stderr,
  });

  program.exitOverride();

  const commandArgs = [
    ...args.slice(0, 2),
    '--base-url',
    'http://ptce.local',
    '--render',
    'json',
    ...args.slice(2),
  ];

  await program.parseAsync(['node', 'ptce', ...commandArgs]);

  expect(stderr.output).toBe('');

  return JSON.parse(stdout.output.trim()) as T;
};

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('ptce cli smoke workflow', () => {
  it('drives the full workflow through the mock server app and exports to an obsidian vault', async () => {
    const dataDir = await createTempDir('ptce-e2e-data-');
    const importVaultDir = await createTempDir('ptce-e2e-import-vault-');
    const exportVaultDir = await createTempDir('ptce-e2e-export-vault-');

    await cp(fixturesDir, importVaultDir, { recursive: true });

    const app = buildApp({ dataDir });
    await app.ready();

    const request = async ({
      method,
      path,
      body,
    }: {
      method: 'GET' | 'POST';
      path: string;
      body?: unknown;
    }) => {
      const response = await app.inject({
        method,
        url: path,
        payload: body,
      });

      const payload = response.body.length > 0 ? response.json() : undefined;

      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw new Error(`Injected request failed with status ${response.statusCode}: ${JSON.stringify(payload)}`);
      }

      return payload;
    };

    try {
      const taskCreated = await runCli<TaskEnvelope>([
        'task',
        'create',
        '--title',
        'Fiber Architecture',
        '--article-type',
        'deep-dive',
        '--reader',
        'frontend platform engineers',
      ], request);

      const taskId = taskCreated.task.id;

      const importedMaterials = await runCli<MaterialListResponse>([
        'material',
        'import-obsidian',
        taskId,
        '--vault-path',
        importVaultDir,
        '--path',
        importVaultDir,
      ], request);

      const generatedBedrock = await runCli<BedrockResponse>([
        'bedrock',
        'generate',
        taskId,
      ], request);

      const confirmedBedrock = await runCli<BedrockResponse>([
        'bedrock',
        'confirm',
        taskId,
        generatedBedrock.bedrock.id,
      ], request);

      const generatedOutline = await runCli<OutlineResponse>([
        'outline',
        'generate',
        taskId,
      ], request);

      const confirmedOutline = await runCli<OutlineResponse>([
        'outline',
        'confirm',
        taskId,
        generatedOutline.outline.id,
      ], request);

      const generatedDraft = await runCli<VersionResponse>([
        'draft',
        'generate',
        taskId,
      ], request);

      const rewrittenDraft = await runCli<VersionResponse>([
        'rewrite',
        'run',
        taskId,
        '--version-id',
        generatedDraft.version.id,
        '--instruction',
        'Make it more historical and add a concise closing takeaway.',
      ], request);

      const exportedDraft = await runCli<ExportResponse>([
        'export',
        'run',
        taskId,
        '--version-id',
        rewrittenDraft.version.id,
        '--channel',
        'blog',
        '--format',
        'markdown',
        '--target',
        'obsidian',
        '--vault-path',
        exportVaultDir,
        '--output-path',
        'exports/fiber-architecture.md',
      ], request);

      expect([
        taskCreated.task.stage,
        importedMaterials.task.stage,
        generatedBedrock.task.stage,
        confirmedBedrock.task.stage,
        generatedOutline.task.stage,
        confirmedOutline.task.stage,
        generatedDraft.task.stage,
        rewrittenDraft.task.stage,
        exportedDraft.task.stage,
      ]).toEqual([
        TaskStage.Created,
        TaskStage.CollectingMaterials,
        TaskStage.BedrockReview,
        TaskStage.OutlineReview,
        TaskStage.OutlineReview,
        TaskStage.DraftReady,
        TaskStage.DraftReady,
        TaskStage.Rewriting,
        TaskStage.Exported,
      ]);

      expect(importedMaterials.materials).toHaveLength(2);
      expect(importedMaterials.materials.map((material) => material.title)).toEqual([
        'Fiber note',
        'History post',
      ]);
      expect(importedMaterials.materials.every((material) => material.source === 'obsidian')).toBe(true);

      expect(generatedBedrock.bedrock.confirmed).toBe(false);
      expect(confirmedBedrock.bedrock.confirmed).toBe(true);
      expect(generatedOutline.outline.confirmed).toBe(false);
      expect(confirmedOutline.outline.confirmed).toBe(true);
      expect(generatedDraft.version.versionType).toBe('draft');
      expect(rewrittenDraft.version.versionType).toBe('rewrite');
      expect(rewrittenDraft.version.styleProfileId).toBe(generatedDraft.version.styleProfileId);

      expect(exportedDraft.exportRecord.relativePath).toBe('exports/fiber-architecture.md');
      expect(exportedDraft.exportRecord.vaultPath).toBe(exportVaultDir);

      const exportedMarkdown = await readFile(
        join(exportVaultDir, 'exports/fiber-architecture.md'),
        'utf8',
      );

      expect(exportedMarkdown).toContain('channel: blog');
      expect(exportedMarkdown).toContain('Revision instruction');
    } finally {
      await app.close();
    }
  });
});

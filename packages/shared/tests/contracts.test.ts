import { describe, expect, it } from 'vitest';
import {
  ErrorCode,
  type CreateTaskRequest,
  type GenerateExportRequest,
  type ExportTarget,
  TaskStage,
  type VersionResponse,
} from '../src/index.js';

const sampleTask = {
  id: 'task-1',
  title: 'React Fiber scheduling',
  articleType: 'source-analysis',
  reader: 'frontend engineers',
  stage: TaskStage.DraftReady,
  createdAt: '2026-04-26T00:00:00.000Z',
  updatedAt: '2026-04-26T00:00:00.000Z',
};

const sampleVersion = {
  id: 'version-1',
  taskId: 'task-1',
  versionType: 'draft' as const,
  content: 'Draft content',
  basedOnBedrockId: 'bedrock-1',
  basedOnOutlineId: 'outline-1',
  changeSummary: 'Initial draft',
};

const versionResponse: VersionResponse = {
  task: sampleTask,
  version: sampleVersion,
};

const localExportRequest: GenerateExportRequest = {
  versionId: 'version-1',
  channel: 'blog',
  format: 'markdown',
};

const obsidianExportRequest: GenerateExportRequest = {
  versionId: 'version-1',
  channel: 'wechat',
  format: 'markdown',
  target: 'obsidian',
  vaultPath: '/vault',
  outputPath: 'posts/fiber.md',
};

// @ts-expect-error obsidian exports require both vaultPath and outputPath
const invalidObsidianExportRequest: GenerateExportRequest = {
  versionId: 'version-1',
  channel: 'blog',
  format: 'markdown',
  target: 'obsidian',
};

describe('shared contracts', () => {
  it('keeps export targets explicit', () => {
    const target: ExportTarget = 'obsidian';

    expect(target).toBe('obsidian');
  });

  it('defines the required task creation request shape', () => {
    const request: CreateTaskRequest = {
      title: 'React Fiber scheduling',
      articleType: 'source-analysis',
      reader: 'frontend engineers',
    };

    expect(request.title).toContain('Fiber');
    expect(request.articleType).toBe('source-analysis');
    expect(request.reader).toBe('frontend engineers');
  });

  it('defines the invalid stage transition error code', () => {
    expect(ErrorCode.InvalidStageTransition).toBe('INVALID_STAGE_TRANSITION');
  });

  it('defines a single generated version response shape', () => {
    expect(versionResponse.task.stage).toBe('draft_ready');
    expect(versionResponse.version.versionType).toBe('draft');
  });

  it('keeps export request target variants explicit', () => {
    expect(localExportRequest).not.toHaveProperty('target');
    expect(obsidianExportRequest.target).toBe('obsidian');
    expect(obsidianExportRequest.vaultPath).toBe('/vault');
    expect(obsidianExportRequest.outputPath).toBe('posts/fiber.md');
    expect(invalidObsidianExportRequest).toBeDefined();
  });
});

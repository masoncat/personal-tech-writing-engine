import { cp, mkdtemp, readFile, rm } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

import {
  TaskStage,
  type BedrockResponse,
  type ExportResponse,
  type MaterialListResponse,
  type OutlineResponse,
  type TaskEnvelope,
  type VersionsResponse,
} from '@ptce/shared';
import { afterEach, describe, expect, it } from 'vitest';

import { buildApp } from '../src/app.js';

const tempDirs: string[] = [];
const testDir = dirname(fileURLToPath(import.meta.url));

const createTempDir = async (prefix: string) => {
  const dir = await mkdtemp(join(tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
};

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('workflow routes', () => {
  it('imports obsidian materials and runs the full workflow through export write-back', async () => {
    const dataDir = await createTempDir('ptce-mock-server-');
    const vaultDir = await createTempDir('ptce-vault-');
    const exportVaultDir = await createTempDir('ptce-export-vault-');
    const fixtureVaultDir = resolve(testDir, '../../../fixtures/obsidian-vault');

    await cp(fixtureVaultDir, vaultDir, { recursive: true });

    const app = buildApp({ dataDir });

    try {
      const createTaskResponse = await app.inject({
        method: 'POST',
        url: '/tasks',
        payload: {
          title: 'Fiber Architecture',
          articleType: 'deep-dive',
          reader: 'frontend platform engineers',
        },
      });

      expect(createTaskResponse.statusCode).toBe(201);
      const task = createTaskResponse.json<TaskEnvelope>().task;

      const importResponse = await app.inject({
        method: 'POST',
        url: `/tasks/${task.id}/materials/import-obsidian`,
        payload: {
          vaultPath: vaultDir,
          path: vaultDir,
        },
      });

      expect(importResponse.statusCode).toBe(201);
      const importBody = importResponse.json<MaterialListResponse>();
      expect(importBody.task.stage).toBe(TaskStage.CollectingMaterials);
      expect(importBody.materials).toHaveLength(2);
      expect(importBody.materials.map((material) => material.title)).toEqual([
        'Fiber note',
        'History post',
      ]);
      expect(importBody.materials.map((material) => material.type)).toEqual([
        'note',
        'article',
      ]);
      expect(importBody.materials.every((material) => material.source === 'obsidian')).toBe(true);

      const bedrockGenerateResponse = await app.inject({
        method: 'POST',
        url: `/tasks/${task.id}/bedrock/generate`,
      });

      expect(bedrockGenerateResponse.statusCode).toBe(201);
      const generatedBedrock = bedrockGenerateResponse.json<BedrockResponse>();
      expect(generatedBedrock.task.stage).toBe(TaskStage.BedrockReview);
      expect(generatedBedrock.bedrock.confirmed).toBe(false);
      expect(generatedBedrock.bedrock.theme).toContain('Fiber Architecture');

      const bedrockConfirmResponse = await app.inject({
        method: 'POST',
        url: `/tasks/${task.id}/bedrock/${generatedBedrock.bedrock.id}/confirm`,
      });

      expect(bedrockConfirmResponse.statusCode).toBe(200);
      const confirmedBedrock = bedrockConfirmResponse.json<BedrockResponse>();
      expect(confirmedBedrock.bedrock.confirmed).toBe(true);
      expect(confirmedBedrock.task.stage).toBe(TaskStage.OutlineReview);

      const latestBedrockResponse = await app.inject({
        method: 'GET',
        url: `/tasks/${task.id}/bedrock/latest`,
      });

      expect(latestBedrockResponse.statusCode).toBe(200);
      expect(latestBedrockResponse.json<BedrockResponse>()).toEqual(confirmedBedrock);

      const outlineGenerateResponse = await app.inject({
        method: 'POST',
        url: `/tasks/${task.id}/outlines/generate`,
      });

      expect(outlineGenerateResponse.statusCode).toBe(201);
      const generatedOutline = outlineGenerateResponse.json<OutlineResponse>();
      expect(generatedOutline.task.stage).toBe(TaskStage.OutlineReview);
      expect(generatedOutline.outline.confirmed).toBe(false);
      expect(generatedOutline.outline.sections).toHaveLength(3);

      const outlineConfirmResponse = await app.inject({
        method: 'POST',
        url: `/tasks/${task.id}/outlines/${generatedOutline.outline.id}/confirm`,
      });

      expect(outlineConfirmResponse.statusCode).toBe(200);
      const confirmedOutline = outlineConfirmResponse.json<OutlineResponse>();
      expect(confirmedOutline.outline.confirmed).toBe(true);
      expect(confirmedOutline.task.stage).toBe(TaskStage.DraftReady);

      const latestOutlineResponse = await app.inject({
        method: 'GET',
        url: `/tasks/${task.id}/outlines/latest`,
      });

      expect(latestOutlineResponse.statusCode).toBe(200);
      expect(latestOutlineResponse.json<OutlineResponse>()).toEqual(confirmedOutline);

      const draftGenerateResponse = await app.inject({
        method: 'POST',
        url: `/tasks/${task.id}/drafts/generate`,
      });

      expect(draftGenerateResponse.statusCode).toBe(201);
      const draftVersion = draftGenerateResponse.json();
      expect(draftVersion.task.stage).toBe(TaskStage.DraftReady);
      expect(draftVersion.version.versionType).toBe('draft');
      expect(draftVersion.version.content).toContain('# Fiber Architecture');
      expect(draftVersion.version.styleProfileId).toMatch(/^style-profile-/);

      const versionsResponse = await app.inject({
        method: 'GET',
        url: `/tasks/${task.id}/versions`,
      });

      expect(versionsResponse.statusCode).toBe(200);
      const versionsBody = versionsResponse.json<VersionsResponse>();
      expect(versionsBody.versions).toHaveLength(1);
      expect(versionsBody.versions[0].id).toBe(draftVersion.version.id);

      const rewriteResponse = await app.inject({
        method: 'POST',
        url: `/tasks/${task.id}/rewrites`,
        payload: {
          versionId: draftVersion.version.id,
          instruction: 'Make it more historical and add a concise closing takeaway.',
        },
      });

      expect(rewriteResponse.statusCode).toBe(201);
      const rewriteBody = rewriteResponse.json();
      expect(rewriteBody.task.stage).toBe(TaskStage.Rewriting);
      expect(rewriteBody.version.versionType).toBe('rewrite');
      expect(rewriteBody.version.content).toContain('Revision instruction');
      expect(rewriteBody.version.styleProfileId).toBe(draftVersion.version.styleProfileId);

      const versionsAfterRewriteResponse = await app.inject({
        method: 'GET',
        url: `/tasks/${task.id}/versions`,
      });

      expect(versionsAfterRewriteResponse.statusCode).toBe(200);
      expect(versionsAfterRewriteResponse.json<VersionsResponse>().versions).toHaveLength(2);

      const exportResponse = await app.inject({
        method: 'POST',
        url: `/tasks/${task.id}/exports`,
        payload: {
          versionId: rewriteBody.version.id,
          channel: 'blog',
          format: 'markdown',
          target: 'obsidian',
          vaultPath: exportVaultDir,
          outputPath: 'exports/fiber-architecture.md',
        },
      });

      expect(exportResponse.statusCode).toBe(201);
      const exportBody = exportResponse.json<ExportResponse>();
      expect(exportBody.task.stage).toBe(TaskStage.Exported);
      expect(exportBody.exportRecord.outputPath).toBe(
        join(exportVaultDir, 'exports/fiber-architecture.md'),
      );
      expect(exportBody.exportRecord.relativePath).toBe('exports/fiber-architecture.md');

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

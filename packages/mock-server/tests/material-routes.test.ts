import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  ErrorCode,
  TaskStage,
  type MaterialListResponse,
  type TaskEnvelope,
} from '@ptce/shared';
import { afterEach, describe, expect, it } from 'vitest';

import { buildApp } from '../src/app.js';

const tempDirs: string[] = [];

const createTempDataDir = async () => {
  const dataDir = await mkdtemp(join(tmpdir(), 'ptce-mock-server-'));
  tempDirs.push(dataDir);
  return dataDir;
};

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('material routes', () => {
  it('adds a material and moves the task into collecting_materials on first add', async () => {
    const app = buildApp({ dataDir: await createTempDataDir() });

    try {
      const createTaskResponse = await app.inject({
        method: 'POST',
        url: '/tasks',
        payload: {
          title: 'Fastify error handling',
          articleType: 'implementation-notes',
          reader: 'backend engineers',
        },
      });

      const createdTask = createTaskResponse.json<TaskEnvelope>().task;
      expect(createdTask.stage).toBe(TaskStage.Created);

      const addMaterialResponse = await app.inject({
        method: 'POST',
        url: `/tasks/${createdTask.id}/materials`,
        payload: {
          type: 'note',
          title: 'Validation notes',
          source: 'inline',
          content: 'Use zod for input parsing at the route boundary.',
          tags: ['fastify', 'validation'],
        },
      });

      expect(addMaterialResponse.statusCode).toBe(201);

      const addMaterialBody = addMaterialResponse.json<MaterialListResponse>();
      expect(addMaterialBody.task.id).toBe(createdTask.id);
      expect(addMaterialBody.task.stage).toBe(TaskStage.CollectingMaterials);
      expect(addMaterialBody.task.updatedAt).not.toBe(createdTask.updatedAt);
      expect(addMaterialBody.materials).toHaveLength(1);
      expect(addMaterialBody.materials[0]).toMatchObject({
        taskId: createdTask.id,
        type: 'note',
        title: 'Validation notes',
        source: 'inline',
        content: 'Use zod for input parsing at the route boundary.',
        tags: ['fastify', 'validation'],
      });
      expect(addMaterialBody.materials[0].id).toMatch(/^material-/);

      const listMaterialsResponse = await app.inject({
        method: 'GET',
        url: `/tasks/${createdTask.id}/materials`,
      });

      expect(listMaterialsResponse.statusCode).toBe(200);
      expect(listMaterialsResponse.json<MaterialListResponse>()).toEqual(addMaterialBody);
    } finally {
      await app.close();
    }
  });

  it('returns task not found when adding material to an unknown task', async () => {
    const app = buildApp({ dataDir: await createTempDataDir() });

    try {
      const response = await app.inject({
        method: 'POST',
        url: '/tasks/task-missing/materials',
        payload: {
          type: 'note',
          title: 'Missing task note',
          source: 'inline',
          content: 'This should fail.',
        },
      });

      expect(response.statusCode).toBe(404);
      expect(response.json()).toEqual({
        code: ErrorCode.TaskNotFound,
        message: 'Task not found',
        details: {
          taskId: 'task-missing',
        },
      });
    } finally {
      await app.close();
    }
  });
});

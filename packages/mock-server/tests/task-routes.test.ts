import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { ErrorCode, TaskStage, type TaskEnvelope } from '@ptce/shared';
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

describe('task routes', () => {
  it('creates a task and fetches it by id', async () => {
    const app = buildApp({ dataDir: await createTempDataDir() });

    try {
      const createResponse = await app.inject({
        method: 'POST',
        url: '/tasks',
        payload: {
          title: 'React Server Components',
          articleType: 'deep-dive',
          reader: 'frontend platform engineers',
        },
      });

      expect(createResponse.statusCode).toBe(201);

      const createdBody = createResponse.json<TaskEnvelope>();
      expect(createdBody.task.title).toBe('React Server Components');
      expect(createdBody.task.articleType).toBe('deep-dive');
      expect(createdBody.task.reader).toBe('frontend platform engineers');
      expect(createdBody.task.stage).toBe(TaskStage.Created);
      expect(createdBody.task.id).toMatch(/^task-/);
      expect(createdBody.task.createdAt).toBe(createdBody.task.updatedAt);

      const getResponse = await app.inject({
        method: 'GET',
        url: `/tasks/${createdBody.task.id}`,
      });

      expect(getResponse.statusCode).toBe(200);
      expect(getResponse.json<TaskEnvelope>()).toEqual(createdBody);
    } finally {
      await app.close();
    }
  });

  it('returns a structured task not found error', async () => {
    const app = buildApp({ dataDir: await createTempDataDir() });

    try {
      const response = await app.inject({
        method: 'GET',
        url: '/tasks/task-missing',
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

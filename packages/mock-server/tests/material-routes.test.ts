import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  ErrorCode,
  TaskStage,
  type MaterialListResponse,
  type Material,
  type TaskEnvelope,
  type WritingTask,
} from '@ptce/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { buildApp } from '../src/app.js';
import type { MaterialRepository } from '../src/repository/material-repository.js';
import type { TaskRepository } from '../src/repository/task-repository.js';
import { MaterialService } from '../src/services/material-service.js';

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

  it('rejects impossible inline source path combinations', async () => {
    const app = buildApp({ dataDir: await createTempDataDir() });

    try {
      const createTaskResponse = await app.inject({
        method: 'POST',
        url: '/tasks',
        payload: {
          title: 'Invalid material payload',
          articleType: 'implementation-notes',
          reader: 'backend engineers',
        },
      });
      const createdTask = createTaskResponse.json<TaskEnvelope>().task;

      const response = await app.inject({
        method: 'POST',
        url: `/tasks/${createdTask.id}/materials`,
        payload: {
          type: 'note',
          title: 'Inline material with path metadata',
          source: 'inline',
          content: 'This should be rejected.',
          relativePath: 'notes/invalid.md',
        },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({
        code: ErrorCode.InvalidArgument,
        message: 'Invalid request',
      });

      const listResponse = await app.inject({
        method: 'GET',
        url: `/tasks/${createdTask.id}/materials`,
      });

      expect(listResponse.statusCode).toBe(200);
      expect(listResponse.json<MaterialListResponse>()).toEqual({
        task: createdTask,
        materials: [],
      });
    } finally {
      await app.close();
    }
  });
});

describe('material service consistency', () => {
  it('rolls back a newly added material if task save fails during stage transition', async () => {
    const task = createTaskFixture();
    const materials: Material[] = [];

    const taskRepository = {
      get: vi.fn().mockResolvedValue(task),
      save: vi.fn().mockRejectedValue(new Error('task save failed')),
    } as unknown as TaskRepository;

    const materialRepository = {
      add: vi.fn(async (input) => {
        const material = createMaterialFixture(input);
        materials.push(material);
        return material;
      }),
      remove: vi.fn(async (materialId: string) => {
        const index = materials.findIndex((material) => material.id === materialId);

        if (index !== -1) {
          materials.splice(index, 1);
        }
      }),
      listByTask: vi.fn(async (taskId: string) =>
        materials.filter((material) => material.taskId === taskId),
      ),
    } as unknown as MaterialRepository;

    const service = new MaterialService(taskRepository, materialRepository);

    await expect(
      service.addMaterial(task.id, {
        type: 'note',
        title: 'Rollback me',
        source: 'inline',
        content: 'Rollback me',
      }),
    ).rejects.toThrow('task save failed');

    expect(materials).toEqual([]);
    expect(materialRepository.remove).toHaveBeenCalledWith('material-test');
  });

  it('serializes concurrent addMaterial mutations in-process', async () => {
    const task = createTaskFixture();
    const materials: Material[] = [];
    let currentTask = task;
    let releaseFirstAdd!: () => void;
    const firstAddGate = new Promise<void>((resolve) => {
      releaseFirstAdd = resolve;
    });

    const taskRepository = {
      get: vi.fn(async () => currentTask),
      save: vi.fn(async (nextTask: WritingTask) => {
        currentTask = nextTask;
        return nextTask;
      }),
    } as unknown as TaskRepository;

    const materialRepository = {
      add: vi.fn(async (input) => {
        const isFirstAdd = materials.length === 0;

        if (isFirstAdd) {
          await firstAddGate;
        }

        const material = createMaterialFixture(input, {
          id: `material-${materials.length + 1}`,
        });
        materials.push(material);
        return material;
      }),
      remove: vi.fn(async (materialId: string) => {
        const index = materials.findIndex((material) => material.id === materialId);

        if (index !== -1) {
          materials.splice(index, 1);
        }
      }),
      listByTask: vi.fn(async (taskId: string) =>
        materials.filter((material) => material.taskId === taskId),
      ),
    } as unknown as MaterialRepository;

    const service = new MaterialService(taskRepository, materialRepository);

    const firstAdd = service.addMaterial(task.id, {
      type: 'note',
      title: 'First add',
      source: 'inline',
      content: 'First add',
    });
    const secondAdd = service.addMaterial(task.id, {
      type: 'note',
      title: 'Second add',
      source: 'inline',
      content: 'Second add',
    });

    await flushMicrotasks();

    expect(materialRepository.add).toHaveBeenCalledTimes(1);

    releaseFirstAdd();

    await Promise.all([firstAdd, secondAdd]);

    expect(materialRepository.add).toHaveBeenCalledTimes(2);
    expect(materials).toHaveLength(2);
    expect(taskRepository.save).toHaveBeenCalledTimes(1);
  });

  it('waits for an in-flight addMaterial mutation before listing materials', async () => {
    const task = createTaskFixture();
    const materials: Material[] = [];
    let currentTask = task;
    let releaseTaskSave!: () => void;
    const taskSaveGate = new Promise<void>((resolve) => {
      releaseTaskSave = resolve;
    });

    const taskRepository = {
      get: vi.fn(async () => currentTask),
      save: vi.fn(async (nextTask: WritingTask) => {
        await taskSaveGate;
        currentTask = nextTask;
        return nextTask;
      }),
    } as unknown as TaskRepository;

    const materialRepository = {
      add: vi.fn(async (input) => {
        const material = createMaterialFixture(input);
        materials.push(material);
        return material;
      }),
      remove: vi.fn(async (materialId: string) => {
        const index = materials.findIndex((material) => material.id === materialId);

        if (index !== -1) {
          materials.splice(index, 1);
        }
      }),
      listByTask: vi.fn(async (taskId: string) =>
        materials.filter((material) => material.taskId === taskId),
      ),
    } as unknown as MaterialRepository;

    const service = new MaterialService(taskRepository, materialRepository);

    const addMaterialPromise = service.addMaterial(task.id, {
      type: 'note',
      title: 'Queued add',
      source: 'inline',
      content: 'Queued add',
    });

    await flushMicrotasks();

    let listResolved = false;
    const listPromise = service.listMaterials(task.id).then((result) => {
      listResolved = true;
      return result;
    });

    await flushMicrotasks();

    expect(listResolved).toBe(false);

    releaseTaskSave();

    const [, listResult] = await Promise.all([addMaterialPromise, listPromise]);

    expect(listResolved).toBe(true);
    expect(listResult.task.stage).toBe(TaskStage.CollectingMaterials);
    expect(listResult.materials).toHaveLength(1);
  });
});

const createTaskFixture = (): WritingTask => ({
  id: 'task-test',
  title: 'Task test',
  articleType: 'implementation-notes',
  reader: 'backend engineers',
  stage: TaskStage.Created,
  createdAt: '2026-04-26T00:00:00.000Z',
  updatedAt: '2026-04-26T00:00:00.000Z',
});

const createMaterialFixture = (
  input: {
    taskId: string;
    type: Material['type'];
    title: string;
    source: Material['source'];
    content: string;
    vaultPath?: string;
    relativePath?: string;
    frontmatter?: Record<string, unknown>;
    tags?: string[];
  },
  overrides: Partial<Material> = {},
): Material => ({
  id: 'material-test',
  createdAt: '2026-04-26T00:00:00.000Z',
  taskId: input.taskId,
  type: input.type,
  title: input.title,
  source: input.source,
  content: input.content,
  vaultPath: input.vaultPath,
  relativePath: input.relativePath,
  frontmatter: input.frontmatter,
  tags: input.tags,
  ...overrides,
});

const flushMicrotasks = async (count = 5) => {
  for (let index = 0; index < count; index += 1) {
    await Promise.resolve();
  }
};

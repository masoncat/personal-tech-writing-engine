import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { TaskStage, type WritingTask } from '@ptce/shared';
import { afterEach, describe, expect, it } from 'vitest';

import { FileStore } from '../../src/repository/file-store.js';
import { TaskRepository } from '../../src/repository/task-repository.js';

const tempDirs: string[] = [];

const createTempDataDir = async () => {
  const dataDir = await mkdtemp(join(tmpdir(), 'ptce-task-repo-'));
  tempDirs.push(dataDir);
  return dataDir;
};

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('TaskRepository normalization', () => {
  it('normalizes legacy records without preferredChannel on read and save', async () => {
    const dataDir = await createTempDataDir();
    const filePath = join(dataDir, 'tasks.json');
    const legacyTask = {
      id: 'task-legacy',
      title: 'Legacy task',
      articleType: 'deep-dive',
      reader: 'frontend engineers',
      stage: TaskStage.Created,
      createdAt: '2026-04-26T00:00:00.000Z',
      updatedAt: '2026-04-26T00:00:00.000Z',
    } satisfies Omit<WritingTask, 'preferredChannel'>;

    await writeFile(filePath, JSON.stringify([legacyTask], null, 2));

    const repository = new TaskRepository(
      new FileStore<WritingTask>({
        dataDir,
        fileName: 'tasks.json',
      }),
    );

    const task = await repository.get('task-legacy');

    expect(task).toMatchObject({
      id: 'task-legacy',
      preferredChannel: 'blog',
    });

    expect(task).toBeDefined();
    await repository.save(task as WritingTask);

    const persistedTasks = JSON.parse(await readFile(filePath, 'utf8')) as WritingTask[];
    expect(persistedTasks[0]).toMatchObject({
      id: 'task-legacy',
      preferredChannel: 'blog',
    });
  });
});

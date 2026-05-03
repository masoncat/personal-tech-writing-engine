import { randomUUID } from 'node:crypto';

import {
  createContentTaskModel,
  type ContentTask,
  type CreateContentTaskRequest,
} from '@ptce/shared';

import type { FileStore } from './file-store.js';

export class ContentTaskRepository {
  constructor(private readonly store: FileStore<ContentTask>) {}

  async create(input: CreateContentTaskRequest): Promise<ContentTask> {
    const tasks = await this.store.readAll();
    const now = new Date().toISOString();
    const task = createContentTaskModel({
      id: `content-task-${randomUUID()}`,
      now,
      title: input.title,
      contentType: input.contentType,
      contentSubtype: input.contentSubtype,
      audience: input.audience,
      purpose: input.purpose,
      preferredChannel: input.preferredChannel,
    });

    tasks.push(task);
    await this.store.writeAll(tasks);

    return task;
  }

  async get(taskId: string): Promise<ContentTask | undefined> {
    const tasks = await this.store.readAll();
    return tasks.find((task) => task.id === taskId);
  }

  async save(task: ContentTask): Promise<ContentTask> {
    const tasks = await this.store.readAll();
    const index = tasks.findIndex((currentTask) => currentTask.id === task.id);

    if (index === -1) {
      tasks.push(task);
    } else {
      tasks[index] = task;
    }

    await this.store.writeAll(tasks);
    return task;
  }
}

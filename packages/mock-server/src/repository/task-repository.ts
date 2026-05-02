import { randomUUID } from 'node:crypto';

import type { CreateTaskRequest, WritingTask } from '@ptce/shared';
import { TaskStage } from '@ptce/shared';

import type { FileStore } from './file-store.js';

export class TaskRepository {
  constructor(private readonly store: FileStore<WritingTask>) {}

  async create(input: CreateTaskRequest): Promise<WritingTask> {
    const tasks = await this.store.readAll();
    const now = new Date().toISOString();
    const task: WritingTask = {
      id: `task-${randomUUID()}`,
      title: input.title,
      articleType: input.articleType,
      preferredChannel: input.preferredChannel ?? 'blog',
      reader: input.reader,
      stage: TaskStage.Created,
      createdAt: now,
      updatedAt: now,
    };

    tasks.push(task);
    await this.store.writeAll(tasks);

    return task;
  }

  async get(taskId: string): Promise<WritingTask | undefined> {
    const tasks = await this.store.readAll();
    const task = tasks.find((currentTask) => currentTask.id === taskId);
    return task ? normalizeTask(task) : undefined;
  }

  async save(task: WritingTask): Promise<WritingTask> {
    const tasks = await this.store.readAll();
    const index = tasks.findIndex((currentTask) => currentTask.id === task.id);
    const normalizedTask = normalizeTask(task);

    if (index === -1) {
      tasks.push(normalizedTask);
    } else {
      tasks[index] = normalizedTask;
    }

    await this.store.writeAll(tasks);
    return normalizedTask;
  }
}

const normalizeTask = (task: WritingTask): WritingTask => ({
  ...task,
  preferredChannel: task.preferredChannel ?? 'blog',
});

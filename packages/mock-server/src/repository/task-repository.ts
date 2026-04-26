import { randomUUID } from 'node:crypto';

import type { CreateTaskRequest, WritingTask } from '../../../shared/src/index.js';
import { TaskStage } from '../../../shared/src/index.js';

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
    return tasks.find((task) => task.id === taskId);
  }

  async save(task: WritingTask): Promise<WritingTask> {
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

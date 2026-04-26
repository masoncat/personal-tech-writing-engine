import type { CreateTaskRequest, WritingTask } from '@ptce/shared';

import type { TaskRepository } from '../repository/task-repository.js';
import { ensureTaskExists } from '../workflow/stage-guards.js';

export class TaskService {
  constructor(private readonly taskRepository: TaskRepository) {}

  async createTask(input: CreateTaskRequest): Promise<WritingTask> {
    return this.taskRepository.create(input);
  }

  async getTask(taskId: string): Promise<WritingTask> {
    const task = await this.taskRepository.get(taskId);
    return ensureTaskExists(task, taskId);
  }
}

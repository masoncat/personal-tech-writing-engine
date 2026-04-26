import type { AddMaterialRequest, Material, WritingTask } from '@ptce/shared';
import { TaskStage } from '@ptce/shared';

import type { MaterialRepository } from '../repository/material-repository.js';
import type { TaskRepository } from '../repository/task-repository.js';
import { ensureTaskExists, touchStage } from '../workflow/stage-guards.js';

export interface MaterialListResult {
  task: WritingTask;
  materials: Material[];
}

export class MaterialService {
  private mutationQueue = Promise.resolve();

  constructor(
    private readonly taskRepository: TaskRepository,
    private readonly materialRepository: MaterialRepository,
  ) {}

  async addMaterial(taskId: string, input: AddMaterialRequest): Promise<MaterialListResult> {
    return this.runSerialized(async () => {
      const task = ensureTaskExists(await this.taskRepository.get(taskId), taskId);
      const material = await this.materialRepository.add({
        taskId,
        ...input,
      });

      try {
        const nextTask =
          task.stage === TaskStage.Created
            ? await this.taskRepository.save(touchStage(task, TaskStage.CollectingMaterials))
            : task;

        return {
          task: nextTask,
          materials: await this.materialRepository.listByTask(taskId),
        };
      } catch (error) {
        await this.materialRepository.remove(material.id);
        throw error;
      }
    });
  }

  async listMaterials(taskId: string): Promise<MaterialListResult> {
    const task = ensureTaskExists(await this.taskRepository.get(taskId), taskId);

    return {
      task,
      materials: await this.materialRepository.listByTask(taskId),
    };
  }

  private runSerialized<T>(operation: () => Promise<T>): Promise<T> {
    const nextOperation = this.mutationQueue.then(operation, operation);
    this.mutationQueue = nextOperation.then(
      () => undefined,
      () => undefined,
    );

    return nextOperation;
  }
}

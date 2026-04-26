import type { AddMaterialRequest, Material, WritingTask } from '../../../shared/src/index.js';
import { TaskStage } from '../../../shared/src/index.js';

import type { MaterialRepository } from '../repository/material-repository.js';
import type { TaskRepository } from '../repository/task-repository.js';
import { ensureTaskExists, touchStage } from '../workflow/stage-guards.js';

export interface MaterialListResult {
  task: WritingTask;
  materials: Material[];
}

export class MaterialService {
  constructor(
    private readonly taskRepository: TaskRepository,
    private readonly materialRepository: MaterialRepository,
  ) {}

  async addMaterial(taskId: string, input: AddMaterialRequest): Promise<MaterialListResult> {
    const task = ensureTaskExists(await this.taskRepository.get(taskId), taskId);

    await this.materialRepository.add({
      taskId,
      ...input,
    });

    const nextTask =
      task.stage === TaskStage.Created
        ? await this.taskRepository.save(touchStage(task, TaskStage.CollectingMaterials))
        : task;

    return {
      task: nextTask,
      materials: await this.materialRepository.listByTask(taskId),
    };
  }

  async listMaterials(taskId: string): Promise<MaterialListResult> {
    const task = ensureTaskExists(await this.taskRepository.get(taskId), taskId);

    return {
      task,
      materials: await this.materialRepository.listByTask(taskId),
    };
  }
}

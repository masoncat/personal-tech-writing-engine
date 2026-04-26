import type { InformationBedrock, Material, WritingTask } from '@ptce/shared';
import { ErrorCode, TaskStage } from '@ptce/shared';

import { generateBedrock } from '../generators/bedrock-generator.js';
import type { BedrockRepository } from '../repository/bedrock-repository.js';
import type { MaterialRepository } from '../repository/material-repository.js';
import type { TaskRepository } from '../repository/task-repository.js';
import { AppError, ensureTaskExists, touchStage } from '../workflow/stage-guards.js';

export interface BedrockResult {
  task: WritingTask;
  bedrock: InformationBedrock;
}

export class BedrockService {
  constructor(
    private readonly taskRepository: TaskRepository,
    private readonly materialRepository: MaterialRepository,
    private readonly bedrockRepository: BedrockRepository,
  ) {}

  async generate(taskId: string): Promise<BedrockResult> {
    const task = ensureTaskExists(await this.taskRepository.get(taskId), taskId);
    const materials = await this.materialRepository.listByTask(taskId);

    if (materials.length === 0) {
      throw new AppError(
        ErrorCode.InvalidArgument,
        'Cannot generate bedrock without materials',
        { taskId },
        400,
      );
    }

    const draft = generateBedrock(task, materials);
    const bedrock = await this.bedrockRepository.create({
      taskId,
      ...draft,
    });
    const nextTask = await this.taskRepository.save(touchStage(task, TaskStage.BedrockReview));

    return {
      task: nextTask,
      bedrock,
    };
  }

  async confirm(taskId: string, bedrockId: string): Promise<BedrockResult> {
    const task = ensureTaskExists(await this.taskRepository.get(taskId), taskId);
    const bedrock = await this.requireBedrock(taskId, bedrockId);
    const confirmedBedrock = await this.bedrockRepository.save({
      ...bedrock,
      confirmed: true,
    });
    const nextTask = await this.taskRepository.save(touchStage(task, TaskStage.OutlineReview));

    return {
      task: nextTask,
      bedrock: confirmedBedrock,
    };
  }

  async getLatest(taskId: string): Promise<BedrockResult> {
    const task = ensureTaskExists(await this.taskRepository.get(taskId), taskId);
    const bedrock = await this.bedrockRepository.getLatestByTask(taskId);

    if (!bedrock) {
      throw new AppError(ErrorCode.InvalidArgument, 'Bedrock not found', { taskId }, 404);
    }

    return {
      task,
      bedrock,
    };
  }

  async getLatestConfirmed(taskId: string): Promise<InformationBedrock> {
    const bedrock = await this.bedrockRepository.getLatestByTask(taskId);

    if (!bedrock?.confirmed) {
      throw new AppError(
        ErrorCode.BedrockNotConfirmed,
        'Confirmed bedrock required',
        { taskId },
        400,
      );
    }

    return bedrock;
  }

  private async requireBedrock(taskId: string, bedrockId: string): Promise<InformationBedrock> {
    const bedrock = await this.bedrockRepository.get(bedrockId);

    if (!bedrock || bedrock.taskId !== taskId) {
      throw new AppError(ErrorCode.InvalidArgument, 'Bedrock not found', { taskId, bedrockId }, 404);
    }

    return bedrock;
  }
}

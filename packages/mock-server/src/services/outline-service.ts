import type { ArticleOutline, WritingTask } from '@ptce/shared';
import { ErrorCode, TaskStage } from '@ptce/shared';

import { generateOutline } from '../generators/outline-generator.js';
import type { OutlineRepository } from '../repository/outline-repository.js';
import type { TaskRepository } from '../repository/task-repository.js';
import { AppError, ensureTaskExists, touchStage } from '../workflow/stage-guards.js';
import type { BedrockService } from './bedrock-service.js';

export interface OutlineResult {
  task: WritingTask;
  outline: ArticleOutline;
}

export class OutlineService {
  constructor(
    private readonly taskRepository: TaskRepository,
    private readonly outlineRepository: OutlineRepository,
    private readonly bedrockService: BedrockService,
  ) {}

  async generate(taskId: string): Promise<OutlineResult> {
    const task = ensureTaskExists(await this.taskRepository.get(taskId), taskId);
    const bedrock = await this.bedrockService.getLatestConfirmed(taskId);
    const draft = generateOutline(task, bedrock);
    const outline = await this.outlineRepository.create({
      taskId,
      ...draft,
    });
    const nextTask = await this.taskRepository.save(touchStage(task, TaskStage.OutlineReview));

    return {
      task: nextTask,
      outline,
    };
  }

  async confirm(taskId: string, outlineId: string): Promise<OutlineResult> {
    const task = ensureTaskExists(await this.taskRepository.get(taskId), taskId);
    const outline = await this.requireOutline(taskId, outlineId);
    const confirmedOutline = await this.outlineRepository.save({
      ...outline,
      confirmed: true,
    });
    const nextTask = await this.taskRepository.save(touchStage(task, TaskStage.DraftReady));

    return {
      task: nextTask,
      outline: confirmedOutline,
    };
  }

  async getLatest(taskId: string): Promise<OutlineResult> {
    const task = ensureTaskExists(await this.taskRepository.get(taskId), taskId);
    const outline = await this.outlineRepository.getLatestByTask(taskId);

    if (!outline) {
      throw new AppError(ErrorCode.InvalidArgument, 'Outline not found', { taskId }, 404);
    }

    return {
      task,
      outline,
    };
  }

  async getLatestConfirmed(taskId: string): Promise<ArticleOutline> {
    const outline = await this.outlineRepository.getLatestByTask(taskId);

    if (!outline?.confirmed) {
      throw new AppError(
        ErrorCode.OutlineNotConfirmed,
        'Confirmed outline required',
        { taskId },
        400,
      );
    }

    return outline;
  }

  private async requireOutline(taskId: string, outlineId: string): Promise<ArticleOutline> {
    const outline = await this.outlineRepository.get(outlineId);

    if (!outline || outline.taskId !== taskId) {
      throw new AppError(ErrorCode.InvalidArgument, 'Outline not found', { taskId, outlineId }, 404);
    }

    return outline;
  }
}

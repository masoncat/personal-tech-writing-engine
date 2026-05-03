import { randomUUID } from 'node:crypto';

import {
  buildOutputPackageDraft,
  markOutputArtifactAvailable,
  ErrorCode,
  getQualityRubric,
  getWorkflowProfile,
  getWritingSkillBinding,
  type AddContentArtifactRequest,
  type ContentArtifactsResponse,
  type ContentRunResponse,
  type ContentTask,
  type ContentTaskEnvelope,
  type CreateContentTaskRequest,
} from '@ptce/shared';

import type { ContentTaskRepository } from '../repository/content-task-repository.js';
import type { ContentArtifactRepository } from '../repository/content-artifact-repository.js';
import type { OutputPackageRepository } from '../repository/output-package-repository.js';
import { AppError } from '../workflow/stage-guards.js';

export class ContentTaskService {
  constructor(
    private readonly contentTaskRepository: ContentTaskRepository,
    private readonly contentArtifactRepository: ContentArtifactRepository,
    private readonly outputPackageRepository: OutputPackageRepository,
  ) {}

  async create(input: CreateContentTaskRequest): Promise<ContentTaskEnvelope> {
    const task = await this.contentTaskRepository.create(input);
    const now = task.createdAt;
    const outputPackage = await this.outputPackageRepository.save(
      buildOutputPackageDraft({
        id: `output-package-${randomUUID()}`,
        task,
        now,
      }),
    );

    return this.buildEnvelope(task, outputPackage);
  }

  async get(taskId: string): Promise<ContentTaskEnvelope> {
    const task = await this.getTask(taskId);
    const outputPackage = await this.getOutputPackage(task);
    return this.buildEnvelope(task, outputPackage);
  }

  async run(taskId: string): Promise<ContentRunResponse> {
    const task = await this.getTask(taskId);

    if (task.contentType !== 'public_article') {
      throw new AppError(
        ErrorCode.UnsupportedContentRunner,
        'This content type has no executable runner in the MVP.',
        { contentType: task.contentType },
        400,
      );
    }

    const now = new Date().toISOString();
    const outputPackage = await this.getOutputPackage(task);
    const executedActionIds = outputPackage.artifacts.map((artifact) => artifact.artifactType);
    const savedOutputPackage = await this.outputPackageRepository.save({
      ...outputPackage,
      artifacts: outputPackage.artifacts.map((artifact) => ({
        ...artifact,
        artifactId: `${task.id}-${artifact.artifactType}`,
        status: 'available',
      })),
      readiness: 'review_ready',
      updatedAt: now,
    });
    const savedTask = await this.contentTaskRepository.save({
      ...task,
      status: 'completed',
      currentActionId: 'finish',
      updatedAt: now,
    });

    return {
      ...this.buildEnvelope(savedTask, savedOutputPackage),
      executedActionIds,
    };
  }

  async addArtifact(taskId: string, input: AddContentArtifactRequest): Promise<ContentArtifactsResponse> {
    const task = await this.getTask(taskId);
    const artifact = await this.contentArtifactRepository.create(task.id, input);
    const outputPackage = await this.getOutputPackage(task);
    const savedOutputPackage = await this.outputPackageRepository.save(
      markOutputArtifactAvailable({
        outputPackage,
        artifact,
        now: artifact.createdAt,
      }),
    );
    const artifacts = await this.contentArtifactRepository.listByTaskId(task.id);

    return {
      ...this.buildEnvelope(task, savedOutputPackage),
      artifacts,
    };
  }

  async listArtifacts(taskId: string): Promise<ContentArtifactsResponse> {
    const task = await this.getTask(taskId);
    const outputPackage = await this.getOutputPackage(task);
    const artifacts = await this.contentArtifactRepository.listByTaskId(task.id);

    return {
      ...this.buildEnvelope(task, outputPackage),
      artifacts,
    };
  }

  async complete(taskId: string): Promise<ContentTaskEnvelope> {
    const task = await this.getTask(taskId);
    const now = new Date().toISOString();
    const outputPackage = await this.getOutputPackage(task);
    const savedTask = await this.contentTaskRepository.save({
      ...task,
      status: 'completed',
      currentActionId: 'finish',
      updatedAt: now,
    });
    const savedOutputPackage = await this.outputPackageRepository.save({
      ...outputPackage,
      readiness: 'review_ready',
      updatedAt: now,
    });

    return this.buildEnvelope(savedTask, savedOutputPackage);
  }

  private async getTask(taskId: string): Promise<ContentTask> {
    const task = await this.contentTaskRepository.get(taskId);

    if (!task) {
      throw new AppError(ErrorCode.TaskNotFound, 'Task not found', { taskId }, 404);
    }

    return task;
  }

  private async getOutputPackage(task: ContentTask) {
    const existing = await this.outputPackageRepository.getByTaskId(task.id);
    if (existing) {
      return existing;
    }

    return this.outputPackageRepository.save(
      buildOutputPackageDraft({
        id: `output-package-${randomUUID()}`,
        task,
        now: task.createdAt,
      }),
    );
  }

  private buildEnvelope(task: ContentTask, outputPackage: Awaited<ReturnType<ContentTaskService['getOutputPackage']>>): ContentTaskEnvelope {
    return {
      task,
      workflowProfile: getWorkflowProfile(task.contentType, task.contentSubtype),
      qualityRubric: getQualityRubric(task.contentType, task.contentSubtype),
      skillBinding: getWritingSkillBinding(task.contentType),
      outputPackage,
    };
  }
}

import type { ArticleVersion, Material, StyleProfile, WritingTask } from '@ptce/shared';
import { ErrorCode } from '@ptce/shared';

import { generateDraftMarkdown } from '../generators/draft-generator.js';
import { generateStyleProfile } from '../generators/style-generator.js';
import type { MaterialRepository } from '../repository/material-repository.js';
import type { StyleProfileRepository } from '../repository/style-profile-repository.js';
import type { TaskRepository } from '../repository/task-repository.js';
import type { VersionRepository } from '../repository/version-repository.js';
import { AppError, ensureTaskExists } from '../workflow/stage-guards.js';
import type { BedrockService } from './bedrock-service.js';
import type { OutlineService } from './outline-service.js';

export interface VersionResult {
  task: WritingTask;
  version: ArticleVersion;
}

export class DraftService {
  constructor(
    private readonly taskRepository: TaskRepository,
    private readonly materialRepository: MaterialRepository,
    private readonly styleProfileRepository: StyleProfileRepository,
    private readonly versionRepository: VersionRepository,
    private readonly bedrockService: BedrockService,
    private readonly outlineService: OutlineService,
  ) {}

  async generate(taskId: string): Promise<VersionResult> {
    const task = ensureTaskExists(await this.taskRepository.get(taskId), taskId);
    const bedrock = await this.bedrockService.getLatestConfirmed(taskId);
    const outline = await this.outlineService.getLatestConfirmed(taskId);
    const materials = await this.materialRepository.listByTask(taskId);
    const styleProfile = await this.getOrCreateStyleProfile(taskId, materials);
    const content = generateDraftMarkdown(task, bedrock, outline);
    const version = await this.versionRepository.create({
      taskId,
      versionType: 'draft',
      content,
      basedOnBedrockId: bedrock.id,
      basedOnOutlineId: outline.id,
      styleProfileId: styleProfile.id,
      changeSummary: 'Initial draft generated from confirmed bedrock and outline.',
    });

    return {
      task,
      version,
    };
  }

  async listVersions(taskId: string): Promise<{ task: WritingTask; versions: ArticleVersion[] }> {
    const task = ensureTaskExists(await this.taskRepository.get(taskId), taskId);

    return {
      task,
      versions: await this.versionRepository.listByTask(taskId),
    };
  }

  async getVersion(taskId: string, versionId: string): Promise<ArticleVersion> {
    ensureTaskExists(await this.taskRepository.get(taskId), taskId);
    const version = await this.versionRepository.get(versionId);

    if (!version || version.taskId !== taskId) {
      throw new AppError(
        ErrorCode.VersionNotFound,
        'Version not found',
        { taskId, versionId },
        404,
      );
    }

    return version;
  }

  async getOrCreateStyleProfile(taskId: string, materials?: Material[]): Promise<StyleProfile> {
    const existingProfile = await this.styleProfileRepository.getLatestByTask(taskId);

    if (existingProfile) {
      return existingProfile;
    }

    const sourceMaterials = materials ?? (await this.materialRepository.listByTask(taskId));
    const draft = generateStyleProfile(sourceMaterials);

    return this.styleProfileRepository.create({
      taskId,
      ...draft,
    });
  }
}

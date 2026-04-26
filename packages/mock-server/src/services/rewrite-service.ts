import type { ArticleVersion, WritingTask } from '@ptce/shared';
import { TaskStage } from '@ptce/shared';

import { rewriteMarkdown } from '../generators/rewrite-generator.js';
import type { MaterialRepository } from '../repository/material-repository.js';
import type { TaskRepository } from '../repository/task-repository.js';
import type { VersionRepository } from '../repository/version-repository.js';
import { ensureTaskExists, touchStage } from '../workflow/stage-guards.js';
import type { DraftService, VersionResult } from './draft-service.js';

export class RewriteService {
  constructor(
    private readonly taskRepository: TaskRepository,
    private readonly materialRepository: MaterialRepository,
    private readonly versionRepository: VersionRepository,
    private readonly draftService: DraftService,
  ) {}

  async rewrite(
    taskId: string,
    input: { versionId: string; instruction: string },
  ): Promise<VersionResult> {
    const task = ensureTaskExists(await this.taskRepository.get(taskId), taskId);
    const version = await this.draftService.getVersion(taskId, input.versionId);

    const styleProfile = await this.draftService.getOrCreateStyleProfile(
      taskId,
      await this.materialRepository.listByTask(taskId),
    );
    const content = rewriteMarkdown(version, styleProfile, input.instruction);
    const rewriteVersion = await this.versionRepository.create({
      taskId,
      versionType: 'rewrite',
      content,
      basedOnBedrockId: version.basedOnBedrockId,
      basedOnOutlineId: version.basedOnOutlineId,
      styleProfileId: styleProfile.id,
      changeSummary: input.instruction,
    });
    const nextTask = await this.taskRepository.save(touchStage(task, TaskStage.Rewriting));

    return {
      task: nextTask,
      version: rewriteVersion,
    };
  }
}

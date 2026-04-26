import { join } from 'node:path';

import type {
  ExportRecord,
  GenerateExportRequest,
  WritingTask,
} from '@ptce/shared';
import { ErrorCode, TaskStage } from '@ptce/shared';

import {
  renderExportMarkdown,
  writeArtifact,
} from '../generators/export-generator.js';
import type { ExportRepository } from '../repository/export-repository.js';
import type { TaskRepository } from '../repository/task-repository.js';
import type { VersionRepository } from '../repository/version-repository.js';
import { AppError, ensureTaskExists, touchStage } from '../workflow/stage-guards.js';

export interface ExportResult {
  task: WritingTask;
  exportRecord: ExportRecord;
}

export class ExportService {
  constructor(
    private readonly taskRepository: TaskRepository,
    private readonly versionRepository: VersionRepository,
    private readonly exportRepository: ExportRepository,
    private readonly defaultLocalDir: string,
  ) {}

  async run(taskId: string, input: GenerateExportRequest): Promise<ExportResult> {
    const task = ensureTaskExists(await this.taskRepository.get(taskId), taskId);
    const version = await this.versionRepository.get(input.versionId);

    if (!version || version.taskId !== taskId) {
      throw new AppError(
        ErrorCode.VersionNotFound,
        'Version not found',
        { taskId, versionId: input.versionId },
        404,
      );
    }

    const content = renderExportMarkdown({
      task,
      version,
      channel: input.channel,
      format: input.format,
    });
    const artifact = await writeArtifact({
      content,
      target: input.target ?? 'local',
      outputPath: input.outputPath,
      vaultPath: 'vaultPath' in input ? input.vaultPath : undefined,
      defaultLocalDir: this.defaultLocalDir,
      fileName: `${task.id}-${version.id}-${input.channel}.md`,
    });
    const exportRecord = await this.exportRepository.create({
      taskId,
      versionId: version.id,
      channel: input.channel,
      format: input.format,
      outputPath: artifact.outputPath,
      vaultPath: artifact.vaultPath,
      relativePath: artifact.relativePath,
    });
    const nextTask = await this.taskRepository.save(touchStage(task, TaskStage.Exported));

    return {
      task: nextTask,
      exportRecord,
    };
  }
}

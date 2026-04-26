import { randomUUID } from 'node:crypto';

import type { ArticleVersion, ArticleVersionType } from '@ptce/shared';

import type { FileStore } from './file-store.js';

export interface CreateVersionInput {
  taskId: string;
  versionType: ArticleVersionType;
  content: string;
  basedOnBedrockId: string;
  basedOnOutlineId: string;
  styleProfileId?: string;
  changeSummary: string;
}

export class VersionRepository {
  constructor(private readonly store: FileStore<ArticleVersion>) {}

  async create(input: CreateVersionInput): Promise<ArticleVersion> {
    const versions = await this.store.readAll();
    const version: ArticleVersion = {
      id: `version-${randomUUID()}`,
      taskId: input.taskId,
      versionType: input.versionType,
      content: input.content,
      basedOnBedrockId: input.basedOnBedrockId,
      basedOnOutlineId: input.basedOnOutlineId,
      styleProfileId: input.styleProfileId,
      changeSummary: input.changeSummary,
    };

    versions.push(version);
    await this.store.writeAll(versions);

    return version;
  }

  async get(versionId: string): Promise<ArticleVersion | undefined> {
    const versions = await this.store.readAll();
    return versions.find((version) => version.id === versionId);
  }

  async listByTask(taskId: string): Promise<ArticleVersion[]> {
    const versions = await this.store.readAll();
    return versions.filter((version) => version.taskId === taskId);
  }
}

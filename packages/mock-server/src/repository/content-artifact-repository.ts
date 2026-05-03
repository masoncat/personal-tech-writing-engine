import { randomUUID } from 'node:crypto';

import {
  createContentArtifactModel,
  type AddContentArtifactRequest,
  type ContentArtifact,
} from '@ptce/shared';

import type { FileStore } from './file-store.js';

export class ContentArtifactRepository {
  constructor(private readonly store: FileStore<ContentArtifact>) {}

  async create(taskId: string, input: AddContentArtifactRequest): Promise<ContentArtifact> {
    const artifacts = await this.store.readAll();
    const artifact = createContentArtifactModel({
      id: `content-artifact-${randomUUID()}`,
      taskId,
      artifactType: input.artifactType,
      title: input.title,
      content: input.content,
      format: input.format,
      createdBy: input.createdBy,
      now: new Date().toISOString(),
    });

    artifacts.push(artifact);
    await this.store.writeAll(artifacts);

    return artifact;
  }

  async listByTaskId(taskId: string): Promise<ContentArtifact[]> {
    const artifacts = await this.store.readAll();
    return artifacts.filter((artifact) => artifact.taskId === taskId);
  }
}

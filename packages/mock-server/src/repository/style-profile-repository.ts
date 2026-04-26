import { randomUUID } from 'node:crypto';

import type { StyleProfile } from '@ptce/shared';

import type { FileStore } from './file-store.js';

export interface CreateStyleProfileInput {
  taskId: string;
  sourceMaterialIds: string[];
  openingTraits: string[];
  rhythmTraits: string[];
  explanationTraits: string[];
  forbiddenPatterns: string[];
  summary: string;
}

export class StyleProfileRepository {
  constructor(private readonly store: FileStore<StyleProfile>) {}

  async create(input: CreateStyleProfileInput): Promise<StyleProfile> {
    const profiles = await this.store.readAll();
    const profile: StyleProfile = {
      id: `style-profile-${randomUUID()}`,
      taskId: input.taskId,
      sourceMaterialIds: input.sourceMaterialIds,
      openingTraits: input.openingTraits,
      rhythmTraits: input.rhythmTraits,
      explanationTraits: input.explanationTraits,
      forbiddenPatterns: input.forbiddenPatterns,
      summary: input.summary,
    };

    profiles.push(profile);
    await this.store.writeAll(profiles);

    return profile;
  }

  async getLatestByTask(taskId: string): Promise<StyleProfile | undefined> {
    const profiles = await this.store.readAll();
    return profiles.filter((profile) => profile.taskId === taskId).at(-1);
  }
}

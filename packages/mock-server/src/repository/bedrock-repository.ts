import { randomUUID } from 'node:crypto';

import type { InformationBedrock } from '@ptce/shared';

import type { FileStore } from './file-store.js';

export interface CreateBedrockInput {
  taskId: string;
  theme: string;
  coreQuestion: string;
  arguments: string[];
  evidence: string[];
  uncertainties: string[];
  confirmed?: boolean;
}

interface StoredBedrock extends InformationBedrock {
  confirmedAt?: string;
}

export class BedrockRepository {
  constructor(private readonly store: FileStore<StoredBedrock>) {}

  async create(input: CreateBedrockInput): Promise<InformationBedrock> {
    const bedrocks = await this.store.readAll();
    const bedrock: StoredBedrock = {
      id: `bedrock-${randomUUID()}`,
      taskId: input.taskId,
      theme: input.theme,
      coreQuestion: input.coreQuestion,
      arguments: input.arguments,
      evidence: input.evidence,
      uncertainties: input.uncertainties,
      confirmed: input.confirmed ?? false,
    };

    bedrocks.push(bedrock);
    await this.store.writeAll(bedrocks);

    return toBedrock(bedrock);
  }

  async get(bedrockId: string): Promise<InformationBedrock | undefined> {
    const bedrocks = await this.store.readAll();
    const bedrock = bedrocks.find((currentBedrock) => currentBedrock.id === bedrockId);
    return bedrock ? toBedrock(bedrock) : undefined;
  }

  async getLatestByTask(taskId: string): Promise<InformationBedrock | undefined> {
    const bedrocks = await this.store.readAll();
    const bedrock = bedrocks.filter((currentBedrock) => currentBedrock.taskId === taskId).at(-1);
    return bedrock ? toBedrock(bedrock) : undefined;
  }

  async getLatestConfirmedByTask(taskId: string): Promise<InformationBedrock | undefined> {
    const bedrocks = await this.store.readAll();
    const confirmedBedrock = bedrocks
      .filter((currentBedrock) => currentBedrock.taskId === taskId && currentBedrock.confirmed)
      .reduce<StoredBedrock | undefined>((latest, currentBedrock) => {
        if (!latest) {
          return currentBedrock;
        }

        const latestConfirmedAt = latest.confirmedAt ?? '';
        const currentConfirmedAt = currentBedrock.confirmedAt ?? '';

        return currentConfirmedAt >= latestConfirmedAt ? currentBedrock : latest;
      }, undefined);

    return confirmedBedrock ? toBedrock(confirmedBedrock) : undefined;
  }

  async confirm(bedrockId: string): Promise<InformationBedrock | undefined> {
    const bedrocks = await this.store.readAll();
    const index = bedrocks.findIndex((bedrock) => bedrock.id === bedrockId);

    if (index === -1) {
      return undefined;
    }

    const confirmedBedrock: StoredBedrock = {
      ...bedrocks[index],
      confirmed: true,
      confirmedAt: new Date().toISOString(),
    };
    bedrocks[index] = confirmedBedrock;
    await this.store.writeAll(bedrocks);

    return toBedrock(confirmedBedrock);
  }

  async save(bedrock: InformationBedrock): Promise<InformationBedrock> {
    const bedrocks = await this.store.readAll();
    const index = bedrocks.findIndex((currentBedrock) => currentBedrock.id === bedrock.id);
    const nextBedrock: StoredBedrock = index === -1 ? bedrock : { ...bedrocks[index], ...bedrock };

    if (index === -1) {
      bedrocks.push(nextBedrock);
    } else {
      bedrocks[index] = nextBedrock;
    }

    await this.store.writeAll(bedrocks);
    return toBedrock(nextBedrock);
  }
}

const toBedrock = ({ confirmedAt: _confirmedAt, ...bedrock }: StoredBedrock): InformationBedrock =>
  bedrock;

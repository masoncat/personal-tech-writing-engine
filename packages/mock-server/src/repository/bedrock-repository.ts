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

export class BedrockRepository {
  constructor(private readonly store: FileStore<InformationBedrock>) {}

  async create(input: CreateBedrockInput): Promise<InformationBedrock> {
    const bedrocks = await this.store.readAll();
    const bedrock: InformationBedrock = {
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

    return bedrock;
  }

  async get(bedrockId: string): Promise<InformationBedrock | undefined> {
    const bedrocks = await this.store.readAll();
    return bedrocks.find((bedrock) => bedrock.id === bedrockId);
  }

  async getLatestByTask(taskId: string): Promise<InformationBedrock | undefined> {
    const bedrocks = await this.store.readAll();
    return bedrocks.filter((bedrock) => bedrock.taskId === taskId).at(-1);
  }

  async save(bedrock: InformationBedrock): Promise<InformationBedrock> {
    const bedrocks = await this.store.readAll();
    const index = bedrocks.findIndex((currentBedrock) => currentBedrock.id === bedrock.id);

    if (index === -1) {
      bedrocks.push(bedrock);
    } else {
      bedrocks[index] = bedrock;
    }

    await this.store.writeAll(bedrocks);
    return bedrock;
  }
}

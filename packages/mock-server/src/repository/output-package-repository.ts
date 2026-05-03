import type { OutputPackage } from '@ptce/shared';

import type { FileStore } from './file-store.js';

export class OutputPackageRepository {
  constructor(private readonly store: FileStore<OutputPackage>) {}

  async save(outputPackage: OutputPackage): Promise<OutputPackage> {
    const outputPackages = await this.store.readAll();
    const index = outputPackages.findIndex((currentPackage) => currentPackage.id === outputPackage.id);

    if (index === -1) {
      outputPackages.push(outputPackage);
    } else {
      outputPackages[index] = outputPackage;
    }

    await this.store.writeAll(outputPackages);
    return outputPackage;
  }

  async getByTaskId(taskId: string): Promise<OutputPackage | undefined> {
    const outputPackages = await this.store.readAll();
    return outputPackages.find((outputPackage) => outputPackage.taskId === taskId);
  }
}

import { randomUUID } from 'node:crypto';

import type { ExportRecord, ExportChannel, ExportFormat } from '@ptce/shared';

import type { FileStore } from './file-store.js';

export interface CreateExportInput {
  taskId: string;
  versionId: string;
  channel: ExportChannel;
  format: ExportFormat;
  outputPath: string;
  vaultPath?: string;
  relativePath?: string;
}

export class ExportRepository {
  constructor(private readonly store: FileStore<ExportRecord>) {}

  async create(input: CreateExportInput): Promise<ExportRecord> {
    const exports = await this.store.readAll();
    const exportRecord: ExportRecord = {
      id: `export-${randomUUID()}`,
      taskId: input.taskId,
      versionId: input.versionId,
      channel: input.channel,
      format: input.format,
      outputPath: input.outputPath,
      vaultPath: input.vaultPath,
      relativePath: input.relativePath,
    };

    exports.push(exportRecord);
    await this.store.writeAll(exports);

    return exportRecord;
  }
}

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

export interface FileStoreOptions {
  dataDir: string;
  fileName: string;
}

export class FileStore<T> {
  private readonly filePath: string;

  constructor({ dataDir, fileName }: FileStoreOptions) {
    this.filePath = join(dataDir, fileName);
  }

  async readAll(): Promise<T[]> {
    await mkdir(dirname(this.filePath), { recursive: true });

    try {
      const raw = await readFile(this.filePath, 'utf8');
      const parsed = JSON.parse(raw) as unknown;

      if (!Array.isArray(parsed)) {
        throw new Error(`Expected array data in ${this.filePath}`);
      }

      return parsed as T[];
    } catch (error) {
      if (isMissingFileError(error)) {
        return [];
      }

      throw error;
    }
  }

  async writeAll(items: T[]): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, JSON.stringify(items, null, 2));
  }
}

const isMissingFileError = (error: unknown): error is NodeJS.ErrnoException =>
  typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT';

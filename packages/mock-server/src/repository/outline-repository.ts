import { randomUUID } from 'node:crypto';

import type { ArticleOutline, OutlineSection } from '@ptce/shared';

import type { FileStore } from './file-store.js';

export interface CreateOutlineInput {
  taskId: string;
  title: string;
  sections: OutlineSection[];
  confirmed?: boolean;
}

export class OutlineRepository {
  constructor(private readonly store: FileStore<ArticleOutline>) {}

  async create(input: CreateOutlineInput): Promise<ArticleOutline> {
    const outlines = await this.store.readAll();
    const outline: ArticleOutline = {
      id: `outline-${randomUUID()}`,
      taskId: input.taskId,
      title: input.title,
      sections: input.sections,
      confirmed: input.confirmed ?? false,
    };

    outlines.push(outline);
    await this.store.writeAll(outlines);

    return outline;
  }

  async get(outlineId: string): Promise<ArticleOutline | undefined> {
    const outlines = await this.store.readAll();
    return outlines.find((outline) => outline.id === outlineId);
  }

  async getLatestByTask(taskId: string): Promise<ArticleOutline | undefined> {
    const outlines = await this.store.readAll();
    return outlines.filter((outline) => outline.taskId === taskId).at(-1);
  }

  async save(outline: ArticleOutline): Promise<ArticleOutline> {
    const outlines = await this.store.readAll();
    const index = outlines.findIndex((currentOutline) => currentOutline.id === outline.id);

    if (index === -1) {
      outlines.push(outline);
    } else {
      outlines[index] = outline;
    }

    await this.store.writeAll(outlines);
    return outline;
  }
}

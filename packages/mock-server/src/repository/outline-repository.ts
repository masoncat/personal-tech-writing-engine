import { randomUUID } from 'node:crypto';

import type { ArticleOutline, OutlineSection } from '@ptce/shared';

import type { FileStore } from './file-store.js';

export interface CreateOutlineInput {
  taskId: string;
  title: string;
  sections: OutlineSection[];
  confirmed?: boolean;
}

interface StoredOutline extends ArticleOutline {
  confirmedAt?: string;
}

export class OutlineRepository {
  constructor(private readonly store: FileStore<StoredOutline>) {}

  async create(input: CreateOutlineInput): Promise<ArticleOutline> {
    const outlines = await this.store.readAll();
    const outline: StoredOutline = {
      id: `outline-${randomUUID()}`,
      taskId: input.taskId,
      title: input.title,
      sections: input.sections,
      confirmed: input.confirmed ?? false,
    };

    outlines.push(outline);
    await this.store.writeAll(outlines);

    return toOutline(outline);
  }

  async get(outlineId: string): Promise<ArticleOutline | undefined> {
    const outlines = await this.store.readAll();
    const outline = outlines.find((currentOutline) => currentOutline.id === outlineId);
    return outline ? toOutline(outline) : undefined;
  }

  async getLatestByTask(taskId: string): Promise<ArticleOutline | undefined> {
    const outlines = await this.store.readAll();
    const outline = outlines.filter((currentOutline) => currentOutline.taskId === taskId).at(-1);
    return outline ? toOutline(outline) : undefined;
  }

  async getLatestConfirmedByTask(taskId: string): Promise<ArticleOutline | undefined> {
    const outlines = await this.store.readAll();
    const confirmedOutline = outlines
      .filter((currentOutline) => currentOutline.taskId === taskId && currentOutline.confirmed)
      .reduce<StoredOutline | undefined>((latest, currentOutline) => {
        if (!latest) {
          return currentOutline;
        }

        const latestConfirmedAt = latest.confirmedAt ?? '';
        const currentConfirmedAt = currentOutline.confirmedAt ?? '';

        return currentConfirmedAt >= latestConfirmedAt ? currentOutline : latest;
      }, undefined);

    return confirmedOutline ? toOutline(confirmedOutline) : undefined;
  }

  async confirm(outlineId: string): Promise<ArticleOutline | undefined> {
    const outlines = await this.store.readAll();
    const index = outlines.findIndex((outline) => outline.id === outlineId);

    if (index === -1) {
      return undefined;
    }

    const confirmedOutline: StoredOutline = {
      ...outlines[index],
      confirmed: true,
      confirmedAt: new Date().toISOString(),
    };
    outlines[index] = confirmedOutline;
    await this.store.writeAll(outlines);

    return toOutline(confirmedOutline);
  }

  async save(outline: ArticleOutline): Promise<ArticleOutline> {
    const outlines = await this.store.readAll();
    const index = outlines.findIndex((currentOutline) => currentOutline.id === outline.id);
    const nextOutline: StoredOutline = index === -1 ? outline : { ...outlines[index], ...outline };

    if (index === -1) {
      outlines.push(nextOutline);
    } else {
      outlines[index] = nextOutline;
    }

    await this.store.writeAll(outlines);
    return toOutline(nextOutline);
  }
}

const toOutline = ({ confirmedAt: _confirmedAt, ...outline }: StoredOutline): ArticleOutline =>
  outline;

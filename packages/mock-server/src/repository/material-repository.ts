import { randomUUID } from 'node:crypto';

import type { AddMaterialRequest, Material } from '../../../shared/src/index.js';

import type { FileStore } from './file-store.js';

export interface AddMaterialInput extends AddMaterialRequest {
  taskId: string;
}

export class MaterialRepository {
  constructor(private readonly store: FileStore<Material>) {}

  async add(input: AddMaterialInput): Promise<Material> {
    const materials = await this.store.readAll();
    const material: Material = {
      id: `material-${randomUUID()}`,
      taskId: input.taskId,
      type: input.type,
      title: input.title,
      source: input.source,
      content: input.content,
      createdAt: new Date().toISOString(),
      vaultPath: input.vaultPath,
      relativePath: input.relativePath,
      frontmatter: input.frontmatter,
      tags: input.tags,
    };

    materials.push(material);
    await this.store.writeAll(materials);

    return material;
  }

  async listByTask(taskId: string): Promise<Material[]> {
    const materials = await this.store.readAll();
    return materials.filter((material) => material.taskId === taskId);
  }
}

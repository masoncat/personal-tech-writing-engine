import { readdir, readFile, stat } from 'node:fs/promises';
import { basename, extname, isAbsolute, relative, resolve, sep } from 'node:path';

import matter from 'gray-matter';
import type { AddMaterialRequest, ImportObsidianRequest, MaterialType } from '@ptce/shared';
import { ErrorCode } from '@ptce/shared';

import type { MaterialService, MaterialListResult } from './material-service.js';
import { AppError } from '../workflow/stage-guards.js';

export class ObsidianImportService {
  constructor(private readonly materialService: MaterialService) {}

  async import(taskId: string, input: ImportObsidianRequest): Promise<MaterialListResult> {
    const vaultPath = resolve(input.vaultPath);
    const scanPath = isAbsolute(input.path)
      ? resolve(input.path)
      : resolve(vaultPath, input.path);

    ensurePathWithinRoot(vaultPath, scanPath, 'path');
    const markdownFiles = await collectMarkdownFiles(scanPath);

    let latestResult: MaterialListResult | undefined;

    for (const filePath of markdownFiles) {
      const materialInput = await this.toMaterialInput(vaultPath, filePath);
      latestResult = await this.materialService.addMaterial(taskId, materialInput);
    }

    if (latestResult) {
      return latestResult;
    }

    return this.materialService.listMaterials(taskId);
  }

  private async toMaterialInput(
    vaultPath: string,
    filePath: string,
  ): Promise<AddMaterialRequest> {
    const raw = await readFile(filePath, 'utf8');
    const parsed = matter(raw);
    const relativePath = normalizeRelativePath(relative(vaultPath, filePath));
    const title = resolveTitle(parsed.data.title, parsed.content, filePath);
    const tags = Array.isArray(parsed.data.tags)
      ? parsed.data.tags.filter((tag): tag is string => typeof tag === 'string')
      : undefined;

    return {
      type: inferMaterialType(parsed.data, tags, relativePath),
      title,
      source: 'obsidian',
      content: parsed.content.trim(),
      vaultPath,
      relativePath,
      frontmatter: parsed.data,
      tags,
    };
  }
}

const collectMarkdownFiles = async (targetPath: string): Promise<string[]> => {
  const targetStats = await stat(targetPath);

  if (targetStats.isFile()) {
    return extname(targetPath) === '.md' ? [targetPath] : [];
  }

  const entries = await readdir(targetPath, { withFileTypes: true });
  const nestedFiles = await Promise.all(
    entries.map(async (entry) => {
      const nextPath = resolve(targetPath, entry.name);

      if (entry.isDirectory()) {
        return collectMarkdownFiles(nextPath);
      }

      return extname(entry.name) === '.md' ? [nextPath] : [];
    }),
  );

  return nestedFiles.flat().sort();
};

const inferMaterialType = (
  frontmatter: Record<string, unknown>,
  tags: string[] | undefined,
  relativePath: string,
): MaterialType => {
  const directType = resolveMaterialType(frontmatter.materialType);

  if (directType) {
    return directType;
  }

  const typeTag = tags?.map((tag) => tag.toLowerCase()).find(isMaterialType);

  if (typeTag) {
    return typeTag;
  }

  const lowerPath = relativePath.toLowerCase();

  if (lowerPath.includes('draft')) {
    return 'draft';
  }

  if (lowerPath.includes('article') || lowerPath.includes('post')) {
    return 'article';
  }

  return 'note';
};

const resolveMaterialType = (value: unknown): MaterialType | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  return isMaterialType(value.toLowerCase()) ? (value.toLowerCase() as MaterialType) : undefined;
};

const isMaterialType = (value: string): value is MaterialType =>
  ['prompt', 'note', 'repo', 'article', 'draft', 'reference'].includes(value);

const resolveTitle = (frontmatterTitle: unknown, content: string, filePath: string): string => {
  if (typeof frontmatterTitle === 'string' && frontmatterTitle.trim()) {
    return frontmatterTitle.trim();
  }

  const heading = content
    .split('\n')
    .find((line) => line.trim().startsWith('#'))
    ?.replace(/^#+\s*/, '')
    .trim();

  return heading || basename(filePath, extname(filePath));
};

const normalizeRelativePath = (pathValue: string): string => pathValue.split(sep).join('/');

const ensurePathWithinRoot = (rootPath: string, targetPath: string, field: string): void => {
  const relativePath = relative(rootPath, targetPath);

  if (relativePath.startsWith('..') || relativePath === '') {
    if (targetPath === rootPath) {
      return;
    }
  }

  if (relativePath.startsWith('..')) {
    throw new AppError(
      ErrorCode.InvalidArgument,
      'Obsidian path must be inside the vault',
      {
        [field]: targetPath,
        vaultPath: rootPath,
      },
      400,
    );
  }
};

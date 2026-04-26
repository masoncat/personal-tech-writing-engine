import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, normalize, relative, resolve, sep } from 'node:path';

import type {
  ArticleVersion,
  ExportChannel,
  ExportFormat,
  ExportTarget,
  WritingTask,
} from '@ptce/shared';

export interface RenderExportInput {
  task: WritingTask;
  version: ArticleVersion;
  channel: ExportChannel;
  format: ExportFormat;
}

export interface WriteArtifactInput {
  content: string;
  target: ExportTarget;
  outputPath?: string;
  vaultPath?: string;
  defaultLocalDir: string;
  fileName: string;
}

export interface ArtifactWriteResult {
  outputPath: string;
  vaultPath?: string;
  relativePath?: string;
}

export const renderExportMarkdown = ({
  task,
  version,
  channel,
  format,
}: RenderExportInput): string => `---
title: ${task.title}
channel: ${channel}
format: ${format}
versionId: ${version.id}
---

${version.content}
`;

export const writeArtifact = async ({
  content,
  target,
  outputPath,
  vaultPath,
  defaultLocalDir,
  fileName,
}: WriteArtifactInput): Promise<ArtifactWriteResult> => {
  if (target === 'obsidian') {
    if (!vaultPath || !outputPath) {
      throw new Error('Obsidian exports require vaultPath and outputPath.');
    }

    const relativePath = normalize(outputPath);
    const absolutePath = resolve(vaultPath, relativePath);
    ensurePathWithinRoot(vaultPath, absolutePath);
    await mkdir(dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, content, 'utf8');

    return {
      outputPath: absolutePath,
      vaultPath,
      relativePath: normalizeRelativePath(relative(vaultPath, absolutePath)),
    };
  }

  const resolvedOutputPath = outputPath
    ? isAbsolute(outputPath)
      ? outputPath
      : join(defaultLocalDir, outputPath)
    : join(defaultLocalDir, fileName);

  await mkdir(dirname(resolvedOutputPath), { recursive: true });
  await writeFile(resolvedOutputPath, content, 'utf8');

  return {
    outputPath: resolvedOutputPath,
  };
};

const ensurePathWithinRoot = (rootPath: string, targetPath: string): void => {
  const relativePath = relative(rootPath, targetPath);

  if (relativePath.startsWith('..')) {
    throw new Error('Export path must stay inside the requested vault.');
  }
};

const normalizeRelativePath = (pathValue: string): string => pathValue.split(sep).join('/');

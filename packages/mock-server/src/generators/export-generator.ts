import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, normalize, relative, resolve, sep } from 'node:path';

import type {
  ArticleVersion,
  ExportChannel,
  ExportFormat,
  ExportTarget,
  WritingTask,
} from '@ptce/shared';
import { ErrorCode } from '@ptce/shared';

import { AppError } from '../workflow/stage-guards.js';

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
      throw new AppError(
        ErrorCode.InvalidArgument,
        'Obsidian exports require vaultPath and outputPath.',
        { outputPath, vaultPath },
        400,
      );
    }

    if (isAbsolute(outputPath)) {
      throw new AppError(
        ErrorCode.InvalidArgument,
        'Obsidian export path must be relative to the vault.',
        { outputPath, vaultPath },
        400,
      );
    }

    const relativePath = normalize(outputPath);
    const absolutePath = resolve(vaultPath, relativePath);
    ensurePathWithinRoot(
      vaultPath,
      absolutePath,
      'Export path must stay inside the requested vault.',
      { outputPath, vaultPath },
    );
    await mkdir(dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, content, 'utf8');

    return {
      outputPath: absolutePath,
      vaultPath,
      relativePath: normalizeRelativePath(relative(vaultPath, absolutePath)),
    };
  }

  if (outputPath && isAbsolute(outputPath)) {
    throw new AppError(
      ErrorCode.InvalidArgument,
      'Local export path must be relative to the export directory.',
      { outputPath },
      400,
    );
  }

  const resolvedOutputPath = resolve(defaultLocalDir, outputPath ?? fileName);
  ensurePathWithinRoot(
    defaultLocalDir,
    resolvedOutputPath,
    'Local export path must stay inside the export directory.',
    { outputPath },
  );

  await mkdir(dirname(resolvedOutputPath), { recursive: true });
  await writeFile(resolvedOutputPath, content, 'utf8');

  return {
    outputPath: resolvedOutputPath,
  };
};

const ensurePathWithinRoot = (
  rootPath: string,
  targetPath: string,
  message: string,
  details: Record<string, unknown>,
): void => {
  const relativePath = relative(rootPath, targetPath);

  if (relativePath.startsWith('..')) {
    throw new AppError(ErrorCode.InvalidArgument, message, details, 400);
  }
};

const normalizeRelativePath = (pathValue: string): string => pathValue.split(sep).join('/');

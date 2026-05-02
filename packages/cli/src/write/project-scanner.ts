import { execFile } from 'node:child_process';
import { readdir, readFile, realpath, stat } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { promisify } from 'node:util';

import type { CandidateProjectSource } from './types.js';

const execFileAsync = promisify(execFile);

export interface CollectProjectSourcesOptions {
  projectPath: string;
  withGitLog: boolean;
  sourcePaths?: string[];
  loadGitLog?: (projectPath: string) => Promise<string>;
}

const DEFAULT_SOURCE_PATHS = ['README.md', 'docs', 'docs/articles', 'docs/superpowers/specs', 'docs/superpowers/plans'];

export const collectProjectSources = async ({
  projectPath,
  withGitLog,
  sourcePaths,
  loadGitLog = loadRecentGitLog,
}: CollectProjectSourcesOptions): Promise<CandidateProjectSource[]> => {
  const root = resolve(projectPath);
  const canonicalRoot = await realpath(root);
  const scopedPaths = (sourcePaths?.length ? sourcePaths : DEFAULT_SOURCE_PATHS)
    .map((value) => resolve(root, value))
    .filter((value) => isPathWithin(root, value));

  const fileSources = (await Promise.all(scopedPaths.map(async (path) => collectPathSources(root, canonicalRoot, path)))).flat();
  const deduped = new Map<string, CandidateProjectSource>();

  for (const source of fileSources) {
    deduped.set(source.path, source);
  }

  if (withGitLog) {
    const gitLog = await loadGitLog(root);
    if (gitLog.trim().length > 0) {
      deduped.set('git-log://recent', {
        id: 'git-log-recent',
        kind: 'git-log',
        path: 'git-log://recent',
        title: 'Recent git history',
        content: gitLog,
      });
    }
  }

  return [...deduped.values()].sort((left, right) => compareSources(root, scopedPaths, left, right));
};

const collectPathSources = async (
  root: string,
  canonicalRoot: string,
  targetPath: string,
): Promise<CandidateProjectSource[]> => {
  try {
    const canonicalPath = await realpath(targetPath);
    if (!isPathWithin(canonicalRoot, canonicalPath)) {
      return [];
    }

    const metadata = await stat(targetPath);

    if (metadata.isDirectory()) {
      const entries = await readdir(targetPath, { withFileTypes: true });
      const nested = await Promise.all(
        entries
          .sort((left, right) => compareText(left.name, right.name))
          .map(async (entry) => collectPathSources(root, canonicalRoot, join(targetPath, entry.name))),
      );
      return nested.flat();
    }

    if (!metadata.isFile() || !targetPath.endsWith('.md')) {
      return [];
    }

    const content = await readFile(targetPath, 'utf8');
    const relativePath = relative(root, targetPath) || 'README.md';

    return [
      {
        id: relativePath,
        kind: 'file',
        path: targetPath,
        title: relativePath,
        content,
      },
    ];
  } catch {
    return [];
  }
};

const loadRecentGitLog = async (projectPath: string): Promise<string> => {
  const { stdout } = await execFileAsync('git', ['-C', projectPath, 'log', '--oneline', '-n', '12']);
  return stdout;
};

const compareSources = (
  root: string,
  scopedPaths: string[],
  left: CandidateProjectSource,
  right: CandidateProjectSource,
): number => {
  if (left.kind !== right.kind) {
    return left.kind === 'file' ? -1 : 1;
  }

  const leftPriority = left.kind === 'file' ? getScopedPathPriority(scopedPaths, left.path) : Number.MAX_SAFE_INTEGER;
  const rightPriority = right.kind === 'file' ? getScopedPathPriority(scopedPaths, right.path) : Number.MAX_SAFE_INTEGER;

  if (leftPriority !== rightPriority) {
    return leftPriority - rightPriority;
  }

  const leftKey = left.kind === 'file' ? relative(root, left.path) : left.path;
  const rightKey = right.kind === 'file' ? relative(root, right.path) : right.path;
  return compareText(leftKey, rightKey);
};

const getScopedPathPriority = (scopedPaths: string[], candidatePath: string): number => {
  const matchIndex = scopedPaths.reduce<number | undefined>((bestIndex, scopedPath, index) => {
    const isExactMatch = candidatePath === scopedPath;
    const isNestedMatch = isPathWithin(scopedPath, candidatePath);

    if (!isExactMatch && !isNestedMatch) {
      return bestIndex;
    }

    if (bestIndex === undefined) {
      return index;
    }

    return scopedPath.length > scopedPaths[bestIndex].length ? index : bestIndex;
  }, undefined);

  return matchIndex ?? Number.MAX_SAFE_INTEGER;
};

const isPathWithin = (basePath: string, candidatePath: string): boolean => {
  const relativePath = relative(basePath, candidatePath);
  return relativePath === '' || (!relativePath.startsWith('..') && relativePath !== '..');
};

const compareText = (left: string, right: string): number => {
  const lowerLeft = left.toLowerCase();
  const lowerRight = right.toLowerCase();

  if (lowerLeft < lowerRight) {
    return -1;
  }
  if (lowerLeft > lowerRight) {
    return 1;
  }
  if (left < right) {
    return -1;
  }
  if (left > right) {
    return 1;
  }

  return 0;
};

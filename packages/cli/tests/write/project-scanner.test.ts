import { rm } from 'node:fs/promises';
import { mkdtemp, mkdir, symlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { afterEach, describe, expect, it } from 'vitest';

import { collectProjectSources } from '../../src/write/project-scanner.js';

const tempDirs: string[] = [];

const createProjectFixture = async () => {
  const root = await mkdtemp(join(tmpdir(), 'ptce-project-scan-'));
  tempDirs.push(root);

  await mkdir(join(root, 'docs', 'articles'), { recursive: true });
  await mkdir(join(root, 'docs', 'superpowers', 'specs'), { recursive: true });
  await mkdir(join(root, 'docs', 'superpowers', 'plans'), { recursive: true });

  await writeFile(join(root, 'README.md'), '# Project');
  await writeFile(join(root, 'docs', 'overview.md'), '# Overview');
  await writeFile(join(root, 'docs', 'articles', 'post.md'), '# Article');
  await writeFile(join(root, 'docs', 'superpowers', 'specs', 'spec.md'), '# Spec');
  await writeFile(join(root, 'docs', 'superpowers', 'plans', 'plan.md'), '# Plan');

  return root;
};

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map(async (dir) => rm(dir, { recursive: true, force: true })));
});

describe('collectProjectSources', () => {
  it('collects default project sources plus git history when enabled', async () => {
    const projectPath = await createProjectFixture();

    const sources = await collectProjectSources({
      projectPath,
      withGitLog: true,
      sourcePaths: undefined,
      loadGitLog: async () => 'abc123 feat: add task center',
    });

    expect(sources.map((source) => source.path)).toEqual([
      join(projectPath, 'README.md'),
      join(projectPath, 'docs', 'overview.md'),
      join(projectPath, 'docs', 'articles', 'post.md'),
      join(projectPath, 'docs', 'superpowers', 'specs', 'spec.md'),
      join(projectPath, 'docs', 'superpowers', 'plans', 'plan.md'),
      'git-log://recent',
    ]);
  });

  it('narrows scanning to explicit source paths and can skip git history', async () => {
    const projectPath = await createProjectFixture();

    const sources = await collectProjectSources({
      projectPath,
      withGitLog: false,
      sourcePaths: ['docs/articles'],
      loadGitLog: async () => {
        throw new Error('should not be called');
      },
    });

    expect(sources.map((source) => source.path)).toEqual([join(projectPath, 'docs', 'articles', 'post.md')]);
  });

  it('ignores explicit source paths that resolve outside the project root', async () => {
    const projectPath = await createProjectFixture();
    const externalPath = join(projectPath, '..', 'outside.md');
    await writeFile(externalPath, '# Outside');

    const sources = await collectProjectSources({
      projectPath,
      withGitLog: false,
      sourcePaths: ['../outside.md'],
      loadGitLog: async () => {
        throw new Error('should not be called');
      },
    });

    expect(sources).toEqual([]);
  });

  it('ignores explicit source paths that escape through a symlink', async () => {
    const projectPath = await createProjectFixture();
    const externalDir = join(projectPath, '..', 'outside-dir');
    await mkdir(externalDir, { recursive: true });
    await writeFile(join(externalDir, 'leak.md'), '# Outside Through Symlink');
    await symlink(externalDir, join(projectPath, 'docs', 'linked-outside'));

    const sources = await collectProjectSources({
      projectPath,
      withGitLog: false,
      sourcePaths: ['docs/linked-outside'],
      loadGitLog: async () => {
        throw new Error('should not be called');
      },
    });

    expect(sources).toEqual([]);
  });
});

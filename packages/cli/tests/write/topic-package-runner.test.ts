import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { afterEach, describe, expect, it } from 'vitest';

import { createTopicPackageRunner } from '../../src/write/topic-package-runner.js';

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('createTopicPackageRunner', () => {
  it('writes an auditable topic package with research, freshness, evidence, visual briefs, and article', async () => {
    const root = await mkdtemp(join(tmpdir(), 'ptce-topic-'));
    tempDirs.push(root);
    const output = join(root, 'article.md');
    const runner = createTopicPackageRunner();

    const result = await runner.run({
      topic: '前端工程师在 AI 时代的出路',
      audience: '3-5年经验前端工程师',
      channel: 'wechat',
      output,
      withRealResearch: false,
      withMedia: false,
      currentDate: '2026-05-04',
    });

    expect(result.articlePath).toBe(output);
    expect(JSON.parse(await readFile(result.researchPackagePath, 'utf8'))).toMatchObject({
      id: expect.any(String),
    });
    expect(JSON.parse(await readFile(result.freshnessAuditPath, 'utf8'))).toMatchObject({
      currentDate: '2026-05-04',
    });
    expect(JSON.parse(await readFile(result.visualBriefsPath, 'utf8'))).toHaveLength(4);
    expect(await readFile(output, 'utf8')).toContain('# 前端工程师在 AI 时代的出路');
  });
});

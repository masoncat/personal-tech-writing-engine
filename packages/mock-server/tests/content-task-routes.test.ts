import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  ErrorCode,
  type ContentArtifactsResponse,
  type ContentRunResponse,
  type ContentTaskEnvelope,
} from '@ptce/shared';
import { afterEach, describe, expect, it } from 'vitest';

import { buildApp } from '../src/app.js';

const tempDirs: string[] = [];

const createTempDataDir = async () => {
  const dataDir = await mkdtemp(join(tmpdir(), 'ptce-content-server-'));
  tempDirs.push(dataDir);
  return dataDir;
};

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('content task routes', () => {
  it('creates a typed content task with registries and output package draft', async () => {
    const app = buildApp({ dataDir: await createTempDataDir() });

    try {
      const response = await app.inject({
        method: 'POST',
        url: '/content-tasks',
        payload: {
          title: 'MVP review flow',
          contentType: 'prd',
          contentSubtype: 'mvp_scope',
          audience: 'founder and implementation agent',
          purpose: 'align MVP scope and acceptance criteria',
        },
      });

      expect(response.statusCode).toBe(201);

      const body = response.json<ContentTaskEnvelope>();
      expect(body.task).toMatchObject({
        title: 'MVP review flow',
        contentType: 'prd',
        contentSubtype: 'mvp_scope',
        workflowProfileId: 'prd.default',
        qualityRubricId: 'prd.default',
        skillBindingId: 'prd.primary',
        audience: 'founder and implementation agent',
        purpose: 'align MVP scope and acceptance criteria',
        currentActionId: 'problem_brief',
        status: 'planning',
      });
      expect(body.task.id).toMatch(/^content-task-/);
      expect(body.workflowProfile.id).toBe('prd.default');
      expect(body.qualityRubric.id).toBe('prd.default');
      expect(body.skillBinding.skillName).toBe('prd-writing');
      expect(body.outputPackage.taskId).toBe(body.task.id);
      expect(body.outputPackage.artifacts.map((artifact) => artifact.artifactType)).toContain('prd_package');
    } finally {
      await app.close();
    }
  });

  it('returns content metadata registries', async () => {
    const app = buildApp({ dataDir: await createTempDataDir() });

    try {
      const contentTypes = await app.inject({ method: 'GET', url: '/content-types' });
      const profiles = await app.inject({ method: 'GET', url: '/workflow-profiles' });
      const rubrics = await app.inject({ method: 'GET', url: '/quality-rubrics' });
      const skillBindings = await app.inject({ method: 'GET', url: '/writing-skill-bindings' });

      expect(contentTypes.statusCode).toBe(200);
      expect(contentTypes.json()).toMatchObject({
        contentTypes: ['public_article', 'prd', 'technical_doc', 'general'],
      });
      expect(profiles.json().workflowProfiles.map((profile: { id: string }) => profile.id)).toContain('public_article.default');
      expect(rubrics.json().qualityRubrics.map((rubric: { id: string }) => rubric.id)).toContain('technical_doc.default');
      expect(skillBindings.json().writingSkillBindings.map((binding: { skillName: string }) => binding.skillName)).toContain('technical-doc-writing');
    } finally {
      await app.close();
    }
  });

  it('rejects running unsupported content runners', async () => {
    const app = buildApp({ dataDir: await createTempDataDir() });

    try {
      const createResponse = await app.inject({
        method: 'POST',
        url: '/content-tasks',
        payload: {
          title: 'MVP review flow',
          contentType: 'prd',
          contentSubtype: 'mvp_scope',
          audience: 'founder and implementation agent',
        },
      });
      const created = createResponse.json<ContentTaskEnvelope>();

      const runResponse = await app.inject({
        method: 'POST',
        url: `/content-tasks/${created.task.id}/runs`,
        payload: {},
      });

      expect(runResponse.statusCode).toBe(400);
      expect(runResponse.json()).toEqual({
        code: ErrorCode.UnsupportedContentRunner,
        message: 'This content type has no executable runner in the MVP.',
        details: {
          contentType: 'prd',
        },
      });
    } finally {
      await app.close();
    }
  });

  it('runs the MVP public article runner and marks artifacts available', async () => {
    const app = buildApp({ dataDir: await createTempDataDir() });

    try {
      const createResponse = await app.inject({
        method: 'POST',
        url: '/content-tasks',
        payload: {
          title: 'Build retrospective',
          contentType: 'public_article',
          contentSubtype: 'project_retrospective',
          audience: 'technical founders',
          preferredChannel: 'blog',
        },
      });
      const created = createResponse.json<ContentTaskEnvelope>();

      const runResponse = await app.inject({
        method: 'POST',
        url: `/content-tasks/${created.task.id}/runs`,
        payload: {},
      });

      expect(runResponse.statusCode).toBe(201);
      const run = runResponse.json<ContentRunResponse>();
      expect(run.executedActionIds).toEqual([
        'appeal_brief',
        'reader_resonance_check',
        'evidence_bedrock',
        'narrative_outline',
        'draft',
        'voice_pass',
        'wechat_layout_check',
        'truth_check',
        'publication_package',
      ]);
      expect(run.task.status).toBe('completed');
      expect(run.outputPackage.readiness).toBe('review_ready');
      expect(run.outputPackage.artifacts.every((artifact) => artifact.status === 'available')).toBe(true);
    } finally {
      await app.close();
    }
  });

  it('stores agent-produced artifacts and updates the output package', async () => {
    const app = buildApp({ dataDir: await createTempDataDir() });

    try {
      const createResponse = await app.inject({
        method: 'POST',
        url: '/content-tasks',
        payload: {
          title: 'Technical design',
          contentType: 'technical_doc',
          contentSubtype: 'explanation',
          audience: 'implementation agent',
        },
      });
      const created = createResponse.json<ContentTaskEnvelope>();

      const addResponse = await app.inject({
        method: 'POST',
        url: `/content-tasks/${created.task.id}/artifacts`,
        payload: {
          artifactType: 'technical_draft',
          title: '技术设计文档',
          content: '# 技术设计文档\n\n正文',
          format: 'markdown',
          createdBy: 'agent',
        },
      });

      expect(addResponse.statusCode).toBe(201);
      const addBody = addResponse.json<ContentArtifactsResponse>();
      expect(addBody.artifacts).toHaveLength(1);
      expect(addBody.artifacts[0]).toMatchObject({
        taskId: created.task.id,
        artifactType: 'technical_draft',
        title: '技术设计文档',
        format: 'markdown',
        createdBy: 'agent',
      });
      expect(addBody.outputPackage.artifacts.find((artifact) => artifact.artifactType === 'technical_draft')).toMatchObject({
        artifactId: addBody.artifacts[0].id,
        status: 'available',
      });

      const listResponse = await app.inject({
        method: 'GET',
        url: `/content-tasks/${created.task.id}/artifacts`,
      });

      expect(listResponse.statusCode).toBe(200);
      expect(listResponse.json<ContentArtifactsResponse>().artifacts[0].content).toBe('# 技术设计文档\n\n正文');
    } finally {
      await app.close();
    }
  });

  it('completes a content task after an agent stores the final artifact', async () => {
    const app = buildApp({ dataDir: await createTempDataDir() });

    try {
      const createResponse = await app.inject({
        method: 'POST',
        url: '/content-tasks',
        payload: {
          title: 'General rewrite',
          contentType: 'general',
          contentSubtype: 'memo',
          audience: 'internal readers',
        },
      });
      const created = createResponse.json<ContentTaskEnvelope>();

      await app.inject({
        method: 'POST',
        url: `/content-tasks/${created.task.id}/artifacts`,
        payload: {
          artifactType: 'final_text',
          title: 'Final memo',
          content: 'Final text',
          format: 'text',
          createdBy: 'agent',
        },
      });

      const completeResponse = await app.inject({
        method: 'POST',
        url: `/content-tasks/${created.task.id}/complete`,
        payload: {},
      });

      expect(completeResponse.statusCode).toBe(200);
      const completeBody = completeResponse.json<ContentTaskEnvelope>();
      expect(completeBody.task.status).toBe('completed');
      expect(completeBody.task.currentActionId).toBe('finish');
      expect(completeBody.outputPackage.readiness).toBe('review_ready');
    } finally {
      await app.close();
    }
  });
});

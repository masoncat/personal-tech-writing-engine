import { describe, expect, it } from 'vitest';

import {
  buildOutputPackageDraft,
  createContentTaskModel,
  createContentArtifactModel,
  getQualityRubric,
  getWorkflowProfile,
  getWritingSkillBinding,
  isValidContentSubtype,
} from '../src/index.js';

describe('content model', () => {
  it('validates content subtype combinations by content type', () => {
    expect(isValidContentSubtype('prd', 'mvp_scope')).toBe(true);
    expect(isValidContentSubtype('prd', 'how_to')).toBe(false);
    expect(isValidContentSubtype('technical_doc', 'how_to')).toBe(true);
    expect(isValidContentSubtype('general', 'explanation')).toBe(true);
    expect(isValidContentSubtype('technical_doc', 'explanation')).toBe(true);
  });

  it('resolves default workflow profiles and quality rubrics', () => {
    const articleProfile = getWorkflowProfile('public_article', 'project_retrospective');
    const technicalRubric = getQualityRubric('technical_doc', 'how_to');

    expect(articleProfile.id).toBe('public_article.default');
    expect(articleProfile.availableActions.map((action) => action.id)).toEqual([
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
    expect(technicalRubric.id).toBe('technical_doc.default');
    expect(technicalRubric.priorityOrder[0]).toBe('准');
  });

  it('resolves one primary writing skill binding per content type', () => {
    expect(getWritingSkillBinding('prd')).toEqual({
      id: 'prd.primary',
      contentType: 'prd',
      skillName: 'prd-writing',
      triggerDescription:
        'Use when writing or revising product requirement documents, MVP scopes, feature specs, user stories, acceptance criteria, or product review materials.',
      primaryOnly: true,
    });
  });

  it('creates a content task with resolved profile rubric skill and first action', () => {
    const task = createContentTaskModel({
      id: 'content-task-1',
      now: '2026-05-02T00:00:00.000Z',
      title: 'MVP scope',
      contentType: 'prd',
      contentSubtype: 'mvp_scope',
      audience: 'founder and implementation agent',
      purpose: 'align MVP scope',
    });

    expect(task).toMatchObject({
      id: 'content-task-1',
      title: 'MVP scope',
      contentType: 'prd',
      contentSubtype: 'mvp_scope',
      workflowProfileId: 'prd.default',
      qualityRubricId: 'prd.default',
      skillBindingId: 'prd.primary',
      audience: 'founder and implementation agent',
      purpose: 'align MVP scope',
      currentActionId: 'problem_brief',
      status: 'planning',
      createdAt: '2026-05-02T00:00:00.000Z',
      updatedAt: '2026-05-02T00:00:00.000Z',
    });
  });

  it('builds an output package draft from the task profile artifacts', () => {
    const task = createContentTaskModel({
      id: 'content-task-1',
      now: '2026-05-02T00:00:00.000Z',
      title: 'Retrospective',
      contentType: 'public_article',
      contentSubtype: 'project_retrospective',
      audience: 'technical founders',
    });

    const outputPackage = buildOutputPackageDraft({
      id: 'output-package-1',
      task,
      now: '2026-05-02T00:00:00.000Z',
    });

    expect(outputPackage).toMatchObject({
      id: 'output-package-1',
      taskId: 'content-task-1',
      contentType: 'public_article',
      contentSubtype: 'project_retrospective',
      readiness: 'draft',
      createdAt: '2026-05-02T00:00:00.000Z',
    });
    expect(outputPackage.artifacts.map((artifact) => artifact.artifactType)).toEqual([
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
    expect(outputPackage.artifacts.every((artifact) => artifact.status === 'planned')).toBe(true);
  });

  it('creates content artifact models for agent-produced documents', () => {
    const artifact = createContentArtifactModel({
      id: 'artifact-1',
      taskId: 'content-task-1',
      artifactType: 'technical_draft',
      title: '技术设计文档',
      content: '# 技术设计文档\n\n正文',
      format: 'markdown',
      createdBy: 'agent',
      now: '2026-05-03T00:00:00.000Z',
    });

    expect(artifact).toEqual({
      id: 'artifact-1',
      taskId: 'content-task-1',
      artifactType: 'technical_draft',
      title: '技术设计文档',
      content: '# 技术设计文档\n\n正文',
      format: 'markdown',
      createdBy: 'agent',
      createdAt: '2026-05-03T00:00:00.000Z',
    });
  });
});

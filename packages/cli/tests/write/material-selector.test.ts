import { describe, expect, it, vi } from 'vitest';

import { buildIntentMaterial } from '../../src/write/intent-enhancer.js';
import { normalizeProjectMaterials } from '../../src/write/material-normalizer.js';
import { selectProjectSources } from '../../src/write/material-selector.js';
import type { CandidateProjectSource } from '../../src/write/types.js';

const candidates: CandidateProjectSource[] = [
  {
    id: 'readme',
    kind: 'file',
    path: '/repo/README.md',
    title: 'README.md',
    content: '# Project overview',
  },
  {
    id: 'article',
    kind: 'file',
    path: '/repo/docs/articles/post.md',
    title: 'docs/articles/post.md',
    content: '# Historical post',
  },
  {
    id: 'plan',
    kind: 'file',
    path: '/repo/docs/superpowers/plans/plan.md',
    title: 'docs/superpowers/plans/plan.md',
    content: '# Plan',
  },
];

describe('selectProjectSources', () => {
  it('uses the provider result in standard mode', async () => {
    const result = await selectProjectSources({
      candidates,
      maxMaterials: 2,
      mode: 'standard',
      provider: {
        selectMaterials: async () => ({
          selected: [
            { id: 'readme', role: 'project-definition', reason: 'root project shape' },
            { id: 'article', role: 'style-sample', reason: 'historical tone sample' },
          ],
          skipped: [{ id: 'plan', role: 'background-only', reason: 'lower signal' }],
          action: 'selected_materials',
        }),
        normalizeMaterials: async () => {
          throw new Error('not needed in this test');
        },
        enhanceIntent: async () => {
          throw new Error('not needed in this test');
        },
        evaluateDraft: async () => {
          throw new Error('not needed in this test');
        },
        finalizeEditorialDraft: async () => {
          throw new Error('not needed in this test');
        },
      },
    });

    expect(result.selectedSources).toEqual([
      { id: 'readme', kind: 'file', path: '/repo/README.md', role: 'project-definition' },
      { id: 'article', kind: 'file', path: '/repo/docs/articles/post.md', role: 'style-sample' },
    ]);
    expect(result.skippedSources).toEqual([
      { id: 'plan', kind: 'file', path: '/repo/docs/superpowers/plans/plan.md', role: 'background-only' },
    ]);
    expect(result.modelActions).toEqual(['selected_materials']);
  });

  it('falls back deterministically when model enhancement is off', async () => {
    const result = await selectProjectSources({
      candidates,
      maxMaterials: 2,
      mode: 'off',
      provider: undefined,
    });

    expect(result.selectedSources.map((source) => source.id)).toEqual(['readme', 'article']);
    expect(result.skippedSources.map((source) => source.id)).toEqual(['plan']);
    expect(result.modelActions).toEqual([]);
  });

  it('passes select-only as the provider-facing model enhancement mode', async () => {
    const selectMaterials = vi.fn().mockResolvedValue({
      selected: [{ id: 'readme', role: 'project-definition' as const, reason: 'highest signal' }],
      skipped: [
        { id: 'article', role: 'background-only' as const, reason: 'not selected' },
        { id: 'plan', role: 'background-only' as const, reason: 'not selected' },
      ],
      action: 'selected_materials',
    });

    await selectProjectSources({
      candidates,
      maxMaterials: 1,
      mode: 'select-only',
      options: {
        projectPath: '/repo',
        title: 'Title',
        articleType: 'build-retrospective',
        reader: 'developers',
        channel: 'blog',
        stopAt: 'draft',
        editorialMode: 'none',
        export: false,
        withGitLog: true,
        withObsidianContext: false,
        modelEnhancement: 'standard',
      },
      provider: {
        selectMaterials,
        normalizeMaterials: async () => {
          throw new Error('not needed in this test');
        },
        enhanceIntent: async () => {
          throw new Error('not needed in this test');
        },
        evaluateDraft: async () => {
          throw new Error('not needed in this test');
        },
        finalizeEditorialDraft: async () => {
          throw new Error('not needed in this test');
        },
      },
    });

    expect(selectMaterials).toHaveBeenCalledWith({
      candidates,
      options: expect.objectContaining({
        maxMaterials: 1,
        modelEnhancement: 'select-only',
      }),
    });
  });

  it('keeps select-only normalization and intent enhancement deterministic even if options are stale', async () => {
    const provider = {
      selectMaterials: async () => ({
        selected: [{ id: 'readme', role: 'project-definition' as const, reason: 'highest signal' }],
        skipped: [
          { id: 'article', role: 'background-only' as const, reason: 'not selected' },
          { id: 'plan', role: 'background-only' as const, reason: 'not selected' },
        ],
        action: 'selected_materials',
      }),
      normalizeMaterials: vi.fn(async () => ({
        workflowMaterials: [
          {
            type: 'article' as const,
            title: 'should not be used',
            content: 'should not be used',
          },
        ],
        action: 'normalized_materials',
      })),
      enhanceIntent: vi.fn(async () => ({
        title: 'should not be used',
        content: 'should not be used',
        action: 'enhanced_intent',
      })),
      evaluateDraft: async () => ({
        continueToEditorial: false,
        action: 'evaluated_draft',
      }),
      finalizeEditorialDraft: async () => ({
        content: 'should not be used',
        action: 'finalized_editorial_draft',
      }),
    };

    const selection = await selectProjectSources({
      candidates,
      maxMaterials: 1,
      mode: 'select-only',
      options: {
        projectPath: '/repo',
        title: 'Title',
        articleType: 'build-retrospective',
        reader: 'developers',
        channel: 'blog',
        stopAt: 'draft',
        editorialMode: 'none',
        export: false,
        withGitLog: true,
        withObsidianContext: false,
        modelEnhancement: 'standard',
      },
      provider,
    });

    const normalized = await normalizeProjectMaterials({
      candidates,
      selectedSources: selection.selectedSources,
      options: {
        projectPath: '/repo',
        title: 'Title',
        articleType: 'build-retrospective',
        reader: 'developers',
        channel: 'blog',
        stopAt: 'draft',
        editorialMode: 'none',
        export: false,
        withGitLog: true,
        withObsidianContext: false,
        modelEnhancement: 'standard',
      },
      mode: selection.mode,
      provider,
    });

    const intent = await buildIntentMaterial({
      options: {
        projectPath: '/repo',
        title: 'Title',
        articleType: 'build-retrospective',
        reader: 'developers',
        channel: 'blog',
        stopAt: 'draft',
        editorialMode: 'none',
        export: false,
        withGitLog: true,
        withObsidianContext: false,
        modelEnhancement: 'standard',
      },
      selectedCandidates: candidates.filter((candidate) => candidate.id === 'readme'),
      mode: selection.mode,
      provider,
    });

    expect(provider.normalizeMaterials).not.toHaveBeenCalled();
    expect(provider.enhanceIntent).not.toHaveBeenCalled();
    expect(normalized.modelActions).toEqual([]);
    expect(normalized.materials).toEqual([
      {
        source: 'inline',
        type: 'repo',
        title: 'README.md',
        content: '# Project overview',
      },
    ]);
    expect(intent.modelActions).toEqual([]);
    expect(intent.material.title).toBe('写作任务说明');
    expect(intent.material.content).toContain('文章标题：Title');
  });

  it('classifies mixed-case Windows-style article paths deterministically', async () => {
    const windowsCandidates: CandidateProjectSource[] = [
      {
        id: 'plan-win',
        kind: 'file',
        path: 'C:\\repo\\DOCS\\Superpowers\\Plans\\Plan.md',
        title: 'DOCS\\Superpowers\\Plans\\Plan.md',
        content: '# Plan',
      },
      {
        id: 'article-win',
        kind: 'file',
        path: 'C:\\repo\\Docs\\Articles\\Post.md',
        title: 'Docs\\Articles\\Post.md',
        content: '# Historical post',
      },
      {
        id: 'readme-win',
        kind: 'file',
        path: 'C:\\repo\\ReadMe.MD',
        title: 'ReadMe.MD',
        content: '# Project overview',
      },
    ];

    const result = await selectProjectSources({
      candidates: windowsCandidates,
      maxMaterials: 2,
      mode: 'off',
      provider: undefined,
    });

    expect(result.selectedSources).toEqual([
      {
        id: 'readme-win',
        kind: 'file',
        path: 'C:\\repo\\ReadMe.MD',
        role: 'project-definition',
      },
      {
        id: 'article-win',
        kind: 'file',
        path: 'C:\\repo\\Docs\\Articles\\Post.md',
        role: 'style-sample',
      },
    ]);
    expect(result.skippedSources).toEqual([
      {
        id: 'plan-win',
        kind: 'file',
        path: 'C:\\repo\\DOCS\\Superpowers\\Plans\\Plan.md',
        role: 'background-only',
      },
    ]);
  });
});

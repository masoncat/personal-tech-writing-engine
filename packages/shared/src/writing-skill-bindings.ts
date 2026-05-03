import type { ContentType } from './domain.js';

export interface WritingSkillBinding {
  id: string;
  contentType: ContentType;
  skillName: string;
  triggerDescription: string;
  primaryOnly: boolean;
}

const WRITING_SKILL_BINDINGS: Record<ContentType, WritingSkillBinding> = {
  general: {
    id: 'general.primary',
    contentType: 'general',
    skillName: 'general-writing',
    triggerDescription:
      'Use when improving or producing writing that has no clear specialized document type, including general explanations, memos, emails, mixed-format drafts, and clarity-focused rewrites.',
    primaryOnly: true,
  },
  public_article: {
    id: 'public_article.primary',
    contentType: 'public_article',
    skillName: 'public-article-writing',
    triggerDescription:
      'Use when writing or revising public-facing articles, blog posts, WeChat long-form posts, technical essays, project retrospectives, or publishable narrative content.',
    primaryOnly: true,
  },
  prd: {
    id: 'prd.primary',
    contentType: 'prd',
    skillName: 'prd-writing',
    triggerDescription:
      'Use when writing or revising product requirement documents, MVP scopes, feature specs, user stories, acceptance criteria, or product review materials.',
    primaryOnly: true,
  },
  technical_doc: {
    id: 'technical_doc.primary',
    contentType: 'technical_doc',
    skillName: 'technical-doc-writing',
    triggerDescription:
      'Use when writing or revising technical documentation, API docs, architecture docs, developer guides, READMEs, runbooks, integration guides, or troubleshooting docs.',
    primaryOnly: true,
  },
};

export const getWritingSkillBinding = (contentType: ContentType): WritingSkillBinding =>
  WRITING_SKILL_BINDINGS[contentType];

export const listWritingSkillBindings = (): WritingSkillBinding[] =>
  Object.values(WRITING_SKILL_BINDINGS);

import type { ContentSubtype, ContentType } from './domain.js';

export interface QualityCriterion {
  id: string;
  label: string;
  description: string;
  required: boolean;
}

export interface QualityRubric {
  id: string;
  contentType: ContentType;
  contentSubtype?: ContentSubtype;
  priorityOrder: string[];
  criteria: QualityCriterion[];
  hardFailures: string[];
  reviewQuestions: string[];
  releaseReadinessRules: string[];
}

const buildRubric = (
  contentType: ContentType,
  priorityOrder: string[],
  reviewQuestions: string[],
): QualityRubric => ({
  id: `${contentType}.default`,
  contentType,
  priorityOrder,
  criteria: priorityOrder.map((label) => ({
    id: label,
    label,
    description: `Review whether the output satisfies ${label}.`,
    required: true,
  })),
  hardFailures: ['unsupported_claim', 'wrong_content_type', 'missing_audience'],
  reviewQuestions,
  releaseReadinessRules: ['All required criteria must be checked before publish_ready.'],
});

const QUALITY_RUBRICS: Record<ContentType, QualityRubric> = {
  public_article: buildRubric('public_article', ['美', '真', '像'], [
    'Does the topic pass HKR: hook, knowledge, and reader resonance?',
    'For WeChat output, is reader resonance explicit before the article gives advice?',
    'Are claims supported by available materials?',
    'Does the draft avoid fake personal experience?',
    'For WeChat output, does the voice pass add reader empathy and oral clarity without copying a persona?',
    'For WeChat output, does the layout follow the repository WeChat layout rubric?',
  ]),
  prd: buildRubric('prd', ['用', '真', '清晰', '完整', '美', '像'], [
    'Can the team make a decision from this document?',
    'Are scope and non-goals explicit?',
    'Are acceptance criteria testable?',
  ]),
  technical_doc: buildRubric('technical_doc', ['准', '可执行', '完整', '清晰', '美', '像'], [
    'Does the doc match the code, API, or configuration source of truth?',
    'Can the reader complete the task?',
    'Are failure modes and examples covered?',
  ]),
  general: buildRubric('general', ['清晰', '准确', '有用', '简洁', '风格'], [
    'Does the reader know why this exists?',
    'Are facts, judgments, and assumptions separated?',
    'Can redundant content be removed?',
  ]),
};

export const getQualityRubric = (
  contentType: ContentType,
  _contentSubtype: ContentSubtype,
): QualityRubric => {
  return QUALITY_RUBRICS[contentType];
};

export const listQualityRubrics = (): QualityRubric[] => Object.values(QUALITY_RUBRICS);

import type { AddMaterialRequest } from '@ptce/shared';

import type {
  CandidateProjectSource,
  CandidateSourceRole,
  ProjectWriteOptions,
} from './types.js';

export interface MaterialSelectionDecision {
  id: string;
  role: CandidateSourceRole;
  reason: string;
}

export interface MaterialSelectionResult {
  selected: MaterialSelectionDecision[];
  skipped: MaterialSelectionDecision[];
  action: string;
}

export interface NormalizedWorkflowMaterial {
  type: AddMaterialRequest['type'];
  title: string;
  content: string;
}

export interface NormalizedMaterialResult {
  workflowMaterials: NormalizedWorkflowMaterial[];
  action: string;
}

export interface EnhancedIntentResult {
  title: string;
  content: string;
  action: string;
}

export interface DraftEvaluationResult {
  continueToEditorial: boolean;
  instruction?: string;
  action: string;
}

export interface EditorialFinalizationResult {
  content: string;
  action: string;
}

export interface WriteModelProvider {
  selectMaterials(input: {
    candidates: CandidateProjectSource[];
    options: ProjectWriteOptions;
  }): Promise<MaterialSelectionResult>;
  normalizeMaterials(input: {
    candidates: CandidateProjectSource[];
    selectedIds: string[];
    options: ProjectWriteOptions;
  }): Promise<NormalizedMaterialResult>;
  enhanceIntent(input: {
    options: ProjectWriteOptions;
    selectedCandidates: CandidateProjectSource[];
  }): Promise<EnhancedIntentResult>;
  evaluateDraft(input: {
    draft: string;
    options: ProjectWriteOptions;
  }): Promise<DraftEvaluationResult>;
  finalizeEditorialDraft(input: {
    draft: string;
    options: ProjectWriteOptions;
  }): Promise<EditorialFinalizationResult>;
}

export class DeterministicWriteModelProvider implements WriteModelProvider {
  async selectMaterials({
    candidates,
    options,
  }: {
    candidates: CandidateProjectSource[];
    options: ProjectWriteOptions;
  }): Promise<MaterialSelectionResult> {
    const sorted = [...candidates].sort((left, right) => compareSourcePriority(left, right));
    const maxMaterials = options.maxMaterials ?? sorted.length;
    const selected = sorted.slice(0, maxMaterials).map((candidate, index) => ({
      id: candidate.id,
      role: classifySelectedRole(candidate, index),
      reason: 'deterministic fallback selection',
    }));
    const selectedIds = new Set(selected.map((item) => item.id));
    const skipped = sorted
      .filter((candidate) => !selectedIds.has(candidate.id))
      .map((candidate) => ({
        id: candidate.id,
        role: classifySkippedRole(candidate),
        reason: 'deterministic fallback skip',
      }));

    return {
      selected,
      skipped,
      action: 'selected_materials',
    };
  }

  async normalizeMaterials({
    candidates,
    selectedIds,
  }: {
    candidates: CandidateProjectSource[];
    selectedIds: string[];
    options: ProjectWriteOptions;
  }): Promise<NormalizedMaterialResult> {
    return {
      workflowMaterials: buildDeterministicWorkflowMaterials(
        candidates,
        selectedIds,
      ),
      action: 'normalized_materials',
    };
  }

  async enhanceIntent({
    options,
  }: {
    options: ProjectWriteOptions;
    selectedCandidates: CandidateProjectSource[];
  }): Promise<EnhancedIntentResult> {
    return {
      title: '写作任务说明',
      content: buildDeterministicIntentContent(options),
      action: 'enhanced_intent',
    };
  }

  async evaluateDraft(): Promise<DraftEvaluationResult> {
    return {
      continueToEditorial: false,
      action: 'evaluated_draft',
    };
  }

  async finalizeEditorialDraft({
    draft,
  }: {
    draft: string;
    options: ProjectWriteOptions;
  }): Promise<EditorialFinalizationResult> {
    return {
      content: draft,
      action: 'finalized_editorial_draft',
    };
  }
}

export const buildDeterministicIntentContent = (options: ProjectWriteOptions): string =>
  [
    `文章标题：${options.title}`,
    `文章类型：${options.articleType}`,
    `目标读者：${options.reader}`,
    `发布渠道：${options.channel}`,
    options.goal ? `写作目标：${options.goal}` : undefined,
    '要求：先讲真实问题，再讲关键转折，最后给出明确判断。',
  ]
    .filter((line): line is string => Boolean(line))
    .join('\n');

export const buildDeterministicWorkflowMaterials = (
  candidates: CandidateProjectSource[],
  selectedIds: string[],
): NormalizedWorkflowMaterial[] => {
  const candidatesById = new Map(candidates.map((candidate) => [candidate.id, candidate]));
  return selectedIds.flatMap((selectedId) => {
    const candidate = candidatesById.get(selectedId);
    if (!candidate) {
      return [];
    }

    return [
      {
        type: inferWorkflowMaterialType(candidate),
        title: candidate.title,
        content: candidate.content,
      },
    ];
  });
};

const classifySelectedRole = (
  candidate: CandidateProjectSource,
  index: number,
): CandidateSourceRole => {
  if (index === 0 || isProjectDefinition(candidate)) {
    return 'project-definition';
  }
  if (candidate.kind === 'git-log') {
    return 'turning-point';
  }
  if (hasPathSegment(candidate.path, 'articles')) {
    return 'style-sample';
  }
  return 'engineering-detail';
};

const classifySkippedRole = (candidate: CandidateProjectSource): CandidateSourceRole =>
  candidate.kind === 'git-log' ? 'turning-point' : 'background-only';

const inferWorkflowMaterialType = (candidate: CandidateProjectSource): AddMaterialRequest['type'] => {
  if (hasPathSegment(candidate.path, 'articles')) {
    return 'article';
  }
  if (candidate.kind === 'git-log') {
    return 'reference';
  }
  if (isProjectDefinition(candidate)) {
    return 'repo';
  }
  return 'note';
};

const isProjectDefinition = (candidate: CandidateProjectSource): boolean => {
  return getPathSegments(candidate.path).at(-1) === 'readme.md';
};

const compareSourcePriority = (left: CandidateProjectSource, right: CandidateProjectSource): number => {
  const leftPriority = getSourcePriority(left);
  const rightPriority = getSourcePriority(right);

  if (leftPriority !== rightPriority) {
    return leftPriority - rightPriority;
  }

  const pathOrder = compareText(left.path, right.path);
  if (pathOrder !== 0) {
    return pathOrder;
  }

  return compareText(left.id, right.id);
};

const getSourcePriority = (candidate: CandidateProjectSource): number => {
  if (isProjectDefinition(candidate)) {
    return 0;
  }
  if (hasPathSegment(candidate.path, 'articles')) {
    return 1;
  }
  if (candidate.kind === 'git-log') {
    return 2;
  }
  if (hasPathSegment(candidate.path, 'plans')) {
    return 4;
  }
  return 3;
};

const hasPathSegment = (filePath: string, segment: string): boolean =>
  getPathSegments(filePath).includes(segment.toLowerCase());

const getPathSegments = (filePath: string): string[] =>
  filePath
    .split(/[\\/]+/u)
    .map((part) => part.toLowerCase())
    .filter((part) => part.length > 0);

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

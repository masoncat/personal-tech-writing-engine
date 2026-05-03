import type {
  ContentSubtype,
  ContentTask,
  ContentType,
} from './domain.js';
import { getQualityRubric } from './quality-rubrics.js';
import { getWorkflowProfile } from './content-profiles.js';

export interface OutputArtifactRef {
  artifactType: string;
  artifactId?: string;
  label: string;
  status: 'available' | 'planned' | 'blocked';
}

export interface ReviewChecklistItem {
  id: string;
  label: string;
  status: 'pass' | 'fail' | 'unknown' | 'not_checked';
}

export interface OutputPackage {
  id: string;
  taskId: string;
  contentType: ContentType;
  contentSubtype: ContentSubtype;
  artifacts: OutputArtifactRef[];
  reviewChecklist: ReviewChecklistItem[];
  readiness: 'draft' | 'review_ready' | 'publish_ready' | 'blocked';
  createdAt: string;
  updatedAt: string;
}

export type ContentArtifactFormat = 'markdown' | 'json' | 'text';
export type ContentArtifactCreator = 'agent' | 'model' | 'user' | 'system';

export interface ContentArtifact {
  id: string;
  taskId: string;
  artifactType: string;
  title: string;
  content: string;
  format: ContentArtifactFormat;
  createdBy: ContentArtifactCreator;
  createdAt: string;
}

export interface CreateContentArtifactModelInput {
  id: string;
  taskId: string;
  artifactType: string;
  title: string;
  content: string;
  format: ContentArtifactFormat;
  createdBy: ContentArtifactCreator;
  now: string;
}

export const createContentArtifactModel = ({
  id,
  taskId,
  artifactType,
  title,
  content,
  format,
  createdBy,
  now,
}: CreateContentArtifactModelInput): ContentArtifact => ({
  id,
  taskId,
  artifactType,
  title,
  content,
  format,
  createdBy,
  createdAt: now,
});

export const buildOutputPackageDraft = ({
  id,
  task,
  now,
}: {
  id: string;
  task: ContentTask;
  now: string;
}): OutputPackage => {
  const profile = getWorkflowProfile(task.contentType, task.contentSubtype);
  const rubric = getQualityRubric(task.contentType, task.contentSubtype);

  return {
    id,
    taskId: task.id,
    contentType: task.contentType,
    contentSubtype: task.contentSubtype,
    artifacts: profile.artifactContracts.map((artifactType) => ({
      artifactType,
      label: artifactType.replace(/_/g, ' '),
      status: 'planned',
    })),
    reviewChecklist: rubric.criteria.map((criterion) => ({
      id: criterion.id,
      label: criterion.label,
      status: 'not_checked',
    })),
    readiness: 'draft',
    createdAt: now,
    updatedAt: now,
  };
};

export const markOutputArtifactAvailable = ({
  outputPackage,
  artifact,
  now,
}: {
  outputPackage: OutputPackage;
  artifact: ContentArtifact;
  now: string;
}): OutputPackage => ({
  ...outputPackage,
  artifacts: outputPackage.artifacts.map((artifactRef) =>
    artifactRef.artifactType === artifact.artifactType
      ? {
          ...artifactRef,
          artifactId: artifact.id,
          status: 'available',
        }
      : artifactRef,
  ),
  updatedAt: now,
});

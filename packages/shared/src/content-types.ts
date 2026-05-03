import type {
  ContentSubtype,
  ContentTask,
  ContentTaskStatus,
  ContentType,
  ExportChannel,
  SourceRequirement,
} from './domain.js';
import { getWorkflowProfile } from './content-profiles.js';
import { getQualityRubric } from './quality-rubrics.js';
import { getWritingSkillBinding } from './writing-skill-bindings.js';

export const CONTENT_SUBTYPES = {
  public_article: [
    'narrative_article',
    'source_analysis',
    'tool_experience',
    'project_retrospective',
  ],
  prd: [
    'feature_prd',
    'mvp_scope',
    'product_strategy',
    'requirement_review',
  ],
  technical_doc: [
    'tutorial',
    'how_to',
    'reference',
    'explanation',
    'troubleshooting',
    'quickstart',
  ],
  general: [
    'memo',
    'email',
    'explanation',
    'mixed_draft',
  ],
} as const satisfies Record<ContentType, readonly ContentSubtype[]>;

export const CONTENT_TYPES = Object.keys(CONTENT_SUBTYPES) as ContentType[];

export const isValidContentSubtype = (
  contentType: ContentType,
  contentSubtype: ContentSubtype,
): boolean => (CONTENT_SUBTYPES[contentType] as readonly ContentSubtype[]).includes(contentSubtype);

export interface CreateContentTaskModelInput {
  id: string;
  now: string;
  title: string;
  contentType: ContentType;
  contentSubtype: ContentSubtype;
  audience: string;
  purpose?: string;
  preferredChannel?: ExportChannel;
  status?: ContentTaskStatus;
}

export const createContentTaskModel = ({
  id,
  now,
  title,
  contentType,
  contentSubtype,
  audience,
  purpose,
  preferredChannel,
  status = 'planning',
}: CreateContentTaskModelInput): ContentTask => {
  assertValidContentSubtype(contentType, contentSubtype);

  const workflowProfile = getWorkflowProfile(contentType, contentSubtype);
  const qualityRubric = getQualityRubric(contentType, contentSubtype);
  const skillBinding = getWritingSkillBinding(contentType);

  return {
    id,
    title,
    contentType,
    contentSubtype,
    workflowProfileId: workflowProfile.id,
    qualityRubricId: qualityRubric.id,
    skillBindingId: skillBinding.id,
    preferredChannel: contentType === 'public_article' ? (preferredChannel ?? 'blog') : undefined,
    audience,
    purpose,
    sourceRequirements: workflowProfile.requiredInputs,
    currentActionId: workflowProfile.availableActions[0]?.id ?? 'finish',
    status,
    createdAt: now,
    updatedAt: now,
  };
};

export const assertValidContentSubtype = (
  contentType: ContentType,
  contentSubtype: ContentSubtype,
): void => {
  if (!isValidContentSubtype(contentType, contentSubtype)) {
    throw new Error(`Invalid content subtype ${contentSubtype} for ${contentType}`);
  }
};

export const userInputRequirement = (description: string): SourceRequirement => ({
  kind: 'user_input',
  required: true,
  description,
});

import type {
  ContentSubtype,
  ContentType,
  SourceRequirement,
} from './domain.js';

export interface WorkflowActionDefinition {
  id: string;
  label: string;
  artifactType?: string;
  requiresReview?: boolean;
}

export interface WorkflowProfile {
  id: string;
  contentType: ContentType;
  contentSubtype?: ContentSubtype;
  availableActions: WorkflowActionDefinition[];
  artifactContracts: string[];
  requiredInputs: SourceRequirement[];
  optionalInputs: SourceRequirement[];
  decisionPolicy: string;
}

const buildProfile = (
  contentType: ContentType,
  artifactContracts: string[],
  decisionPolicy: string,
): WorkflowProfile => ({
  id: `${contentType}.default`,
  contentType,
  availableActions: artifactContracts.map((artifactType) => ({
    id: artifactType,
    label: artifactType.replace(/_/g, ' '),
    artifactType,
    requiresReview: ['reader_resonance_check', 'truth_check', 'wechat_layout_check', 'acceptance_criteria', 'correctness_checklist'].includes(artifactType),
  })),
  artifactContracts,
  requiredInputs: [{
    kind: 'user_input',
    required: true,
    description: 'User intent, target audience, and source material boundaries.',
  }],
  optionalInputs: [],
  decisionPolicy: 'Model chooses the next allowed action based on available artifacts, rubric, and user intent.',
});

const WORKFLOW_PROFILES: Record<ContentType, WorkflowProfile> = {
  public_article: buildProfile('public_article', [
    'appeal_brief',
    'reader_resonance_check',
    'evidence_bedrock',
    'narrative_outline',
    'draft',
    'voice_pass',
    'wechat_layout_check',
    'truth_check',
    'publication_package',
  ], 'Optimize for 美 > 真 > 像 while respecting evidence boundaries.'),
  prd: buildProfile('prd', [
    'problem_brief',
    'scenario_model',
    'requirement_model',
    'scope_boundary',
    'acceptance_criteria',
    'prd_package',
  ], 'Optimize for 用 > 真 > 清晰, exposing decisions, scope, and acceptance criteria.'),
  technical_doc: buildProfile('technical_doc', [
    'doc_intent',
    'reader_task_map',
    'source_of_truth_map',
    'information_architecture',
    'technical_draft',
    'correctness_checklist',
    'doc_package',
  ], 'Optimize for 准 > 可执行, checking source of truth and examples before final packaging.'),
  general: buildProfile('general', [
    'purpose',
    'audience',
    'material_cleanup',
    'structure_rewrite',
    'clarity_check',
    'final_text',
  ], 'Optimize for 清晰 > 准确 > 有用, stopping once the reader task is satisfied.'),
};

export const getWorkflowProfile = (
  contentType: ContentType,
  _contentSubtype: ContentSubtype,
): WorkflowProfile => {
  return WORKFLOW_PROFILES[contentType];
};

export const listWorkflowProfiles = (): WorkflowProfile[] => Object.values(WORKFLOW_PROFILES);

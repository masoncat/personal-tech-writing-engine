export enum TaskStage {
  Created = 'created',
  CollectingMaterials = 'collecting_materials',
  BedrockReview = 'bedrock_review',
  OutlineReview = 'outline_review',
  DraftReady = 'draft_ready',
  Rewriting = 'rewriting',
  Exported = 'exported',
}

export type MaterialType =
  | 'prompt'
  | 'note'
  | 'repo'
  | 'article'
  | 'draft'
  | 'reference';

export type MaterialSource = 'inline' | 'file' | 'obsidian';
export type ArticleVersionType = 'draft' | 'rewrite';
export type ExportChannel = 'blog' | 'wechat';
export type ExportFormat = 'markdown';
export type ExportTarget = 'local' | 'obsidian';

export interface WritingTask {
  id: string;
  title: string;
  articleType: string;
  preferredChannel: ExportChannel;
  reader: string;
  stage: TaskStage;
  createdAt: string;
  updatedAt: string;
}

export interface Material {
  id: string;
  taskId: string;
  type: MaterialType;
  title: string;
  source: MaterialSource;
  content: string;
  createdAt: string;
  vaultPath?: string;
  relativePath?: string;
  frontmatter?: Record<string, unknown>;
  tags?: string[];
}

export interface InformationBedrock {
  id: string;
  taskId: string;
  theme: string;
  coreQuestion: string;
  arguments: string[];
  evidence: string[];
  uncertainties: string[];
  confirmed: boolean;
}

export interface OutlineSection {
  title: string;
  goal: string;
  evidenceRefs: string[];
}

export interface ArticleOutline {
  id: string;
  taskId: string;
  title: string;
  sections: OutlineSection[];
  confirmed: boolean;
}

export interface StyleProfile {
  id: string;
  taskId: string;
  sourceMaterialIds: string[];
  openingTraits: string[];
  rhythmTraits: string[];
  explanationTraits: string[];
  forbiddenPatterns: string[];
  summary: string;
}

export interface ArticleVersion {
  id: string;
  taskId: string;
  versionType: ArticleVersionType;
  content: string;
  basedOnBedrockId: string;
  basedOnOutlineId: string;
  styleProfileId?: string;
  changeSummary: string;
}

export interface ExportRecord {
  id: string;
  taskId: string;
  versionId: string;
  channel: ExportChannel;
  format: ExportFormat;
  outputPath: string;
  vaultPath?: string;
  relativePath?: string;
}

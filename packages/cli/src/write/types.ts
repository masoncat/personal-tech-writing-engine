import type {
  ArticleOutline,
  ArticleVersion,
  ExportChannel,
  ExportRecord,
  InformationBedrock,
  Material,
  WritingTask,
} from '@ptce/shared';

export type WriteStopAt = 'bedrock' | 'outline' | 'draft' | 'rewrite' | 'export';
export type EditorialMode = 'none' | 'publishable';
export type ModelEnhancementMode = 'off' | 'select-only' | 'standard';

export interface ProjectWriteOptions {
  projectPath: string;
  title: string;
  articleType: string;
  reader: string;
  goal?: string;
  channel: ExportChannel;
  stopAt: WriteStopAt;
  editorialMode: EditorialMode;
  export: boolean;
  exportPath?: string;
  obsidianVaultPath?: string;
  sourcePaths?: string[];
  withGitLog: boolean;
  withObsidianContext: boolean;
  maxMaterials?: number;
  modelEnhancement: ModelEnhancementMode;
}

export type CandidateSourceRole =
  | 'project-definition'
  | 'turning-point'
  | 'engineering-detail'
  | 'style-sample'
  | 'background-only';

export interface CandidateProjectSource {
  id: string;
  kind: 'file' | 'git-log' | 'obsidian-context';
  path: string;
  title: string;
  content: string;
}

export interface SelectedProjectSource {
  id: string;
  kind: CandidateProjectSource['kind'];
  path: string;
  role: CandidateSourceRole;
}

export interface ProjectWriteResult {
  task: WritingTask;
  materials: Material[];
  bedrock: InformationBedrock | null;
  outline: ArticleOutline | null;
  draftVersion: ArticleVersion | null;
  rewriteVersion: ArticleVersion | null;
  exportRecord: ExportRecord | null;
  stopAt: WriteStopAt;
  editorialMode: EditorialMode;
  selectedSources: SelectedProjectSource[];
  skippedSources: SelectedProjectSource[];
  modelActions: string[];
}

export interface TopicWriteOptions {
  topic: string;
  audience: string;
  purpose?: string;
  channel: ExportChannel;
  output: string;
  withRealResearch: boolean;
  withMedia: boolean;
  currentDate: string;
}

export interface TopicWriteResult {
  articlePath: string;
  packageDirectory: string;
  researchPackagePath: string;
  freshnessAuditPath: string;
  evidenceBedrockPath: string;
  visualBriefsPath: string;
  mediaPlanPath: string;
  layoutReportPath: string;
  assetDirectory: string;
}

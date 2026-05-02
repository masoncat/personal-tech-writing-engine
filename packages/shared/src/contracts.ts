import type {
  ArticleOutline,
  ArticleVersion,
  ExportChannel,
  ExportFormat,
  ExportRecord,
  ExportTarget,
  InformationBedrock,
  Material,
  MaterialType,
  WritingTask,
} from './domain.js';

export interface CreateTaskRequest {
  title: string;
  articleType: string;
  preferredChannel?: ExportChannel;
  reader: string;
}

export interface AddMaterialRequest {
  type: MaterialType;
  title: string;
  source: Material['source'];
  content: string;
  vaultPath?: string;
  relativePath?: string;
  frontmatter?: Record<string, unknown>;
  tags?: string[];
}

export interface ImportObsidianRequest {
  vaultPath: string;
  path: string;
}

export interface GenerateRewriteRequest {
  versionId: string;
  instruction: string;
}

interface GenerateExportRequestBase {
  versionId: string;
  channel: ExportChannel;
  format: ExportFormat;
}

interface LocalExportRequest extends GenerateExportRequestBase {
  target?: Extract<ExportTarget, 'local'>;
  outputPath?: string;
  vaultPath?: never;
}

interface ObsidianExportRequest extends GenerateExportRequestBase {
  target: Extract<ExportTarget, 'obsidian'>;
  vaultPath: string;
  outputPath: string;
}

export type GenerateExportRequest = LocalExportRequest | ObsidianExportRequest;

export interface TaskEnvelope {
  task: WritingTask;
}

export interface VersionResponse extends TaskEnvelope {
  version: ArticleVersion;
}

export interface MaterialListResponse extends TaskEnvelope {
  materials: Material[];
}

export interface BedrockResponse extends TaskEnvelope {
  bedrock: InformationBedrock;
}

export interface OutlineResponse extends TaskEnvelope {
  outline: ArticleOutline;
}

export interface VersionsResponse extends TaskEnvelope {
  versions: ArticleVersion[];
}

export interface ExportResponse extends TaskEnvelope {
  exportRecord: ExportRecord;
}

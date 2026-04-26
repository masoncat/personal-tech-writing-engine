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

export interface GenerateExportRequest {
  versionId: string;
  channel: ExportChannel;
  format: ExportFormat;
  target?: ExportTarget;
  vaultPath?: string;
  outputPath?: string;
}

export interface TaskEnvelope {
  task: WritingTask;
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

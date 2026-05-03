export type ProviderMode = 'real' | 'mock';

export type EvidenceStrength = 'candidate' | 'snippet_only' | 'extracted' | 'verified';
export type MediaRole = 'fact_evidence' | 'concept' | 'mood' | 'meme' | 'cover' | 'transition';
export type MediaFitAction = 'use' | 'reject' | 'generate' | 'leave_empty';
export type MediaUsageBoundary = 'fact_image' | 'concept_photo' | 'meme' | 'generated_image' | 'not_usable';
export type MediaAssetKind = 'page_image' | 'unsplash_photo' | 'klipy_meme' | 'memegen_image' | 'generated_image';

export interface WebSearchRequest {
  query: string;
  topic?: 'general' | 'news';
  maxResults?: number;
  timeRange?: 'day' | 'week' | 'month' | 'year';
  startDate?: string;
  endDate?: string;
  includeRawContent?: boolean;
  includeImages?: boolean;
}

export interface WebSearchResult {
  query: string;
  provider: string;
  results: WebSearchItem[];
}

export interface WebSearchItem {
  title: string;
  url: string;
  sourceDomain: string;
  snippet: string;
  publishedAt?: string;
  score?: number;
  rawContent?: string;
  images?: DiscoveredImage[];
  evidenceStrength: EvidenceStrength;
}

export interface DiscoveredImage {
  imageUrl: string;
  sourcePageUrl?: string;
  title?: string;
  alt?: string;
}

export interface PageExtractionRequest {
  url: string;
  html?: string;
}

export interface PageExtractionResult {
  url: string;
  canonicalUrl?: string;
  title?: string;
  author?: string;
  publishedAt?: string;
  extractedAt: string;
  textContent: string;
  evidenceBlocks: EvidenceBlock[];
  images: ExtractedPageImage[];
  warnings: ExtractionWarning[];
}

export interface EvidenceBlock {
  sourceUrl: string;
  text: string;
  selector?: string;
}

export interface ExtractionWarning {
  code: 'empty_body' | 'fetch_failed' | 'blocked' | 'js_only' | 'partial_content';
  message: string;
}

export interface ExtractedPageImage {
  imageUrl: string;
  sourcePageUrl: string;
  alt?: string;
  caption?: string;
  width?: number;
  height?: number;
  nearbyText?: string;
  roleHint: 'hero' | 'inline' | 'logo' | 'avatar' | 'unknown';
}

export interface PhotoSearchRequest {
  query: string;
  maxResults?: number;
  orientation?: 'landscape' | 'portrait' | 'squarish';
}

export interface MemeSearchRequest {
  query: string;
  maxResults?: number;
}

export interface MemeGenerationRequest {
  template: string;
  top: string;
  bottom: string;
  format?: 'jpg' | 'png' | 'webp';
}

export interface ImageGenerationRequest {
  prompt: string;
  model?: string;
  size?: '1024x1024' | '1536x1024' | '1024x1536';
  outputDirectory?: string;
}

export interface MediaNeed {
  id: string;
  articleSectionId?: string;
  context: string;
  intendedRole: MediaRole;
  required: boolean;
  searchQuery: string;
  generationPrompt?: string;
  mustBeRealImage: boolean;
}

export interface MediaFitDecision {
  fitScore: number;
  decision: MediaFitAction;
  reason: string;
  usageBoundary: MediaUsageBoundary;
  requiredDisclosure?: string;
}

export interface MediaAsset {
  id: string;
  kind: MediaAssetKind;
  url?: string;
  localPath?: string;
  title?: string;
  alt?: string;
  caption?: string;
  sourceUrl?: string;
  provider: string;
  author?: string;
  attribution?: string;
  generated: boolean;
  model?: string;
  prompt?: string;
}

export interface MediaCandidate {
  asset: MediaAsset;
  tags: string[];
  providerScore?: number;
}

export interface MediaSelection {
  needId: string;
  decision: MediaFitDecision;
  asset: MediaAsset;
  placementHint?: string;
}

export interface RejectedMediaCandidate {
  needId: string;
  asset: MediaAsset;
  decision: MediaFitDecision;
}

export interface MediaSourceBoundary {
  assetId: string;
  source: string;
  usageBoundary: MediaUsageBoundary;
  disclosure: string;
}

export interface MediaPlan {
  id: string;
  articleTitle: string;
  needs: MediaNeed[];
  selections: MediaSelection[];
  rejectedCandidates: RejectedMediaCandidate[];
  sourceBoundary: MediaSourceBoundary[];
  createdAt: string;
}

export interface ResearchSource {
  title: string;
  url: string;
  sourceDomain: string;
  publishedAt?: string;
  evidenceStrength: EvidenceStrength;
}

export interface ResearchPackage {
  id: string;
  querySet: WebSearchRequest[];
  sources: ResearchSource[];
  evidenceBlocks: EvidenceBlock[];
  unresolvedQuestions: string[];
  warnings: string[];
  createdAt: string;
}

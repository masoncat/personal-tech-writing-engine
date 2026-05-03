# Research Media Tools Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a reusable research and media tooling package that supports Tavily web search, page extraction, Unsplash photo search, KLIPY meme search, memegen meme generation, OpenAI `gpt-image-2` image generation, and PTCE CLI access.

**Architecture:** Add a new workspace package `@ptce/research-media-tools` that owns provider interfaces, mock providers, real provider adapters, media planning, and fit evaluation. The existing `@ptce/cli` imports this package and exposes `ptce tools ...` commands; PTCE content tasks only store generated `research_package` and `media_plan` artifacts through existing artifact APIs.

**Tech Stack:** TypeScript ESM, Node 24 fetch, Commander, Vitest, existing npm workspaces, no runtime dependency on PTCE server state.

---

## File Structure

- Create `packages/research-media-tools/package.json`: package metadata, build/test scripts, dependencies.
- Create `packages/research-media-tools/tsconfig.json`: package TypeScript config.
- Create `packages/research-media-tools/src/index.ts`: public exports.
- Create `packages/research-media-tools/src/types.ts`: shared request/response types.
- Create `packages/research-media-tools/src/errors.ts`: standardized provider and configuration errors.
- Create `packages/research-media-tools/src/providers/mock-provider.ts`: deterministic provider for tests and offline mode.
- Create `packages/research-media-tools/src/providers/tavily-provider.ts`: Tavily search adapter.
- Create `packages/research-media-tools/src/providers/page-extractor.ts`: HTML text and page image extractor.
- Create `packages/research-media-tools/src/providers/unsplash-provider.ts`: Unsplash photo search adapter.
- Create `packages/research-media-tools/src/providers/klipy-provider.ts`: KLIPY meme search adapter.
- Create `packages/research-media-tools/src/providers/memegen-provider.ts`: memegen template and image URL adapter.
- Create `packages/research-media-tools/src/providers/openai-image-provider.ts`: OpenAI image generation adapter for `gpt-image-2`.
- Create `packages/research-media-tools/src/planning/media-need-planner.ts`: deterministic media need planning.
- Create `packages/research-media-tools/src/planning/media-fit-evaluator.ts`: deterministic fit scoring and hard rejection rules.
- Create `packages/research-media-tools/src/planning/media-plan-service.ts`: provider orchestration for media plans.
- Create `packages/research-media-tools/src/research/research-service.ts`: Tavily + extraction orchestration for research packages.
- Create `packages/research-media-tools/tests/*.test.ts`: package tests.
- Modify `vitest.workspace.ts`: include `packages/research-media-tools`.
- Modify `packages/cli/package.json`: depend on `@ptce/research-media-tools`.
- Create `packages/cli/src/commands/tools.ts`: `ptce tools ...` command group.
- Modify `packages/cli/src/index.ts`: register tools commands and inject optional tools service dependency.
- Modify `packages/cli/tests/cli.test.ts`: assert command registration and command behavior.
- Modify `packages/skills/ptce-writing/SKILL.md`: require `research_package` / `media_plan` for public articles where applicable.
- Modify `packages/skills/public-article-writing/SKILL.md`: add research and media source boundary rules.

---

### Task 1: Scaffold `@ptce/research-media-tools`

**Files:**
- Create: `packages/research-media-tools/package.json`
- Create: `packages/research-media-tools/tsconfig.json`
- Create: `packages/research-media-tools/src/index.ts`
- Create: `packages/research-media-tools/src/types.ts`
- Create: `packages/research-media-tools/src/errors.ts`
- Create: `packages/research-media-tools/tests/types.test.ts`
- Modify: `vitest.workspace.ts`

- [ ] **Step 1: Write package metadata**

Create `packages/research-media-tools/package.json`:

```json
{
  "name": "@ptce/research-media-tools",
  "version": "0.1.0",
  "type": "module",
  "main": "dist/src/index.js",
  "types": "dist/src/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/src/index.d.ts",
      "import": "./dist/src/index.js"
    }
  },
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "test": "vitest --run"
  }
}
```

- [ ] **Step 2: Add TypeScript config**

Create `packages/research-media-tools/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": ".",
    "outDir": "dist"
  },
  "include": [
    "src/**/*.ts",
    "tests/**/*.ts"
  ]
}
```

- [ ] **Step 3: Add core error types**

Create `packages/research-media-tools/src/errors.ts`:

```ts
export type ResearchMediaErrorCode =
  | 'missing_provider_config'
  | 'provider_request_failed'
  | 'provider_response_invalid'
  | 'media_fit_rejected';

export class ResearchMediaError extends Error {
  readonly code: ResearchMediaErrorCode;
  readonly details: Record<string, unknown>;

  constructor(
    code: ResearchMediaErrorCode,
    message: string,
    details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = 'ResearchMediaError';
    this.code = code;
    this.details = details;
  }
}
```

- [ ] **Step 4: Add shared public types**

Create `packages/research-media-tools/src/types.ts`:

```ts
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
  model?: 'gpt-image-2';
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
```

- [ ] **Step 5: Export package API**

Create `packages/research-media-tools/src/index.ts`:

```ts
export * from './errors.js';
export * from './types.js';
```

- [ ] **Step 6: Add initial type smoke test**

Create `packages/research-media-tools/tests/types.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import type { MediaFitDecision, WebSearchItem } from '../src/index.js';

describe('research media tool types', () => {
  it('supports snippet-only search candidates and leave-empty media decisions', () => {
    const searchItem: WebSearchItem = {
      title: 'OpenAI announces image model',
      url: 'https://example.com/news',
      sourceDomain: 'example.com',
      snippet: 'Announcement summary',
      evidenceStrength: 'snippet_only',
    };
    const decision: MediaFitDecision = {
      fitScore: 42,
      decision: 'leave_empty',
      reason: 'Candidate image does not support the section context.',
      usageBoundary: 'not_usable',
    };

    expect(searchItem.evidenceStrength).toBe('snippet_only');
    expect(decision.decision).toBe('leave_empty');
  });
});
```

- [ ] **Step 7: Register the package in Vitest workspace**

Modify `vitest.workspace.ts`:

```ts
import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  'packages/shared',
  'packages/mock-server',
  'packages/cli',
  'packages/research-media-tools',
]);
```

- [ ] **Step 8: Run the new package test**

Run: `npm run test --workspace @ptce/research-media-tools`

Expected: PASS with `types.test.ts`.

---

### Task 2: Add deterministic mock provider

**Files:**
- Create: `packages/research-media-tools/src/providers/mock-provider.ts`
- Modify: `packages/research-media-tools/src/index.ts`
- Create: `packages/research-media-tools/tests/mock-provider.test.ts`

- [ ] **Step 1: Write failing tests**

Create `packages/research-media-tools/tests/mock-provider.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { createMockResearchMediaProvider } from '../src/index.js';

describe('mock research media provider', () => {
  it('returns deterministic web results as candidate evidence', async () => {
    const provider = createMockResearchMediaProvider();
    const result = await provider.searchWeb({ query: 'gpt-image-2 launch', topic: 'news' });

    expect(result.provider).toBe('mock');
    expect(result.results[0]).toMatchObject({
      title: 'Mock source for gpt-image-2 launch',
      sourceDomain: 'example.com',
      evidenceStrength: 'candidate',
    });
  });

  it('returns extracted page images with source page context', async () => {
    const provider = createMockResearchMediaProvider();
    const result = await provider.extractPage({ url: 'https://example.com/article' });

    expect(result.textContent).toContain('Mock extracted article body');
    expect(result.images[0]).toMatchObject({
      sourcePageUrl: 'https://example.com/article',
      roleHint: 'hero',
    });
  });
});
```

- [ ] **Step 2: Run tests and verify failure**

Run: `npm run test --workspace @ptce/research-media-tools -- mock-provider.test.ts`

Expected: FAIL because `createMockResearchMediaProvider` is not exported.

- [ ] **Step 3: Implement mock provider**

Create `packages/research-media-tools/src/providers/mock-provider.ts`:

```ts
import type {
  ExtractedPageImage,
  ImageGenerationRequest,
  MediaAsset,
  MemeGenerationRequest,
  MemeSearchRequest,
  PageExtractionRequest,
  PageExtractionResult,
  PhotoSearchRequest,
  WebSearchRequest,
  WebSearchResult,
} from '../types.js';

export interface ResearchMediaProvider {
  searchWeb(request: WebSearchRequest): Promise<WebSearchResult>;
  extractPage(request: PageExtractionRequest): Promise<PageExtractionResult>;
  searchPhotos(request: PhotoSearchRequest): Promise<MediaAsset[]>;
  searchMemes(request: MemeSearchRequest): Promise<MediaAsset[]>;
  generateMeme(request: MemeGenerationRequest): Promise<MediaAsset>;
  generateImage(request: ImageGenerationRequest): Promise<MediaAsset>;
}

export const createMockResearchMediaProvider = (): ResearchMediaProvider => ({
  async searchWeb(request) {
    return {
      query: request.query,
      provider: 'mock',
      results: [
        {
          title: `Mock source for ${request.query}`,
          url: 'https://example.com/article',
          sourceDomain: 'example.com',
          snippet: `Mock snippet for ${request.query}`,
          publishedAt: '2026-05-03T00:00:00.000Z',
          score: 0.91,
          evidenceStrength: 'candidate',
        },
      ],
    };
  },
  async extractPage(request) {
    const image: ExtractedPageImage = {
      imageUrl: 'https://example.com/article-hero.jpg',
      sourcePageUrl: request.url,
      alt: 'Mock article hero image',
      caption: 'Mock caption from article figure',
      nearbyText: 'Mock nearby paragraph context.',
      roleHint: 'hero',
    };

    return {
      url: request.url,
      canonicalUrl: request.url,
      title: 'Mock extracted article',
      author: 'Mock Reporter',
      publishedAt: '2026-05-03T00:00:00.000Z',
      extractedAt: '2026-05-03T00:00:00.000Z',
      textContent: 'Mock extracted article body with enough context to cite.',
      evidenceBlocks: [
        {
          sourceUrl: request.url,
          text: 'Mock extracted article body with enough context to cite.',
        },
      ],
      images: [image],
      warnings: [],
    };
  },
  async searchPhotos(request) {
    return [
      {
        id: `mock-unsplash-${slugify(request.query)}`,
        kind: 'unsplash_photo',
        url: 'https://images.unsplash.com/mock.jpg',
        title: `Mock Unsplash photo for ${request.query}`,
        sourceUrl: 'https://unsplash.com/photos/mock',
        provider: 'unsplash',
        author: 'Mock Photographer',
        attribution: 'Photo by Mock Photographer on Unsplash',
        generated: false,
      },
    ];
  },
  async searchMemes(request) {
    return [
      {
        id: `mock-klipy-${slugify(request.query)}`,
        kind: 'klipy_meme',
        url: 'https://media.klipy.com/mock.gif',
        title: `Mock meme for ${request.query}`,
        sourceUrl: 'https://klipy.com/mock',
        provider: 'klipy',
        attribution: 'Mock KLIPY media',
        generated: false,
      },
    ];
  },
  async generateMeme(request) {
    return {
      id: `mock-memegen-${request.template}`,
      kind: 'memegen_image',
      url: `https://api.memegen.link/images/${request.template}/${encodeSegment(request.top)}/${encodeSegment(request.bottom)}.${request.format ?? 'jpg'}`,
      title: `Generated meme: ${request.template}`,
      provider: 'memegen',
      generated: true,
    };
  },
  async generateImage(request) {
    return {
      id: `mock-generated-${slugify(request.prompt)}`,
      kind: 'generated_image',
      localPath: `${request.outputDirectory ?? 'artifacts/images'}/mock-generated-image.png`,
      title: 'Mock generated image',
      provider: 'openai',
      generated: true,
      model: request.model ?? 'gpt-image-2',
      prompt: request.prompt,
    };
  },
});

const slugify = (value: string): string =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'item';

const encodeSegment = (value: string): string =>
  encodeURIComponent(value.trim().replace(/\s+/g, '-'));
```

- [ ] **Step 4: Export mock provider**

Modify `packages/research-media-tools/src/index.ts`:

```ts
export * from './errors.js';
export * from './types.js';
export * from './providers/mock-provider.js';
```

- [ ] **Step 5: Run tests and verify pass**

Run: `npm run test --workspace @ptce/research-media-tools -- mock-provider.test.ts`

Expected: PASS.

---

### Task 3: Implement media fit evaluation

**Files:**
- Create: `packages/research-media-tools/src/planning/media-fit-evaluator.ts`
- Modify: `packages/research-media-tools/src/index.ts`
- Create: `packages/research-media-tools/tests/media-fit-evaluator.test.ts`

- [ ] **Step 1: Write failing evaluator tests**

Create `packages/research-media-tools/tests/media-fit-evaluator.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { evaluateMediaFit } from '../src/index.js';
import type { MediaAsset, MediaNeed } from '../src/index.js';

const factNeed: MediaNeed = {
  id: 'need-fact',
  context: 'OpenAI released a new image generation model and the section discusses the announcement.',
  intendedRole: 'fact_evidence',
  required: true,
  searchQuery: 'OpenAI image generation announcement',
  mustBeRealImage: true,
};

describe('evaluateMediaFit', () => {
  it('rejects Unsplash photos for fact evidence needs', () => {
    const asset: MediaAsset = {
      id: 'photo-1',
      kind: 'unsplash_photo',
      url: 'https://images.unsplash.com/photo.jpg',
      title: 'Abstract office desk',
      provider: 'unsplash',
      generated: false,
    };

    const decision = evaluateMediaFit({ need: factNeed, asset });

    expect(decision.decision).toBe('reject');
    expect(decision.usageBoundary).toBe('not_usable');
    expect(decision.reason).toContain('cannot support fact evidence');
  });

  it('allows page images for fact evidence when context overlaps', () => {
    const asset: MediaAsset = {
      id: 'page-image-1',
      kind: 'page_image',
      url: 'https://example.com/openai-image.jpg',
      title: 'OpenAI image generation announcement',
      caption: 'OpenAI released a new image generation model.',
      sourceUrl: 'https://example.com/openai-announcement',
      provider: 'page-extractor',
      generated: false,
    };

    const decision = evaluateMediaFit({ need: factNeed, asset });

    expect(decision.decision).toBe('use');
    expect(decision.usageBoundary).toBe('fact_image');
    expect(decision.fitScore).toBeGreaterThanOrEqual(85);
  });

  it('returns leave_empty for generated images that still do not match context', () => {
    const asset: MediaAsset = {
      id: 'generated-1',
      kind: 'generated_image',
      title: 'A generic blue gradient',
      provider: 'openai',
      generated: true,
      model: 'gpt-image-2',
      prompt: 'A generic abstract background',
    };

    const decision = evaluateMediaFit({ need: factNeed, asset, afterGeneration: true });

    expect(decision.decision).toBe('leave_empty');
    expect(decision.requiredDisclosure).toBe('AI generated image; not factual evidence.');
  });
});
```

- [ ] **Step 2: Run tests and verify failure**

Run: `npm run test --workspace @ptce/research-media-tools -- media-fit-evaluator.test.ts`

Expected: FAIL because `evaluateMediaFit` is not exported.

- [ ] **Step 3: Implement evaluator**

Create `packages/research-media-tools/src/planning/media-fit-evaluator.ts`:

```ts
import type {
  MediaAsset,
  MediaFitDecision,
  MediaNeed,
  MediaUsageBoundary,
} from '../types.js';

export interface EvaluateMediaFitInput {
  need: MediaNeed;
  asset: MediaAsset;
  afterGeneration?: boolean;
}

export const evaluateMediaFit = ({
  need,
  asset,
  afterGeneration = false,
}: EvaluateMediaFitInput): MediaFitDecision => {
  if (need.intendedRole === 'fact_evidence' && asset.kind !== 'page_image') {
    return {
      fitScore: 0,
      decision: afterGeneration ? 'leave_empty' : 'reject',
      reason: `${asset.kind} cannot support fact evidence; fact images must come from extracted source pages.`,
      usageBoundary: 'not_usable',
      requiredDisclosure: asset.generated ? 'AI generated image; not factual evidence.' : undefined,
    };
  }

  if (asset.generated && need.mustBeRealImage) {
    return {
      fitScore: 0,
      decision: afterGeneration ? 'leave_empty' : 'reject',
      reason: 'Generated images cannot satisfy a real-image requirement.',
      usageBoundary: 'not_usable',
      requiredDisclosure: 'AI generated image; not factual evidence.',
    };
  }

  const score = scoreSemanticOverlap(need.context, [
    asset.title,
    asset.alt,
    asset.caption,
    asset.prompt,
  ]);
  const boundary = inferBoundary(asset);
  const threshold = need.intendedRole === 'fact_evidence' || need.intendedRole === 'cover' ? 85 : 70;

  if (score < threshold) {
    return {
      fitScore: score,
      decision: afterGeneration ? 'leave_empty' : 'reject',
      reason: `Media candidate score ${score} is below required threshold ${threshold}.`,
      usageBoundary: score > 0 ? boundary : 'not_usable',
      requiredDisclosure: asset.generated ? 'AI generated image.' : undefined,
    };
  }

  return {
    fitScore: score,
    decision: 'use',
    reason: `Media candidate score ${score} meets threshold ${threshold}.`,
    usageBoundary: boundary,
    requiredDisclosure: asset.generated ? 'AI generated image.' : undefined,
  };
};

const inferBoundary = (asset: MediaAsset): MediaUsageBoundary => {
  if (asset.kind === 'page_image') {
    return 'fact_image';
  }
  if (asset.kind === 'unsplash_photo') {
    return 'concept_photo';
  }
  if (asset.kind === 'klipy_meme' || asset.kind === 'memegen_image') {
    return 'meme';
  }
  if (asset.kind === 'generated_image') {
    return 'generated_image';
  }
  return 'not_usable';
};

const scoreSemanticOverlap = (context: string, fields: Array<string | undefined>): number => {
  const contextTokens = tokenize(context);
  const fieldTokens = new Set(fields.flatMap((field) => tokenize(field ?? '')));
  if (contextTokens.length === 0 || fieldTokens.size === 0) {
    return 0;
  }

  const matches = contextTokens.filter((token) => fieldTokens.has(token)).length;
  return Math.min(100, Math.round((matches / Math.min(contextTokens.length, 8)) * 100));
};

const STOPWORDS = new Set([
  'a',
  'an',
  'and',
  'the',
  'to',
  'of',
  'in',
  'on',
  'for',
  'with',
  'is',
  'it',
  'this',
  'that',
  'section',
  'discusses',
]);

const tokenize = (value: string): string[] =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 2 && !STOPWORDS.has(token));
```

- [ ] **Step 4: Export evaluator**

Modify `packages/research-media-tools/src/index.ts`:

```ts
export * from './errors.js';
export * from './types.js';
export * from './providers/mock-provider.js';
export * from './planning/media-fit-evaluator.js';
```

- [ ] **Step 5: Run tests and verify pass**

Run: `npm run test --workspace @ptce/research-media-tools -- media-fit-evaluator.test.ts`

Expected: PASS.

---

### Task 4: Implement media need planning

**Files:**
- Create: `packages/research-media-tools/src/planning/media-need-planner.ts`
- Modify: `packages/research-media-tools/src/index.ts`
- Create: `packages/research-media-tools/tests/media-need-planner.test.ts`

- [ ] **Step 1: Write failing planner tests**

Create `packages/research-media-tools/tests/media-need-planner.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { planMediaNeeds } from '../src/index.js';

describe('planMediaNeeds', () => {
  it('plans fact evidence needs for sections with source-sensitive claims', () => {
    const needs = planMediaNeeds({
      articleTitle: 'OpenAI image generation changes again',
      sections: [
        {
          id: 's1',
          text: 'OpenAI announced gpt-image-2 today, and the product update changes how creators generate images.',
        },
      ],
    });

    expect(needs[0]).toMatchObject({
      articleSectionId: 's1',
      intendedRole: 'fact_evidence',
      mustBeRealImage: true,
    });
  });

  it('does not create image needs for generic filler sections', () => {
    const needs = planMediaNeeds({
      articleTitle: 'A quiet note',
      sections: [
        {
          id: 's1',
          text: 'This section is a short transition between two ideas.',
        },
      ],
    });

    expect(needs).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests and verify failure**

Run: `npm run test --workspace @ptce/research-media-tools -- media-need-planner.test.ts`

Expected: FAIL because `planMediaNeeds` is not exported.

- [ ] **Step 3: Implement planner**

Create `packages/research-media-tools/src/planning/media-need-planner.ts`:

```ts
import type { MediaNeed, MediaRole } from '../types.js';

export interface PlanMediaNeedsInput {
  articleTitle: string;
  sections: Array<{
    id: string;
    text: string;
  }>;
}

export const planMediaNeeds = ({ articleTitle, sections }: PlanMediaNeedsInput): MediaNeed[] =>
  sections.flatMap((section, index) => {
    const role = inferRole(section.text);
    if (!role) {
      return [];
    }

    return [
      {
        id: `media-need-${index + 1}`,
        articleSectionId: section.id,
        context: section.text,
        intendedRole: role,
        required: role === 'fact_evidence' || role === 'cover',
        searchQuery: buildSearchQuery(articleTitle, section.text),
        generationPrompt: buildGenerationPrompt(articleTitle, section.text, role),
        mustBeRealImage: role === 'fact_evidence',
      },
    ];
  });

const inferRole = (text: string): MediaRole | null => {
  const normalized = text.toLowerCase();
  if (/\b(announced|released|launched|report|survey|data|funding|acquired|published)\b/.test(normalized)) {
    return 'fact_evidence';
  }
  if (/\b(meme|joke|吐槽|梗|好笑)\b/u.test(normalized)) {
    return 'meme';
  }
  if (/\b(concept|metaphor|framework|idea|mental model)\b/.test(normalized)) {
    return 'concept';
  }
  return null;
};

const buildSearchQuery = (articleTitle: string, sectionText: string): string =>
  `${articleTitle} ${sectionText}`.split(/\s+/).slice(0, 14).join(' ');

const buildGenerationPrompt = (articleTitle: string, sectionText: string, role: MediaRole): string =>
  [
    `Create a ${role} image for an article titled "${articleTitle}".`,
    `The image must support this context: ${sectionText}`,
    'Avoid implying that generated imagery is a real event photo.',
  ].join(' ');
```

- [ ] **Step 4: Export planner**

Modify `packages/research-media-tools/src/index.ts`:

```ts
export * from './errors.js';
export * from './types.js';
export * from './providers/mock-provider.js';
export * from './planning/media-fit-evaluator.js';
export * from './planning/media-need-planner.js';
```

- [ ] **Step 5: Run tests and verify pass**

Run: `npm run test --workspace @ptce/research-media-tools -- media-need-planner.test.ts`

Expected: PASS.

---

### Task 5: Implement media plan orchestration

**Files:**
- Create: `packages/research-media-tools/src/planning/media-plan-service.ts`
- Modify: `packages/research-media-tools/src/index.ts`
- Create: `packages/research-media-tools/tests/media-plan-service.test.ts`

- [ ] **Step 1: Write failing orchestration tests**

Create `packages/research-media-tools/tests/media-plan-service.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { createMediaPlan, createMockResearchMediaProvider } from '../src/index.js';

describe('createMediaPlan', () => {
  it('uses extracted page images for fact evidence needs', async () => {
    const provider = createMockResearchMediaProvider();
    const plan = await createMediaPlan({
      articleTitle: 'OpenAI image generation changes again',
      sections: [
        {
          id: 's1',
          text: 'Mock extracted article body says OpenAI released an image generation announcement.',
        },
      ],
      provider,
    });

    expect(plan.needs).toHaveLength(1);
    expect(plan.selections[0].asset.kind).toBe('page_image');
    expect(plan.sourceBoundary[0].usageBoundary).toBe('fact_image');
  });

  it('leaves empty when generated fallback still does not fit', async () => {
    const provider = createMockResearchMediaProvider();
    const plan = await createMediaPlan({
      articleTitle: 'OpenAI image generation changes again',
      sections: [
        {
          id: 's1',
          text: 'OpenAI announced a new factual update that requires real event imagery.',
        },
      ],
      provider: {
        ...provider,
        async extractPage(request) {
          return {
            ...(await provider.extractPage(request)),
            images: [],
          };
        },
      },
    });

    expect(plan.selections).toEqual([]);
    expect(plan.rejectedCandidates.some((candidate) => candidate.decision.decision === 'leave_empty')).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests and verify failure**

Run: `npm run test --workspace @ptce/research-media-tools -- media-plan-service.test.ts`

Expected: FAIL because `createMediaPlan` is not exported.

- [ ] **Step 3: Implement media plan service**

Create `packages/research-media-tools/src/planning/media-plan-service.ts`:

```ts
import type { ResearchMediaProvider } from '../providers/mock-provider.js';
import type {
  ExtractedPageImage,
  MediaAsset,
  MediaCandidate,
  MediaPlan,
  MediaSelection,
  RejectedMediaCandidate,
} from '../types.js';
import { evaluateMediaFit } from './media-fit-evaluator.js';
import { planMediaNeeds, type PlanMediaNeedsInput } from './media-need-planner.js';

export interface CreateMediaPlanInput extends PlanMediaNeedsInput {
  provider: ResearchMediaProvider;
  now?: string;
}

export const createMediaPlan = async ({
  articleTitle,
  sections,
  provider,
  now = new Date().toISOString(),
}: CreateMediaPlanInput): Promise<MediaPlan> => {
  const needs = planMediaNeeds({ articleTitle, sections });
  const selections: MediaSelection[] = [];
  const rejectedCandidates: RejectedMediaCandidate[] = [];

  for (const need of needs) {
    const candidates = await collectCandidates(need.searchQuery, need.intendedRole, provider);
    let selected = false;

    for (const candidate of candidates) {
      const decision = evaluateMediaFit({ need, asset: candidate.asset });
      if (decision.decision === 'use') {
        selections.push({
          needId: need.id,
          decision,
          asset: candidate.asset,
          placementHint: need.articleSectionId,
        });
        selected = true;
        break;
      }

      rejectedCandidates.push({
        needId: need.id,
        asset: candidate.asset,
        decision,
      });
    }

    if (!selected && !need.mustBeRealImage && need.generationPrompt) {
      const generated = await provider.generateImage({
        prompt: need.generationPrompt,
        model: 'gpt-image-2',
        outputDirectory: 'artifacts/images',
      });
      const decision = evaluateMediaFit({ need, asset: generated, afterGeneration: true });
      if (decision.decision === 'use') {
        selections.push({
          needId: need.id,
          decision,
          asset: generated,
          placementHint: need.articleSectionId,
        });
      } else {
        rejectedCandidates.push({
          needId: need.id,
          asset: generated,
          decision,
        });
      }
    }
  }

  return {
    id: `media-plan-${stableId(articleTitle)}`,
    articleTitle,
    needs,
    selections,
    rejectedCandidates,
    sourceBoundary: selections.map((selection) => ({
      assetId: selection.asset.id,
      source: selection.asset.sourceUrl ?? selection.asset.url ?? selection.asset.localPath ?? 'unknown',
      usageBoundary: selection.decision.usageBoundary,
      disclosure: selection.decision.requiredDisclosure ?? selection.asset.attribution ?? 'Source metadata retained in media plan.',
    })),
    createdAt: now,
  };
};

const collectCandidates = async (
  query: string,
  role: string,
  provider: ResearchMediaProvider,
): Promise<MediaCandidate[]> => {
  if (role === 'fact_evidence') {
    const search = await provider.searchWeb({ query, topic: 'news', maxResults: 3, includeImages: true });
    const pageImages: MediaAsset[] = [];
    for (const result of search.results.slice(0, 2)) {
      const extracted = await provider.extractPage({ url: result.url });
      pageImages.push(...extracted.images.map(toPageImageAsset));
    }
    return pageImages.map((asset) => ({ asset, tags: ['fact', 'page-image'] }));
  }

  if (role === 'meme') {
    return (await provider.searchMemes({ query, maxResults: 5 })).map((asset) => ({ asset, tags: ['meme'] }));
  }

  return (await provider.searchPhotos({ query, maxResults: 5 })).map((asset) => ({ asset, tags: ['photo'] }));
};

const toPageImageAsset = (image: ExtractedPageImage): MediaAsset => ({
  id: `page-image-${stableId(`${image.sourcePageUrl}-${image.imageUrl}`)}`,
  kind: 'page_image',
  url: image.imageUrl,
  title: image.alt,
  alt: image.alt,
  caption: image.caption,
  sourceUrl: image.sourcePageUrl,
  provider: 'page-extractor',
  generated: false,
});

const stableId = (value: string): string =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 48) || 'item';
```

- [ ] **Step 4: Export service**

Modify `packages/research-media-tools/src/index.ts`:

```ts
export * from './errors.js';
export * from './types.js';
export * from './providers/mock-provider.js';
export * from './planning/media-fit-evaluator.js';
export * from './planning/media-need-planner.js';
export * from './planning/media-plan-service.js';
```

- [ ] **Step 5: Run tests and verify pass**

Run: `npm run test --workspace @ptce/research-media-tools -- media-plan-service.test.ts`

Expected: PASS.

---

### Task 6: Implement research package orchestration

**Files:**
- Create: `packages/research-media-tools/src/research/research-service.ts`
- Modify: `packages/research-media-tools/src/index.ts`
- Create: `packages/research-media-tools/tests/research-service.test.ts`

- [ ] **Step 1: Write failing research tests**

Create `packages/research-media-tools/tests/research-service.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { createMockResearchMediaProvider, createResearchPackage } from '../src/index.js';

describe('createResearchPackage', () => {
  it('extracts candidate pages before treating evidence as extracted', async () => {
    const provider = createMockResearchMediaProvider();
    const pkg = await createResearchPackage({
      queries: [{ query: 'gpt-image-2 launch', topic: 'news' }],
      provider,
      now: '2026-05-03T00:00:00.000Z',
    });

    expect(pkg.querySet).toHaveLength(1);
    expect(pkg.sources[0].evidenceStrength).toBe('extracted');
    expect(pkg.evidenceBlocks[0].text).toContain('Mock extracted article body');
  });

  it('marks snippet-only when extraction has no body', async () => {
    const provider = createMockResearchMediaProvider();
    const pkg = await createResearchPackage({
      queries: [{ query: 'blocked source', topic: 'news' }],
      provider: {
        ...provider,
        async extractPage(request) {
          return {
            ...(await provider.extractPage(request)),
            textContent: '',
            evidenceBlocks: [],
            warnings: [{ code: 'empty_body', message: 'No readable body found.' }],
          };
        },
      },
      now: '2026-05-03T00:00:00.000Z',
    });

    expect(pkg.sources[0].evidenceStrength).toBe('snippet_only');
    expect(pkg.warnings[0]).toContain('No readable body found');
  });
});
```

- [ ] **Step 2: Run tests and verify failure**

Run: `npm run test --workspace @ptce/research-media-tools -- research-service.test.ts`

Expected: FAIL because `createResearchPackage` is not exported.

- [ ] **Step 3: Implement research service**

Create `packages/research-media-tools/src/research/research-service.ts`:

```ts
import type { ResearchMediaProvider } from '../providers/mock-provider.js';
import type {
  EvidenceBlock,
  ResearchPackage,
  ResearchSource,
  WebSearchRequest,
} from '../types.js';

export interface CreateResearchPackageInput {
  queries: WebSearchRequest[];
  provider: ResearchMediaProvider;
  now?: string;
}

export const createResearchPackage = async ({
  queries,
  provider,
  now = new Date().toISOString(),
}: CreateResearchPackageInput): Promise<ResearchPackage> => {
  const sources: ResearchSource[] = [];
  const evidenceBlocks: EvidenceBlock[] = [];
  const warnings: string[] = [];

  for (const query of queries) {
    const search = await provider.searchWeb(query);
    for (const item of search.results) {
      const extracted = await provider.extractPage({ url: item.url });
      const isExtracted = extracted.textContent.trim().length > 0 && extracted.evidenceBlocks.length > 0;

      sources.push({
        title: extracted.title ?? item.title,
        url: extracted.canonicalUrl ?? item.url,
        sourceDomain: item.sourceDomain,
        publishedAt: extracted.publishedAt ?? item.publishedAt,
        evidenceStrength: isExtracted ? 'extracted' : 'snippet_only',
      });

      evidenceBlocks.push(...extracted.evidenceBlocks);
      warnings.push(...extracted.warnings.map((warning) => `${item.url}: ${warning.message}`));
    }
  }

  return {
    id: `research-package-${stableId(queries.map((query) => query.query).join('-'))}`,
    querySet: queries,
    sources,
    evidenceBlocks,
    unresolvedQuestions: evidenceBlocks.length === 0 ? ['No extracted evidence blocks were available.'] : [],
    warnings,
    createdAt: now,
  };
};

const stableId = (value: string): string =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 48) || 'item';
```

- [ ] **Step 4: Export research service**

Modify `packages/research-media-tools/src/index.ts`:

```ts
export * from './errors.js';
export * from './types.js';
export * from './providers/mock-provider.js';
export * from './planning/media-fit-evaluator.js';
export * from './planning/media-need-planner.js';
export * from './planning/media-plan-service.js';
export * from './research/research-service.js';
```

- [ ] **Step 5: Run tests and verify pass**

Run: `npm run test --workspace @ptce/research-media-tools -- research-service.test.ts`

Expected: PASS.

---

### Task 7: Implement real provider adapters

**Files:**
- Create: `packages/research-media-tools/src/providers/tavily-provider.ts`
- Create: `packages/research-media-tools/src/providers/page-extractor.ts`
- Create: `packages/research-media-tools/src/providers/unsplash-provider.ts`
- Create: `packages/research-media-tools/src/providers/klipy-provider.ts`
- Create: `packages/research-media-tools/src/providers/memegen-provider.ts`
- Create: `packages/research-media-tools/src/providers/openai-image-provider.ts`
- Create: `packages/research-media-tools/src/providers/real-provider.ts`
- Modify: `packages/research-media-tools/src/index.ts`
- Create: `packages/research-media-tools/tests/real-providers.test.ts`

- [ ] **Step 1: Write adapter tests with mocked fetch**

Create `packages/research-media-tools/tests/real-providers.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';

import {
  createMemegenProvider,
  createOpenAIImageProvider,
  createPageExtractor,
  createTavilyProvider,
  createUnsplashProvider,
  ResearchMediaError,
} from '../src/index.js';

describe('real provider adapters', () => {
  it('throws configuration errors when required keys are missing', async () => {
    const provider = createTavilyProvider({ apiKey: '', fetchFn: vi.fn() as unknown as typeof fetch });

    await expect(provider.searchWeb({ query: 'test' })).rejects.toBeInstanceOf(ResearchMediaError);
  });

  it('maps Tavily search responses into normalized web results', async () => {
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse({
      results: [
        {
          title: 'Source title',
          url: 'https://example.com/post',
          content: 'Search snippet',
          published_date: '2026-05-03',
          score: 0.8,
        },
      ],
    }));
    const provider = createTavilyProvider({ apiKey: 'tavily-key', fetchFn });

    const result = await provider.searchWeb({ query: 'latest ai news', topic: 'news' });

    expect(fetchFn).toHaveBeenCalledWith('https://api.tavily.com/search', expect.objectContaining({ method: 'POST' }));
    expect(result.results[0]).toMatchObject({
      sourceDomain: 'example.com',
      evidenceStrength: 'candidate',
    });
  });

  it('extracts title, article body, and page images from static html', async () => {
    const extractor = createPageExtractor({
      fetchFn: vi.fn().mockResolvedValue(textResponse('<html><head><title>Article title</title><meta property="article:published_time" content="2026-05-03"></head><body><article><p>First paragraph.</p><figure><img src="/hero.jpg" alt="Hero"><figcaption>Hero caption</figcaption></figure></article></body></html>')) as unknown as typeof fetch,
    });

    const result = await extractor.extractPage({ url: 'https://example.com/post' });

    expect(result.title).toBe('Article title');
    expect(result.textContent).toContain('First paragraph.');
    expect(result.images[0]).toMatchObject({
      imageUrl: 'https://example.com/hero.jpg',
      caption: 'Hero caption',
    });
  });

  it('maps Unsplash responses and keeps attribution metadata', async () => {
    const provider = createUnsplashProvider({
      accessKey: 'unsplash-key',
      fetchFn: vi.fn().mockResolvedValue(jsonResponse({
        results: [
          {
            id: 'photo1',
            description: 'Desk photo',
            alt_description: 'A desk',
            urls: { regular: 'https://images.unsplash.com/photo.jpg' },
            links: { html: 'https://unsplash.com/photos/photo1', download_location: 'https://api.unsplash.com/photos/photo1/download' },
            user: { name: 'Photographer', links: { html: 'https://unsplash.com/@photographer' } },
          },
        ],
      })) as unknown as typeof fetch,
    });

    const assets = await provider.searchPhotos({ query: 'desk' });

    expect(assets[0]).toMatchObject({
      kind: 'unsplash_photo',
      provider: 'unsplash',
      author: 'Photographer',
      attribution: 'Photo by Photographer on Unsplash',
    });
  });

  it('builds memegen image URLs without network calls', async () => {
    const provider = createMemegenProvider();
    const asset = await provider.generateMeme({ template: 'drake', top: 'old way', bottom: 'new way' });

    expect(asset.url).toBe('https://api.memegen.link/images/drake/old-way/new-way.jpg');
  });

  it('calls OpenAI image generation with gpt-image-2', async () => {
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse({
      data: [{ b64_json: Buffer.from('mock image').toString('base64') }],
    }));
    const provider = createOpenAIImageProvider({ apiKey: 'openai-key', fetchFn, writeFile: vi.fn().mockResolvedValue(undefined) });

    const asset = await provider.generateImage({ prompt: 'A focused concept image', outputDirectory: 'artifacts/images' });

    expect(fetchFn).toHaveBeenCalledWith('https://api.openai.com/v1/images/generations', expect.objectContaining({ method: 'POST' }));
    expect(asset).toMatchObject({
      kind: 'generated_image',
      provider: 'openai',
      model: 'gpt-image-2',
      generated: true,
    });
  });
});

const jsonResponse = (body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });

const textResponse = (body: string): Response =>
  new Response(body, {
    status: 200,
    headers: { 'content-type': 'text/html' },
  });
```

- [ ] **Step 2: Run tests and verify failure**

Run: `npm run test --workspace @ptce/research-media-tools -- real-providers.test.ts`

Expected: FAIL because real provider factories are not exported.

- [ ] **Step 3: Implement Tavily provider**

Create `packages/research-media-tools/src/providers/tavily-provider.ts`:

```ts
import { ResearchMediaError } from '../errors.js';
import type { WebSearchRequest, WebSearchResult } from '../types.js';

interface TavilyProviderOptions {
  apiKey: string;
  fetchFn?: typeof fetch;
}

interface TavilySearchResponse {
  results?: Array<{
    title?: string;
    url?: string;
    content?: string;
    raw_content?: string;
    published_date?: string;
    score?: number;
  }>;
}

export const createTavilyProvider = ({ apiKey, fetchFn = fetch }: TavilyProviderOptions) => ({
  async searchWeb(request: WebSearchRequest): Promise<WebSearchResult> {
    if (!apiKey) {
      throw new ResearchMediaError('missing_provider_config', 'TAVILY_API_KEY is required.');
    }

    const response = await fetchFn('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        query: request.query,
        topic: request.topic ?? 'general',
        max_results: request.maxResults ?? 5,
        time_range: request.timeRange,
        start_date: request.startDate,
        end_date: request.endDate,
        include_raw_content: request.includeRawContent ?? false,
        include_images: request.includeImages ?? false,
      }),
    });

    if (!response.ok) {
      throw new ResearchMediaError('provider_request_failed', 'Tavily search request failed.', { status: response.status });
    }

    const payload = await response.json() as TavilySearchResponse;
    return {
      query: request.query,
      provider: 'tavily',
      results: (payload.results ?? []).flatMap((item) => {
        if (!item.url) {
          return [];
        }
        const url = new URL(item.url);
        return [{
          title: item.title ?? item.url,
          url: item.url,
          sourceDomain: url.hostname,
          snippet: item.content ?? '',
          publishedAt: item.published_date,
          score: item.score,
          rawContent: item.raw_content,
          evidenceStrength: 'candidate' as const,
        }];
      }),
    };
  },
});
```

- [ ] **Step 4: Implement page extractor**

Create `packages/research-media-tools/src/providers/page-extractor.ts`:

```ts
import { ResearchMediaError } from '../errors.js';
import type { PageExtractionRequest, PageExtractionResult } from '../types.js';

interface PageExtractorOptions {
  fetchFn?: typeof fetch;
}

export const createPageExtractor = ({ fetchFn = fetch }: PageExtractorOptions = {}) => ({
  async extractPage(request: PageExtractionRequest): Promise<PageExtractionResult> {
    const html = request.html ?? await fetchHtml(request.url, fetchFn);
    const title = firstMatch(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
    const publishedAt =
      metaContent(html, 'article:published_time') ??
      metaContent(html, 'date') ??
      metaContent(html, 'pubdate');
    const canonicalUrl = linkHref(html, 'canonical') ?? request.url;
    const bodyHtml = firstMatch(html, /<article[^>]*>([\s\S]*?)<\/article>/i) ?? firstMatch(html, /<body[^>]*>([\s\S]*?)<\/body>/i) ?? html;
    const paragraphs = Array.from(bodyHtml.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)).map((match) => cleanText(match[1]));
    const textContent = paragraphs.filter(Boolean).join('\n\n');
    const images = Array.from(bodyHtml.matchAll(/<figure[^>]*>[\s\S]*?<img[^>]+src=["']([^"']+)["'][^>]*>[\s\S]*?(?:<figcaption[^>]*>([\s\S]*?)<\/figcaption>)?[\s\S]*?<\/figure>|<img[^>]+src=["']([^"']+)["'][^>]*>/gi)).map((match) => {
      const src = match[1] ?? match[3];
      const figureHtml = match[0];
      const alt = firstMatch(figureHtml, /alt=["']([^"']+)["']/i);
      const caption = match[2] ? cleanText(match[2]) : undefined;
      return {
        imageUrl: new URL(src, request.url).href,
        sourcePageUrl: canonicalUrl,
        alt,
        caption,
        roleHint: 'inline' as const,
      };
    });

    if (images[0]) {
      images[0].roleHint = 'hero';
    }

    return {
      url: request.url,
      canonicalUrl,
      title: title ? cleanText(title) : undefined,
      publishedAt,
      extractedAt: new Date().toISOString(),
      textContent,
      evidenceBlocks: textContent
        ? [{ sourceUrl: canonicalUrl, text: textContent.slice(0, 1200) }]
        : [],
      images,
      warnings: textContent ? [] : [{ code: 'empty_body', message: 'No readable body found.' }],
    };
  },
});

const fetchHtml = async (url: string, fetchFn: typeof fetch): Promise<string> => {
  const response = await fetchFn(url);
  if (!response.ok) {
    throw new ResearchMediaError('provider_request_failed', 'Page fetch failed.', { url, status: response.status });
  }
  return response.text();
};

const firstMatch = (value: string, pattern: RegExp): string | undefined => pattern.exec(value)?.[1];

const metaContent = (html: string, name: string): string | undefined =>
  firstMatch(html, new RegExp(`<meta[^>]+(?:property|name)=["']${escapeRegExp(name)}["'][^>]+content=["']([^"']+)["'][^>]*>`, 'i'));

const linkHref = (html: string, rel: string): string | undefined =>
  firstMatch(html, new RegExp(`<link[^>]+rel=["']${escapeRegExp(rel)}["'][^>]+href=["']([^"']+)["'][^>]*>`, 'i'));

const cleanText = (value: string): string =>
  value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
```

- [ ] **Step 5: Implement Unsplash provider**

Create `packages/research-media-tools/src/providers/unsplash-provider.ts`:

```ts
import { ResearchMediaError } from '../errors.js';
import type { MediaAsset, PhotoSearchRequest } from '../types.js';

interface UnsplashProviderOptions {
  accessKey: string;
  fetchFn?: typeof fetch;
}

interface UnsplashResponse {
  results?: Array<{
    id: string;
    description?: string;
    alt_description?: string;
    urls?: { regular?: string };
    links?: { html?: string; download_location?: string };
    user?: { name?: string; links?: { html?: string } };
  }>;
}

export const createUnsplashProvider = ({ accessKey, fetchFn = fetch }: UnsplashProviderOptions) => ({
  async searchPhotos(request: PhotoSearchRequest): Promise<MediaAsset[]> {
    if (!accessKey) {
      throw new ResearchMediaError('missing_provider_config', 'UNSPLASH_ACCESS_KEY is required.');
    }

    const url = new URL('https://api.unsplash.com/search/photos');
    url.searchParams.set('query', request.query);
    url.searchParams.set('per_page', String(request.maxResults ?? 5));
    if (request.orientation) {
      url.searchParams.set('orientation', request.orientation);
    }

    const response = await fetchFn(url.href, {
      headers: { authorization: `Client-ID ${accessKey}` },
    });
    if (!response.ok) {
      throw new ResearchMediaError('provider_request_failed', 'Unsplash search request failed.', { status: response.status });
    }

    const payload = await response.json() as UnsplashResponse;
    return (payload.results ?? []).map((photo) => ({
      id: `unsplash-${photo.id}`,
      kind: 'unsplash_photo',
      url: photo.urls?.regular,
      title: photo.description ?? photo.alt_description,
      alt: photo.alt_description,
      sourceUrl: photo.links?.html,
      provider: 'unsplash',
      author: photo.user?.name,
      attribution: `Photo by ${photo.user?.name ?? 'Unknown photographer'} on Unsplash`,
      generated: false,
    }));
  },
});
```

- [ ] **Step 6: Implement KLIPY provider**

Create `packages/research-media-tools/src/providers/klipy-provider.ts`:

```ts
import { ResearchMediaError } from '../errors.js';
import type { MediaAsset, MemeSearchRequest } from '../types.js';

interface KlipyProviderOptions {
  apiKey: string;
  fetchFn?: typeof fetch;
  baseUrl?: string;
}

interface KlipyResponse {
  data?: Array<{
    id?: string;
    title?: string;
    url?: string;
    source_url?: string;
    preview?: string;
  }>;
}

export const createKlipyProvider = ({
  apiKey,
  fetchFn = fetch,
  baseUrl = 'https://api.klipy.com/api/v1',
}: KlipyProviderOptions) => ({
  async searchMemes(request: MemeSearchRequest): Promise<MediaAsset[]> {
    if (!apiKey) {
      throw new ResearchMediaError('missing_provider_config', 'KLIPY_API_KEY is required.');
    }

    const url = new URL(`${baseUrl}/memes/search`);
    url.searchParams.set('q', request.query);
    url.searchParams.set('limit', String(request.maxResults ?? 5));

    const response = await fetchFn(url.href, {
      headers: { authorization: `Bearer ${apiKey}` },
    });
    if (!response.ok) {
      throw new ResearchMediaError('provider_request_failed', 'KLIPY meme search request failed.', { status: response.status });
    }

    const payload = await response.json() as KlipyResponse;
    return (payload.data ?? []).map((item, index) => ({
      id: `klipy-${item.id ?? index}`,
      kind: 'klipy_meme',
      url: item.url ?? item.preview,
      title: item.title,
      sourceUrl: item.source_url,
      provider: 'klipy',
      attribution: 'Media from KLIPY',
      generated: false,
    }));
  },
});
```

- [ ] **Step 7: Implement memegen provider**

Create `packages/research-media-tools/src/providers/memegen-provider.ts`:

```ts
import type { MediaAsset, MemeGenerationRequest } from '../types.js';

export const createMemegenProvider = () => ({
  async generateMeme(request: MemeGenerationRequest): Promise<MediaAsset> {
    const format = request.format ?? 'jpg';
    return {
      id: `memegen-${request.template}-${slug(request.top)}-${slug(request.bottom)}`,
      kind: 'memegen_image',
      url: `https://api.memegen.link/images/${request.template}/${slug(request.top)}/${slug(request.bottom)}.${format}`,
      title: `Generated meme from ${request.template}`,
      sourceUrl: 'https://api.memegen.link/',
      provider: 'memegen',
      generated: true,
    };
  },
});

const slug = (value: string): string =>
  encodeURIComponent(value.trim().replace(/\s+/g, '-'));
```

- [ ] **Step 8: Implement OpenAI image provider**

Create `packages/research-media-tools/src/providers/openai-image-provider.ts`:

```ts
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

import { ResearchMediaError } from '../errors.js';
import type { ImageGenerationRequest, MediaAsset } from '../types.js';

interface OpenAIImageProviderOptions {
  apiKey: string;
  fetchFn?: typeof fetch;
  writeFile?: (path: string, data: Uint8Array) => Promise<void>;
}

interface OpenAIImageResponse {
  data?: Array<{ b64_json?: string }>;
}

export const createOpenAIImageProvider = ({
  apiKey,
  fetchFn = fetch,
  writeFile = defaultWriteFile,
}: OpenAIImageProviderOptions) => ({
  async generateImage(request: ImageGenerationRequest): Promise<MediaAsset> {
    if (!apiKey) {
      throw new ResearchMediaError('missing_provider_config', 'OPENAI_API_KEY is required.');
    }

    const model = request.model ?? 'gpt-image-2';
    const response = await fetchFn('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        prompt: request.prompt,
        size: request.size ?? '1024x1024',
        response_format: 'b64_json',
      }),
    });

    if (!response.ok) {
      throw new ResearchMediaError('provider_request_failed', 'OpenAI image generation request failed.', { status: response.status });
    }

    const payload = await response.json() as OpenAIImageResponse;
    const base64 = payload.data?.[0]?.b64_json;
    if (!base64) {
      throw new ResearchMediaError('provider_response_invalid', 'OpenAI image response did not include b64_json.');
    }

    const directory = request.outputDirectory ?? 'artifacts/images';
    await mkdir(directory, { recursive: true });
    const localPath = join(directory, `${randomUUID()}.png`);
    await writeFile(localPath, Buffer.from(base64, 'base64'));

    return {
      id: `openai-image-${randomUUID()}`,
      kind: 'generated_image',
      localPath,
      provider: 'openai',
      generated: true,
      model,
      prompt: request.prompt,
    };
  },
});

const defaultWriteFile = async (path: string, data: Uint8Array): Promise<void> => {
  const fs = await import('node:fs/promises');
  await fs.writeFile(path, data);
};
```

- [ ] **Step 9: Implement combined real provider**

Create `packages/research-media-tools/src/providers/real-provider.ts`:

```ts
import type { ResearchMediaProvider } from './mock-provider.js';
import { createKlipyProvider } from './klipy-provider.js';
import { createMemegenProvider } from './memegen-provider.js';
import { createOpenAIImageProvider } from './openai-image-provider.js';
import { createPageExtractor } from './page-extractor.js';
import { createTavilyProvider } from './tavily-provider.js';
import { createUnsplashProvider } from './unsplash-provider.js';

export interface RealProviderConfig {
  tavilyApiKey: string;
  unsplashAccessKey: string;
  klipyApiKey: string;
  openaiApiKey: string;
  fetchFn?: typeof fetch;
}

export const createRealResearchMediaProvider = (config: RealProviderConfig): ResearchMediaProvider => {
  const tavily = createTavilyProvider({ apiKey: config.tavilyApiKey, fetchFn: config.fetchFn });
  const extractor = createPageExtractor({ fetchFn: config.fetchFn });
  const unsplash = createUnsplashProvider({ accessKey: config.unsplashAccessKey, fetchFn: config.fetchFn });
  const klipy = createKlipyProvider({ apiKey: config.klipyApiKey, fetchFn: config.fetchFn });
  const memegen = createMemegenProvider();
  const openai = createOpenAIImageProvider({ apiKey: config.openaiApiKey, fetchFn: config.fetchFn });

  return {
    searchWeb: tavily.searchWeb,
    extractPage: extractor.extractPage,
    searchPhotos: unsplash.searchPhotos,
    searchMemes: klipy.searchMemes,
    generateMeme: memegen.generateMeme,
    generateImage: openai.generateImage,
  };
};
```

- [ ] **Step 10: Export real providers**

Modify `packages/research-media-tools/src/index.ts`:

```ts
export * from './errors.js';
export * from './types.js';
export * from './providers/mock-provider.js';
export * from './providers/tavily-provider.js';
export * from './providers/page-extractor.js';
export * from './providers/unsplash-provider.js';
export * from './providers/klipy-provider.js';
export * from './providers/memegen-provider.js';
export * from './providers/openai-image-provider.js';
export * from './providers/real-provider.js';
export * from './planning/media-fit-evaluator.js';
export * from './planning/media-need-planner.js';
export * from './planning/media-plan-service.js';
export * from './research/research-service.js';
```

- [ ] **Step 11: Run tests and verify pass**

Run: `npm run test --workspace @ptce/research-media-tools -- real-providers.test.ts`

Expected: PASS.

---

### Task 8: Add `ptce tools` CLI commands

**Files:**
- Modify: `packages/cli/package.json`
- Create: `packages/cli/src/commands/tools.ts`
- Modify: `packages/cli/src/index.ts`
- Modify: `packages/cli/tests/cli.test.ts`

- [ ] **Step 1: Add dependency**

Modify `packages/cli/package.json` dependencies:

```json
"dependencies": {
  "@ptce/research-media-tools": "0.1.0",
  "@ptce/shared": "0.1.0",
  "commander": "^14.0.0",
  "zod": "^3.24.3"
}
```

- [ ] **Step 2: Write failing CLI tests**

Append to `packages/cli/tests/cli.test.ts`:

```ts
it('registers the tools command group', () => {
  const program = buildProgram();
  const commandNames = program.commands.map((command) => command.name());

  expect(commandNames).toContain('tools');
  expect(program.commands.find((command) => command.name() === 'tools')?.commands.map((command) => command.name())).toEqual([
    'search',
    'page',
    'meme',
    'image',
    'media',
  ]);
});

it('runs tools search web with an injected tools provider', async () => {
  const stdout = createCaptureStream();
  const toolsProvider = {
    async searchWeb() {
      return {
        query: 'latest ai news',
        provider: 'mock',
        results: [],
      };
    },
  };
  const program = buildProgram({ stdout, createToolsProvider: () => toolsProvider });

  await program.parseAsync([
    'node',
    'ptce',
    'tools',
    'search',
    'web',
    '--query',
    'latest ai news',
    '--render',
    'json',
  ]);

  expect(JSON.parse(stdout.output)).toEqual({
    query: 'latest ai news',
    provider: 'mock',
    results: [],
  });
});
```

- [ ] **Step 3: Run tests and verify failure**

Run: `npm run test --workspace @ptce/cli -- cli.test.ts`

Expected: FAIL because `tools` is not registered and `createToolsProvider` is not part of `BuildProgramDependencies`.

- [ ] **Step 4: Implement tools command**

Create `packages/cli/src/commands/tools.ts`:

```ts
import { Command } from 'commander';

import {
  createMediaPlan,
  createMockResearchMediaProvider,
  createRealResearchMediaProvider,
  createResearchPackage,
  type ResearchMediaProvider,
} from '@ptce/research-media-tools';

import {
  OUTPUT_FORMATS,
  createChoiceParser,
  type OutputFormat,
  type Writer,
  writeRenderedOutput,
} from '../output/renderers.js';

interface ToolsCommandDependencies {
  createToolsProvider: () => Partial<ResearchMediaProvider>;
  stdout: Writer;
}

interface CommonOptions {
  render: OutputFormat;
}

export const createDefaultToolsProvider = (): ResearchMediaProvider => {
  if (process.env.PTCE_TOOLS_PROVIDER_MODE === 'mock') {
    return createMockResearchMediaProvider();
  }

  return createRealResearchMediaProvider({
    tavilyApiKey: process.env.TAVILY_API_KEY ?? '',
    unsplashAccessKey: process.env.UNSPLASH_ACCESS_KEY ?? '',
    klipyApiKey: process.env.KLIPY_API_KEY ?? '',
    openaiApiKey: process.env.OPENAI_API_KEY ?? '',
  });
};

export const registerToolsCommands = (
  program: Command,
  { createToolsProvider, stdout }: ToolsCommandDependencies,
): void => {
  const tools = program.command('tools').description('Search, extract, and plan research media');
  const search = tools.command('search').description('Search web, photos, and memes');

  withCommonOptions(
    search
      .command('web')
      .description('Search web sources')
      .requiredOption('--query <query>', 'Search query')
      .option('--topic <topic>', 'Search topic', 'general')
      .action(async (options: CommonOptions & { query: string; topic: 'general' | 'news' }) => {
        const provider = createToolsProvider();
        const result = await requireMethod(provider.searchWeb, 'searchWeb')({
          query: options.query,
          topic: options.topic,
        });
        writeRenderedOutput(stdout, result, options.render);
      }),
  );

  withCommonOptions(
    search
      .command('photo')
      .description('Search Unsplash photos')
      .requiredOption('--query <query>', 'Search query')
      .action(async (options: CommonOptions & { query: string }) => {
        const provider = createToolsProvider();
        const result = await requireMethod(provider.searchPhotos, 'searchPhotos')({ query: options.query });
        writeRenderedOutput(stdout, result, options.render);
      }),
  );

  withCommonOptions(
    search
      .command('meme')
      .description('Search KLIPY memes')
      .requiredOption('--query <query>', 'Search query')
      .action(async (options: CommonOptions & { query: string }) => {
        const provider = createToolsProvider();
        const result = await requireMethod(provider.searchMemes, 'searchMemes')({ query: options.query });
        writeRenderedOutput(stdout, result, options.render);
      }),
  );

  withCommonOptions(
    tools
      .command('page')
      .description('Extract a web page')
      .command('extract')
      .requiredOption('--url <url>', 'Page URL')
      .action(async (options: CommonOptions & { url: string }) => {
        const provider = createToolsProvider();
        const result = await requireMethod(provider.extractPage, 'extractPage')({ url: options.url });
        writeRenderedOutput(stdout, result, options.render);
      }),
  );

  withCommonOptions(
    tools
      .command('meme')
      .description('Generate memes')
      .command('generate')
      .requiredOption('--template <template>', 'memegen template')
      .requiredOption('--top <text>', 'Top text')
      .requiredOption('--bottom <text>', 'Bottom text')
      .action(async (options: CommonOptions & { template: string; top: string; bottom: string }) => {
        const provider = createToolsProvider();
        const result = await requireMethod(provider.generateMeme, 'generateMeme')({
          template: options.template,
          top: options.top,
          bottom: options.bottom,
        });
        writeRenderedOutput(stdout, result, options.render);
      }),
  );

  withCommonOptions(
    tools
      .command('image')
      .description('Generate images')
      .command('generate')
      .requiredOption('--prompt <prompt>', 'Image prompt')
      .option('--model <model>', 'Image model', 'gpt-image-2')
      .action(async (options: CommonOptions & { prompt: string; model: 'gpt-image-2' }) => {
        const provider = createToolsProvider();
        const result = await requireMethod(provider.generateImage, 'generateImage')({
          prompt: options.prompt,
          model: options.model,
        });
        writeRenderedOutput(stdout, result, options.render);
      }),
  );

  withCommonOptions(
    tools
      .command('media')
      .description('Plan article media')
      .command('plan')
      .requiredOption('--title <title>', 'Article title')
      .requiredOption('--section <section>', 'Article section text')
      .action(async (options: CommonOptions & { title: string; section: string }) => {
        const provider = createToolsProvider() as ResearchMediaProvider;
        const result = await createMediaPlan({
          articleTitle: options.title,
          sections: [{ id: 'section-1', text: options.section }],
          provider,
        });
        writeRenderedOutput(stdout, result, options.render);
      }),
  );

  withCommonOptions(
    tools
      .command('research')
      .description('Create a research package')
      .requiredOption('--query <query>', 'Research query')
      .action(async (options: CommonOptions & { query: string }) => {
        const provider = createToolsProvider() as ResearchMediaProvider;
        const result = await createResearchPackage({
          queries: [{ query: options.query, topic: 'news' }],
          provider,
        });
        writeRenderedOutput(stdout, result, options.render);
      }),
  );
};

const withCommonOptions = <T extends Command>(command: T): T =>
  command.option(
    '--render <format>',
    `Output format (${OUTPUT_FORMATS.join(', ')})`,
    createChoiceParser(OUTPUT_FORMATS, '--render'),
    OUTPUT_FORMATS[1],
  );

const requireMethod = <T extends (...args: never[]) => unknown>(method: T | undefined, name: string): T => {
  if (!method) {
    throw new Error(`Tools provider does not implement ${name}`);
  }
  return method;
};
```

- [ ] **Step 5: Register tools command in CLI**

Modify `packages/cli/src/index.ts` imports:

```ts
import {
  createDefaultToolsProvider,
  registerToolsCommands,
} from './commands/tools.js';
```

Modify `BuildProgramDependencies`:

```ts
export interface BuildProgramDependencies {
  createApiClient?: (options: { baseUrl: string }) => ApiClientLike;
  createWriteProjectRunner?: (options: {
    baseUrl: string;
    createApiClient: (options: { baseUrl: string }) => ApiClientLike;
  }) => ProjectWriteRunnerLike;
  createToolsProvider?: typeof createDefaultToolsProvider;
  stdout?: Writer;
  stderr?: Writer;
}
```

Modify `buildProgram` params:

```ts
export const buildProgram = ({
  createApiClient = defaultCreateApiClient,
  createWriteProjectRunner = createProjectWriteRunner,
  createToolsProvider = createDefaultToolsProvider,
  stdout = process.stdout,
  stderr = process.stderr,
}: BuildProgramDependencies = {}): Command => {
```

Register after `registerContentCommands`:

```ts
  registerToolsCommands(program, {
    createToolsProvider,
    stdout,
  });
```

- [ ] **Step 6: Update command registration expectation**

Modify the first test in `packages/cli/tests/cli.test.ts` so `commandNames` includes `tools`:

```ts
expect(commandNames).toEqual([
  'task',
  'material',
  'bedrock',
  'outline',
  'draft',
  'rewrite',
  'export',
  'write',
  'content',
  'tools',
]);
```

- [ ] **Step 7: Run CLI tests and verify pass**

Run: `npm run test --workspace @ptce/cli -- cli.test.ts`

Expected: PASS.

---

### Task 9: Update writing skills for research and media artifacts

**Files:**
- Modify: `packages/skills/ptce-writing/SKILL.md`
- Modify: `packages/skills/public-article-writing/SKILL.md`

- [ ] **Step 1: Update `ptce-writing` tool rules**

In `packages/skills/ptce-writing/SKILL.md`, add this section after “Phase 3: Task Creation”:

```markdown
### Phase 3.5: Research and Media Tools

For public articles, decide whether the article needs research or media before drafting:

- If the article includes latest facts, company/product actions, market data, public reports, or current events, run `ptce tools research --query "<query>" --render json` and store the result as a `research_package` artifact.
- If the article needs images, run `ptce tools media plan --title "<title>" --section "<section context>" --render json` and store the result as a `media_plan` artifact.
- Do not treat Tavily snippets as strong evidence. Strong evidence requires page extraction in the research package.
- Do not use Unsplash or AI-generated images as factual evidence.
- A media plan with zero selected images is valid when candidates do not fit the article context.
```

- [ ] **Step 2: Update `public-article-writing` source and image boundary rules**

In `packages/skills/public-article-writing/SKILL.md`, add this subsection under “Gate 2: Data Anchoring”:

```markdown
Research package requirement:

- When the topic depends on current facts, company actions, product changes, public reports, market data, or news, create a `research_package` before drafting.
- Search results are discovery candidates. Do not cite a search snippet as a strong source.
- Facts should come from extracted page text, official pages, reports, announcements, or named datasets.
```

Add this subsection under “WeChat Layout Pass”:

```markdown
Media plan requirement:

- Images must serve the current section. Do not add images just to fill space.
- For factual/news images, use extracted page images from credible source pages. Do not replace factual images with Unsplash or AI-generated images.
- Use Unsplash only for conceptual or mood photos.
- Use KLIPY for existing hot memes and memegen for template-based custom memes.
- Use `gpt-image-2` only when searched candidates do not fit and an AI-generated image can clearly support the context.
- If no candidate or generated image fits, leave the slot empty.
- Every final article with images must include a picture source boundary listing source URL, attribution, usage boundary, and whether the image is AI-generated.
```

- [ ] **Step 3: Verify skill text contains the new hard rules**

Run: `rg -n "research_package|media_plan|Tavily snippets|gpt-image-2|leave the slot empty|picture source boundary" packages/skills/ptce-writing/SKILL.md packages/skills/public-article-writing/SKILL.md`

Expected: output includes both skill files and all listed terms.

---

### Task 10: Final verification

**Files:**
- All files changed by Tasks 1-9.

- [ ] **Step 1: Run full package tests**

Run: `npm run test --workspace @ptce/research-media-tools`

Expected: PASS.

- [ ] **Step 2: Run CLI tests**

Run: `npm run test --workspace @ptce/cli`

Expected: PASS.

- [ ] **Step 3: Run repo verification**

Run: `npm run verify`

Expected: PASS for Vitest workspace and e2e package.

- [ ] **Step 4: Review git diff**

Run: `git diff --stat`

Expected: only files listed in this plan are changed.

- [ ] **Step 5: Do not commit without explicit user approval**

Report changed files, verification results, and open risks. Wait for explicit approval before running `git add` or `git commit`.

---

## Self-Review

- Spec coverage: The plan covers the independent package, Tavily search, page extraction, Unsplash, KLIPY, memegen, OpenAI `gpt-image-2`, media fit evaluation, media plan output, research package output, CLI access, writing skill rules, and PTCE artifact path.
- Scope control: PicImageSearch is intentionally excluded from implementation because the spec marks reverse image search as out of scope for the first version.
- Type consistency: The core types in Task 1 are reused by provider, planning, research, and CLI tasks.
- Testability: Tasks 1-6 are fully offline. Task 7 tests real adapters with mocked `fetch`; no external API key is required for tests.
- Commit policy: This plan explicitly tells implementers not to commit without user approval.

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

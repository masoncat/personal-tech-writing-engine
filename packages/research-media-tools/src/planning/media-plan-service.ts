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

    if (!selected && need.mustBeRealImage) {
      rejectedCandidates.push({
        needId: need.id,
        asset: {
          id: `empty-${need.id}`,
          kind: 'generated_image',
          provider: 'system',
          generated: true,
          prompt: need.generationPrompt,
        },
        decision: {
          fitScore: 0,
          decision: 'leave_empty',
          reason: 'No extracted real-image candidate fit the factual media need.',
          usageBoundary: 'not_usable',
          requiredDisclosure: 'No factual image selected.',
        },
      });
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

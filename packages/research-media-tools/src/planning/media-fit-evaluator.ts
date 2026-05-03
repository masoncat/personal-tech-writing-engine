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

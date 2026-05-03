import type {
  EvidenceBedrock,
  EvidenceBlock,
  EvidenceCard,
  FreshnessAudit,
  ResearchPackage,
} from '../types.js';

export interface CreateEvidenceBedrockInput {
  topic: string;
  researchPackage: ResearchPackage;
  freshnessAudit: FreshnessAudit;
  now?: string;
}

export const createEvidenceBedrock = ({
  topic,
  researchPackage,
  freshnessAudit,
  now = new Date().toISOString(),
}: CreateEvidenceBedrockInput): EvidenceBedrock => {
  const cards = researchPackage.evidenceBlocks.map((block, index) =>
    toEvidenceCard({ block, index, freshnessAudit }),
  );

  return {
    id: `evidence-bedrock-${stableId(topic)}`,
    topic,
    cards,
    requiredDisclosures: freshnessAudit.requiredDisclosures,
    createdAt: now,
  };
};

const toEvidenceCard = ({
  block,
  index,
  freshnessAudit,
}: {
  block: EvidenceBlock;
  index: number;
  freshnessAudit: FreshnessAudit;
}): EvidenceCard => {
  const assessment = freshnessAudit.sources.find((source) => source.url === block.sourceUrl);

  return {
    id: `evidence-card-${index + 1}`,
    claim: summarizeClaim(block.text),
    sourceUrls: [block.sourceUrl],
    sourceBoundary: assessment?.usageBoundary ?? '该来源只可作为背景材料使用。',
    freshness: assessment?.freshness ?? 'undated',
    quoteSafeSummary: block.text.slice(0, 240),
  };
};

const summarizeClaim = (text: string): string =>
  text.replace(/\s+/g, ' ').trim().slice(0, 180);

const stableId = (value: string): string =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 48) || 'topic';

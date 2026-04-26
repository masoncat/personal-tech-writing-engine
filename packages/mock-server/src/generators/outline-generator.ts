import type { ArticleOutline, InformationBedrock, WritingTask } from '@ptce/shared';

export interface OutlineDraft extends Omit<ArticleOutline, 'id' | 'taskId' | 'confirmed'> {}

export const generateOutline = (
  task: WritingTask,
  bedrock: InformationBedrock,
): OutlineDraft => ({
  title: task.title,
  sections: [
    {
      title: 'Why this matters',
      goal: bedrock.coreQuestion,
      evidenceRefs: bedrock.evidence.slice(0, 2),
    },
    {
      title: 'How the system works',
      goal: bedrock.arguments[0] || `Explain the central mechanics behind ${bedrock.theme}.`,
      evidenceRefs: bedrock.evidence.slice(0, 2),
    },
    {
      title: 'Tradeoffs and open questions',
      goal:
        bedrock.arguments[1] ||
        bedrock.uncertainties[0] ||
        `Clarify the tradeoffs around ${bedrock.theme}.`,
      evidenceRefs: bedrock.evidence.slice(1, 3),
    },
  ],
});

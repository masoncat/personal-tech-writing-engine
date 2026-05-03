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

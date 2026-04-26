import type { ArticleVersion, StyleProfile } from '@ptce/shared';

export const rewriteMarkdown = (
  version: ArticleVersion,
  styleProfile: StyleProfile,
  instruction: string,
): string => {
  const cues = [
    ...styleProfile.openingTraits,
    ...styleProfile.rhythmTraits,
    ...styleProfile.explanationTraits,
  ]
    .slice(0, 4)
    .map((trait) => `- ${trait}`)
    .join('\n');

  return `${version.content}

## Revision instruction

${instruction}

## Style cues applied

${cues}

## Editorial note

${styleProfile.summary}`;
};

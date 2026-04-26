import type { Material, StyleProfile } from '@ptce/shared';

export interface StyleProfileDraft
  extends Omit<StyleProfile, 'id' | 'taskId'> {}

export const generateStyleProfile = (materials: Material[]): StyleProfileDraft => {
  const sourceMaterials = materials.filter((material) => material.type === 'article');
  const tags = new Set(sourceMaterials.flatMap((material) => material.tags ?? []));
  const historicalTone = tags.has('history');

  return {
    sourceMaterialIds: sourceMaterials.map((material) => material.id),
    openingTraits: historicalTone
      ? ['Start with a concrete historical shift.', 'Frame the stakes before the mechanics.']
      : ['Start with the practical problem.', 'Set expectations before details.'],
    rhythmTraits: ['Alternate short claims with one explanatory paragraph.', 'Use direct transitions.'],
    explanationTraits: [
      'Name the mechanism before explaining the consequences.',
      'Use one concrete example per major section.',
    ],
    forbiddenPatterns: ['Do not overuse hype language.', 'Avoid vague references to innovation.'],
    summary: historicalTone
      ? 'Blend technical explanation with grounded historical framing.'
      : 'Use a direct technical teaching voice with clear stakes.',
  };
};

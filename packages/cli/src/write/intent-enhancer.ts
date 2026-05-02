import type { AddMaterialRequest } from '@ptce/shared';

import {
  buildDeterministicIntentContent,
  type WriteModelProvider,
} from './model-provider.js';
import type {
  CandidateProjectSource,
  ModelEnhancementMode,
  ProjectWriteOptions,
} from './types.js';

export const buildIntentMaterial = async ({
  options,
  selectedCandidates,
  mode,
  provider,
}: {
  options: ProjectWriteOptions;
  selectedCandidates: CandidateProjectSource[];
  mode?: ModelEnhancementMode;
  provider: WriteModelProvider;
}): Promise<{ material: AddMaterialRequest; modelActions: string[] }> => {
  const effectiveMode = mode ?? options.modelEnhancement;

  if (effectiveMode !== 'standard') {
    return {
      material: {
        source: 'inline',
        type: 'prompt',
        title: '写作任务说明',
        content: buildDeterministicIntentContent(options),
      },
      modelActions: [],
    };
  }

  const result = await provider.enhanceIntent({
    options,
    selectedCandidates,
  });

  return {
    material: {
      source: 'inline',
      type: 'prompt',
      title: result.title,
      content: result.content,
    },
    modelActions: [result.action],
  };
};

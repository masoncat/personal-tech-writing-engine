import type { WriteModelProvider } from './model-provider.js';
import type { ProjectWriteOptions } from './types.js';

const DEFAULT_EDITORIAL_INSTRUCTION =
  '更像第一人称技术复盘，强化开头吸引力、小标题节奏和最后一句总结。';

export const buildEditorialInstruction = async ({
  draft,
  options,
  provider,
}: {
  draft: string;
  options: ProjectWriteOptions;
  provider: WriteModelProvider;
}): Promise<{
  continueToEditorial: boolean;
  instruction?: string;
  modelActions: string[];
}> => {
  if (options.editorialMode !== 'publishable') {
    return {
      continueToEditorial: false,
      modelActions: [],
    };
  }

  const evaluation = await provider.evaluateDraft({
    draft,
    options,
  });

  return {
    // Publishable mode is an explicit request to continue past draft quality.
    continueToEditorial: true,
    instruction: evaluation.instruction ?? DEFAULT_EDITORIAL_INSTRUCTION,
    modelActions: [evaluation.action],
  };
};

import type { AddMaterialRequest } from '@ptce/shared';

import {
  buildDeterministicWorkflowMaterials,
  type WriteModelProvider,
} from './model-provider.js';
import type {
  CandidateProjectSource,
  ModelEnhancementMode,
  ProjectWriteOptions,
  SelectedProjectSource,
} from './types.js';

export const normalizeProjectMaterials = async ({
  candidates,
  selectedSources,
  options,
  mode,
  provider,
}: {
  candidates: CandidateProjectSource[];
  selectedSources: SelectedProjectSource[];
  options: ProjectWriteOptions;
  mode?: ModelEnhancementMode;
  provider: WriteModelProvider;
}): Promise<{ materials: AddMaterialRequest[]; modelActions: string[] }> => {
  const selectedIds = selectedSources.map((source) => source.id);
  const effectiveMode = mode ?? options.modelEnhancement;

  if (effectiveMode !== 'standard') {
    return {
      materials: buildDeterministicWorkflowMaterials(candidates, selectedIds).map(toAddMaterialRequest),
      modelActions: [],
    };
  }

  const result = await provider.normalizeMaterials({
    candidates,
    selectedIds,
    options,
  });

  return {
    materials: result.workflowMaterials.map(toAddMaterialRequest),
    modelActions: [result.action],
  };
};

const toAddMaterialRequest = (material: {
  type: AddMaterialRequest['type'];
  title: string;
  content: string;
}): AddMaterialRequest => ({
  source: 'inline',
  type: material.type,
  title: material.title,
  content: material.content,
});

import {
  DeterministicWriteModelProvider,
  type MaterialSelectionDecision,
  type WriteModelProvider,
} from './model-provider.js';
import type {
  CandidateProjectSource,
  ModelEnhancementMode,
  ProjectWriteOptions,
  SelectedProjectSource,
} from './types.js';

export interface MaterialSelectionOutput {
  selectedSources: SelectedProjectSource[];
  skippedSources: SelectedProjectSource[];
  modelActions: string[];
  provider: WriteModelProvider;
  mode: ModelEnhancementMode;
}

export const selectProjectSources = async ({
  candidates,
  maxMaterials,
  mode,
  provider,
  options,
}: {
  candidates: CandidateProjectSource[];
  maxMaterials?: number;
  mode: ModelEnhancementMode;
  provider?: WriteModelProvider;
  options?: ProjectWriteOptions;
}): Promise<MaterialSelectionOutput> => {
  const activeProvider = provider ?? new DeterministicWriteModelProvider();
  const effectiveOptions = buildEffectiveOptions(options, maxMaterials, mode);

  if (mode === 'off') {
    const fallbackProvider = new DeterministicWriteModelProvider();
    const result = await fallbackProvider.selectMaterials({
      candidates,
      options: effectiveOptions,
    });

    return {
      selectedSources: mapSelections(candidates, result.selected),
      skippedSources: mapSelections(candidates, result.skipped),
      modelActions: [],
      provider: activeProvider,
      mode,
    };
  }

  const result = await activeProvider.selectMaterials({
    candidates,
    options: effectiveOptions,
  });

  return {
    selectedSources: mapSelections(candidates, result.selected),
    skippedSources: mapSelections(candidates, result.skipped),
    modelActions: [result.action],
    provider: activeProvider,
    mode,
  };
};

const buildEffectiveOptions = (
  options: ProjectWriteOptions | undefined,
  maxMaterials: number | undefined,
  mode: ModelEnhancementMode,
): ProjectWriteOptions => ({
  projectPath: options?.projectPath ?? '',
  title: options?.title ?? '',
  articleType: options?.articleType ?? '',
  reader: options?.reader ?? '',
  goal: options?.goal,
  channel: options?.channel ?? 'blog',
  stopAt: options?.stopAt ?? 'draft',
  editorialMode: options?.editorialMode ?? 'none',
  export: options?.export ?? false,
  exportPath: options?.exportPath,
  obsidianVaultPath: options?.obsidianVaultPath,
  sourcePaths: options?.sourcePaths,
  withGitLog: options?.withGitLog ?? true,
  withObsidianContext: options?.withObsidianContext ?? false,
  maxMaterials: maxMaterials ?? options?.maxMaterials,
  modelEnhancement: mode,
});

const mapSelections = (
  candidates: CandidateProjectSource[],
  decisions: MaterialSelectionDecision[],
): SelectedProjectSource[] => {
  const candidatesById = new Map(candidates.map((candidate) => [candidate.id, candidate]));

  return decisions.map((decision) => {
    const source = candidatesById.get(decision.id);
    if (!source) {
      throw new Error(`Unknown source id: ${decision.id}`);
    }

    return {
      id: source.id,
      kind: source.kind,
      path: source.path,
      role: decision.role,
    };
  });
};

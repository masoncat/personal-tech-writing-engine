import type {
  BedrockResponse,
  ExportResponse,
  GenerateExportRequest,
  MaterialListResponse,
  OutlineResponse,
  TaskEnvelope,
  VersionResponse,
} from '@ptce/shared';

import type { ApiClientLike } from '../client/api-client.js';
import type { ProjectWriteRunnerLike } from '../commands/write.js';
import { buildEditorialInstruction } from './editorial-finalizer.js';
import { buildIntentMaterial } from './intent-enhancer.js';
import { normalizeProjectMaterials } from './material-normalizer.js';
import { DeterministicWriteModelProvider } from './model-provider.js';
import { selectProjectSources } from './material-selector.js';
import { collectProjectSources } from './project-scanner.js';
import type { ProjectWriteOptions, ProjectWriteResult } from './types.js';

export const createProjectWriteRunner = ({
  baseUrl,
  createApiClient,
}: {
  baseUrl: string;
  createApiClient: (options: { baseUrl: string }) => ApiClientLike;
}): ProjectWriteRunnerLike => {
  const client = createApiClient({ baseUrl });
  const provider = new DeterministicWriteModelProvider();

  return {
    async run(options: ProjectWriteOptions): Promise<ProjectWriteResult> {
      const candidates = await collectProjectSources({
        projectPath: options.projectPath,
        withGitLog: options.withGitLog,
        sourcePaths: options.sourcePaths,
      });

      const selection = await selectProjectSources({
        candidates,
        maxMaterials: options.maxMaterials,
        mode: options.modelEnhancement,
        provider,
        options,
      });
      const selectedSourceIds = new Set(selection.selectedSources.map((source) => source.id));
      const selectedCandidates = candidates.filter((candidate) => selectedSourceIds.has(candidate.id));

      const intent = await buildIntentMaterial({
        options,
        selectedCandidates,
        mode: selection.mode,
        provider: selection.provider,
      });
      const normalized = await normalizeProjectMaterials({
        candidates,
        selectedSources: selection.selectedSources,
        options,
        mode: selection.mode,
        provider: selection.provider,
      });
      const modelActions = [
        ...selection.modelActions,
        ...intent.modelActions,
        ...normalized.modelActions,
      ];

      const createdTask = await client.request<TaskEnvelope>({
        method: 'POST',
        path: '/tasks',
        body: {
          title: options.title,
          articleType: options.articleType,
          preferredChannel: options.channel,
          reader: options.reader,
        },
      });

      const taskId = createdTask.task.id;
      let materialsResponse: MaterialListResponse = {
        task: createdTask.task,
        materials: [],
      };

      for (const material of [intent.material, ...normalized.materials]) {
        materialsResponse = await client.request<MaterialListResponse>({
          method: 'POST',
          path: `/tasks/${taskId}/materials`,
          body: material,
        });
      }

      const bedrockResponse = await client.request<BedrockResponse>({
        method: 'POST',
        path: `/tasks/${taskId}/bedrock/generate`,
      });

      if (options.stopAt === 'bedrock') {
        return buildResult({
          task: bedrockResponse.task,
          materials: materialsResponse.materials,
          bedrock: bedrockResponse.bedrock,
          outline: null,
          draftVersion: null,
          rewriteVersion: null,
          exportRecord: null,
          options,
          selection,
          modelActions,
        });
      }

      const confirmedBedrockResponse = await client.request<BedrockResponse>({
        method: 'POST',
        path: `/tasks/${taskId}/bedrock/${bedrockResponse.bedrock.id}/confirm`,
      });
      const outlineResponse = await client.request<OutlineResponse>({
        method: 'POST',
        path: `/tasks/${taskId}/outlines/generate`,
      });

      if (options.stopAt === 'outline') {
        return buildResult({
          task: outlineResponse.task,
          materials: materialsResponse.materials,
          bedrock: confirmedBedrockResponse.bedrock,
          outline: outlineResponse.outline,
          draftVersion: null,
          rewriteVersion: null,
          exportRecord: null,
          options,
          selection,
          modelActions,
        });
      }

      const confirmedOutlineResponse = await client.request<OutlineResponse>({
        method: 'POST',
        path: `/tasks/${taskId}/outlines/${outlineResponse.outline.id}/confirm`,
      });
      const draftResponse = await client.request<VersionResponse>({
        method: 'POST',
        path: `/tasks/${taskId}/drafts/generate`,
      });

      const editorial = await buildEditorialInstruction({
        draft: draftResponse.version.content,
        options,
        provider: selection.provider,
      });
      const finalModelActions = [...modelActions, ...editorial.modelActions];
      const shouldRewrite =
        options.export ||
        options.stopAt === 'rewrite' ||
        options.stopAt === 'export' ||
        editorial.continueToEditorial;
      const shouldExport = options.export || options.stopAt === 'export';

      if (!shouldRewrite && !shouldExport) {
        return buildResult({
          task: draftResponse.task,
          materials: materialsResponse.materials,
          bedrock: confirmedBedrockResponse.bedrock,
          outline: confirmedOutlineResponse.outline,
          draftVersion: draftResponse.version,
          rewriteVersion: null,
          exportRecord: null,
          options,
          selection,
          modelActions: finalModelActions,
        });
      }

      let rewriteResponse: VersionResponse | null = null;
      if (shouldRewrite) {
        rewriteResponse = await client.request<VersionResponse>({
          method: 'POST',
          path: `/tasks/${taskId}/rewrites`,
          body: {
            versionId: draftResponse.version.id,
            instruction: editorial.instruction ?? 'Tighten the draft.',
          },
        });
      }

      if (options.stopAt === 'rewrite' && !shouldExport) {
        return buildResult({
          task: rewriteResponse?.task ?? draftResponse.task,
          materials: materialsResponse.materials,
          bedrock: confirmedBedrockResponse.bedrock,
          outline: confirmedOutlineResponse.outline,
          draftVersion: draftResponse.version,
          rewriteVersion: rewriteResponse?.version ?? null,
          exportRecord: null,
          options,
          selection,
          modelActions: finalModelActions,
        });
      }

      if (shouldExport) {
        const exportResponse = await client.request<ExportResponse>({
          method: 'POST',
          path: `/tasks/${taskId}/exports`,
          body: buildExportRequest({
            taskId,
            versionId: rewriteResponse?.version.id ?? draftResponse.version.id,
            options,
          }),
        });

        return buildResult({
          task: exportResponse.task,
          materials: materialsResponse.materials,
          bedrock: confirmedBedrockResponse.bedrock,
          outline: confirmedOutlineResponse.outline,
          draftVersion: draftResponse.version,
          rewriteVersion: rewriteResponse?.version ?? null,
          exportRecord: exportResponse.exportRecord,
          options,
          selection,
          modelActions: finalModelActions,
        });
      }

      return buildResult({
        task: rewriteResponse?.task ?? draftResponse.task,
        materials: materialsResponse.materials,
        bedrock: confirmedBedrockResponse.bedrock,
        outline: confirmedOutlineResponse.outline,
        draftVersion: draftResponse.version,
        rewriteVersion: rewriteResponse?.version ?? null,
        exportRecord: null,
        options,
        selection,
        modelActions: finalModelActions,
      });
    },
  };
};

const buildResult = ({
  task,
  materials,
  bedrock,
  outline,
  draftVersion,
  rewriteVersion,
  exportRecord,
  options,
  selection,
  modelActions,
}: {
  task: ProjectWriteResult['task'];
  materials: ProjectWriteResult['materials'];
  bedrock: ProjectWriteResult['bedrock'];
  outline: ProjectWriteResult['outline'];
  draftVersion: ProjectWriteResult['draftVersion'];
  rewriteVersion: ProjectWriteResult['rewriteVersion'];
  exportRecord: ProjectWriteResult['exportRecord'];
  options: ProjectWriteOptions;
  selection: Pick<ProjectWriteResult, 'selectedSources' | 'skippedSources'>;
  modelActions: string[];
}): ProjectWriteResult => ({
  task,
  materials,
  bedrock,
  outline,
  draftVersion,
  rewriteVersion,
  exportRecord,
  stopAt: options.stopAt,
  editorialMode: options.editorialMode,
  selectedSources: selection.selectedSources,
  skippedSources: selection.skippedSources,
  modelActions,
});

const buildExportRequest = ({
  taskId,
  versionId,
  options,
}: {
  taskId: string;
  versionId: string;
  options: ProjectWriteOptions;
}): GenerateExportRequest => {
  if (options.obsidianVaultPath) {
    return {
      versionId,
      channel: options.channel,
      format: 'markdown',
      target: 'obsidian',
      vaultPath: options.obsidianVaultPath,
      outputPath:
        options.exportPath ?? `content-engine/articles/${taskId}-${options.channel}.md`,
    };
  }

  return {
    versionId,
    channel: options.channel,
    format: 'markdown',
    target: 'local',
    outputPath: options.exportPath,
  };
};

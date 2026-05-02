import type { InformationBedrock, Material, WritingTask } from '@ptce/shared';
import type { ExportChannel } from '@ptce/shared';

import { isBuildRetrospectiveBlogLane } from './article-lane.js';
import { extractRetrospectiveBeat } from './build-retrospective.js';

export interface BedrockDraft
  extends Omit<InformationBedrock, 'id' | 'taskId' | 'confirmed'> {}

export const generateBedrock = (
  task: WritingTask,
  materials: Material[],
  channel: ExportChannel,
): BedrockDraft => {
  if (isBuildRetrospectiveBlogLane(task, channel)) {
    const beat = extractRetrospectiveBeat(materials);

    return {
      theme: task.title,
      coreQuestion: beat.openingProblem,
      arguments: [beat.projectGoal, ...beat.phaseHighlights, ...beat.judgementCalls, beat.closingTakeaway],
      evidence: materials.map((material) =>
        material.relativePath ? `${material.title} (${material.relativePath})` : material.title,
      ),
      uncertainties: [],
    };
  }

  const titledMaterials = materials.slice(0, 3);
  const summarizedMaterials = titledMaterials.map((material) => summarizeMaterial(material));
  const fallbackArguments = materials.map((material) => material.title);
  const evidence = materials.map((material) =>
    material.relativePath ? `${material.title} (${material.relativePath})` : material.title,
  );
  const anchor = titledMaterials.at(0);
  const coreQuestion = anchor
    ? `How should ${task.title} explain ${extractTopic(anchor)} for ${task.reader}?`
    : `How should ${task.title} serve ${task.reader}?`;

  return {
    theme: task.title,
    coreQuestion,
    arguments:
      summarizedMaterials.length > 0
        ? summarizedMaterials
        : fallbackArguments.length > 0
          ? fallbackArguments
          : [`Explain why ${task.title} matters to ${task.reader}.`],
    evidence: evidence.length > 0 ? evidence : ['No source evidence imported yet.'],
    uncertainties: [
      'Which details need historical context versus implementation detail?',
      'Which examples are essential for the target reader?',
    ],
  };
};

const summarizeMaterial = (material: Material): string => {
  const snippet = material.content
    .replace(/\s+/g, ' ')
    .trim()
    .split(/[.!?]/, 1)[0];

  return `${material.title}: ${snippet || 'Source material available.'}`;
};

const extractTopic = (material: Material): string => {
  const heading = material.content
    .split('\n')
    .find((line) => line.trim().startsWith('#'));

  return heading?.replace(/^#+\s*/, '').trim() || material.title;
};

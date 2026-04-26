import type { ArticleOutline, InformationBedrock, WritingTask } from '@ptce/shared';

export const generateDraftMarkdown = (
  task: WritingTask,
  bedrock: InformationBedrock,
  outline: ArticleOutline,
): string => {
  const sections = outline.sections
    .map((section) => {
      const evidence = section.evidenceRefs.length
        ? section.evidenceRefs.map((ref) => `- ${ref}`).join('\n')
        : '- Add supporting evidence from imported materials.';

      return `## ${section.title}

${section.goal}

Evidence anchors:
${evidence}`;
    })
    .join('\n\n');

  return `# ${task.title}

Reader: ${task.reader}

Core question: ${bedrock.coreQuestion}

Key arguments:
${bedrock.arguments.map((argument) => `- ${argument}`).join('\n')}

${sections}

## Closing takeaway

Tie the explanation back to why ${bedrock.theme} matters for ${task.reader}.`;
};

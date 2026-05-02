import type { ArticleOutline, InformationBedrock, WritingTask } from '@ptce/shared';

export interface OutlineDraft extends Omit<ArticleOutline, 'id' | 'taskId' | 'confirmed'> {}

type RetrospectiveSectionKey =
  | 'openingProblem'
  | 'projectStart'
  | 'realChain'
  | 'complexification'
  | 'closingWork'
  | 'finalJudgement';

interface RetrospectiveSectionConfig {
  key: RetrospectiveSectionKey;
  title: string;
  goal: (bedrock: InformationBedrock) => string;
  evidenceGroups: RegExp[][];
}

const RETROSPECTIVE_SECTION_CONFIG: RetrospectiveSectionConfig[] = [
  {
    key: 'openingProblem',
    title: '开场问题',
    goal: (bedrock) => bedrock.coreQuestion,
    evidenceGroups: [
      [/写作任务说明|第一人称|按时间线|项目主轴|起步|读者|开发者/],
      [/真实可用|看起来像通了|其实没通|问题|失败|卡住|演示态/],
    ],
  },
  {
    key: 'projectStart',
    title: '项目起步',
    goal: (bedrock) => bedrock.arguments[0] || `说明 ${bedrock.theme} 的项目起步。`,
    evidenceGroups: [
      [/写作任务说明|第一人称|按时间线|项目主轴|起步|读者|开发者/],
      [/真实可用|看起来像通了|其实没通|问题|失败|卡住|演示态/],
    ],
  },
  {
    key: 'realChain',
    title: '真实链路打通',
    goal: (bedrock) =>
      selectRetrospectiveGoal(
        bedrock.arguments,
        [/真实链路|演示态|假演示|真实可用/],
        '说明真实链路是如何打通的。',
      ),
    evidenceGroups: [
      [/真实链路|真实可用|假演示|mock|fake|demo|其实没通|看起来像通了|闭环/],
      [/真正重要|复盘|结论|判断|takeaway/],
    ],
  },
  {
    key: 'complexification',
    title: '项目复杂化',
    goal: (bedrock) =>
      selectRetrospectiveGoal(
        bedrock.arguments,
        [/复杂化|batch|异步|task center|offline/],
        '说明项目为什么开始复杂化。',
      ),
    evidenceGroups: [
      [/batch|worker|offline|task center|异步/],
      [/vpc|mysql|部署|架构|边界|收口|基础设施/],
    ],
  },
  {
    key: 'closingWork',
    title: '工程收口',
    goal: (bedrock) =>
      selectRetrospectiveGoal(
        bedrock.arguments,
        [/收口|worker|vpc|mysql|部署|边界/],
        '说明工程收口时做了哪些取舍。',
      ),
    evidenceGroups: [
      [/vpc|mysql|worker|部署|边界|收口|基础设施/],
      [/batch|offline|task center|异步/],
    ],
  },
  {
    key: 'finalJudgement',
    title: '最后的判断',
    goal: (bedrock) => bedrock.arguments.at(-1) || bedrock.uncertainties[0] || '给出最后的判断。',
    evidenceGroups: [
      [/真正重要|复盘|结论|判断|takeaway/],
      [/batch|offline|task center|异步|timeline/],
    ],
  },
];

export const generateOutline = (
  task: WritingTask,
  bedrock: InformationBedrock,
): OutlineDraft => {
  const sections =
    task.articleType === 'build-retrospective' && task.preferredChannel === 'blog'
      ? buildRetrospectiveBlogSections(bedrock)
      : buildGenericSections(bedrock);

  return {
    title: task.title,
    sections,
  };
};

const buildRetrospectiveBlogSections = (bedrock: InformationBedrock) =>
  RETROSPECTIVE_SECTION_CONFIG.map(({ title, goal, evidenceGroups }) => ({
    title,
    goal: goal(bedrock),
    evidenceRefs: selectEvidenceRefs(evidenceGroups, bedrock.evidence),
  }));

const buildGenericSections = (bedrock: InformationBedrock) => [
  {
    title: 'Why this matters',
    goal: bedrock.coreQuestion,
    evidenceRefs: bedrock.evidence.slice(0, 2),
  },
  {
    title: 'How the system works',
    goal: bedrock.arguments[0] || `Explain the central mechanics behind ${bedrock.theme}.`,
    evidenceRefs: bedrock.evidence.slice(0, 2),
  },
  {
    title: 'Tradeoffs and open questions',
    goal:
      bedrock.arguments[1] ||
      bedrock.uncertainties[0] ||
      `Clarify the tradeoffs around ${bedrock.theme}.`,
    evidenceRefs: bedrock.evidence.slice(1, 3),
  },
];

const selectRetrospectiveGoal = (
  argumentsList: string[],
  patterns: RegExp[],
  fallback: string,
): string => {
  const semanticMatch = argumentsList.find((argument) =>
    patterns.some((pattern) => pattern.test(argument)),
  );

  return semanticMatch || argumentsList[0] || fallback;
};

const selectEvidenceRefs = (groups: RegExp[][], evidence: string[]): string[] => {
  const selected: string[] = [];

  for (const group of groups) {
    for (const ref of evidence) {
      if (selected.includes(ref)) {
        continue;
      }

      if (group.some((pattern) => pattern.test(ref.toLowerCase()))) {
        selected.push(ref);

        if (selected.length >= 2) {
          return selected;
        }
      }
    }
  }

  for (const ref of evidence) {
    if (!selected.includes(ref)) {
      selected.push(ref);
    }

    if (selected.length >= 2) {
      break;
    }
  }

  return selected;
};

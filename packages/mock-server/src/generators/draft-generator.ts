import type { ArticleOutline, InformationBedrock, WritingTask } from '@ptce/shared';

import { isBuildRetrospectiveBlogLane } from './article-lane.js';

export const generateDraftMarkdown = (
  task: WritingTask,
  bedrock: InformationBedrock,
  outline: ArticleOutline,
): string => {
  if (isBuildRetrospectiveBlogLane(task, task.preferredChannel)) {
    return generateRetrospectiveBlogDraft(task, bedrock, outline);
  }

  return generateGenericDraftMarkdown(task, bedrock, outline);
};

const generateRetrospectiveBlogDraft = (
  task: WritingTask,
  bedrock: InformationBedrock,
  outline: ArticleOutline,
): string => {
  const profile = buildSignalProfile(task, bedrock, outline);
  const sections = outline.sections.map((section) => formatRetrospectiveSection(section, profile)).join('\n\n');
  const ending = buildEnding(profile);

  return `# ${task.title}

${bedrock.coreQuestion}

最直接的失败模式，是前台已经能看到结果，但中间的 ${profile.routeNoun} 和 ${profile.stateNoun} 还没有真正咬合。

我先把这个问题摊开看：不是“有没有功能”，而是“功能跑起来的时候，${profile.entryNoun}、${profile.executionNoun} 和 ${profile.storageNoun} 是否真的闭环”。

${sections}

${ending}`;
};

const formatRetrospectiveSection = (
  section: ArticleOutline['sections'][number],
  profile: RetrospectiveSignalProfile,
): string => {
  const plan = buildSectionPlan(section, profile);

  const paragraphs = [plan.opener, plan.action, plan.problem, plan.judgement];

  return `## ${section.title}

${paragraphs.join('\n\n')}`;
};

type RetrospectiveSignalProfile = {
  entryNoun: string;
  executionNoun: string;
  storageNoun: string;
  routeNoun: string;
  stateNoun: string;
  apiMode: boolean;
  asyncMode: boolean;
  routeMode: boolean;
  infraMode: boolean;
  batchMode: boolean;
};

const buildSignalProfile = (
  task: WritingTask,
  bedrock: InformationBedrock,
  outline: ArticleOutline,
): RetrospectiveSignalProfile => {
  const signalText = [
    task.title,
    bedrock.coreQuestion,
    ...bedrock.arguments,
    ...bedrock.evidence,
    ...outline.sections.flatMap((section) => [section.title, section.goal, ...section.evidenceRefs]),
  ]
    .join(' ')
    .toLowerCase();

  const apiMode = /api|接口/.test(signalText);
  const asyncMode = /async|异步|队列|worker|task/.test(signalText);
  const routeMode = /路由|链路|调用路径/.test(signalText);
  const infraMode = /mysql|vpc|部署|落盘|数据库|db|persist|storage|基础设施/.test(signalText);
  const batchMode = /batch|批量|批改|review|离线/.test(signalText);

  return {
    entryNoun: chooseEntryNoun(apiMode),
    executionNoun: chooseExecutionNoun(asyncMode, batchMode),
    storageNoun: chooseStorageNoun(infraMode),
    routeNoun: chooseRouteNoun(routeMode, batchMode),
    stateNoun: chooseStateNoun(asyncMode, infraMode),
    apiMode,
    asyncMode,
    routeMode,
    infraMode,
    batchMode,
  };
};

const buildSectionPlan = (
  section: ArticleOutline['sections'][number],
  profile: RetrospectiveSignalProfile,
): { opener: string; action: string; problem: string; judgement: string } => {
  const generic = buildGenericSectionPlan(section, profile);

  switch (section.title) {
    case '开场问题':
      return {
        opener: `一开始撞上的第一道墙，不是想写什么，而是 ${profile.entryNoun} 已经能出结果，却还没有把 ${profile.routeNoun} 跑顺。`,
        action: `我先把问题压回到可验证的链路上，重新看输入、路由和 ${profile.stateNoun}，确认卡住的地方不在表层功能，而在中间断点。`,
        problem:
          `最麻烦的是，表面上每一步都像是通了，但一切进入真实流程以后，${profile.executionNoun} 就会在半路停住，结果也没真正落到 ${profile.storageNoun}。`,
        judgement: '所以这一段先不谈优化，先把失败模式说透：哪里是展示，哪里才是真正的执行。',
      };
    case '项目起步':
      return {
        opener: '起步阶段做的第一件事，是把目标压成一个能验证的最小闭环，而不是先堆一堆看起来完整的页面。',
        action: `我先从最小入口搭起 ${profile.entryNoun}，让一次请求能走到执行侧，再看状态是否按预期回写。`,
        problem: profile.asyncMode
          ? '这个阶段暴露出来的问题很具体：任务能发出去，不代表它在异步链路里能持续推进；入口能返回，也不代表结果能稳定回传。'
          : '这个阶段暴露出来的问题很具体：入口能返回，不代表后面的链路真的跑完；前半段看起来完成，也不代表结果能稳定回传。',
        judgement: '所以起步不是为了“先有个样子”，而是为了证明这件事确实能被工程化地做起来。',
      };
    case '真实链路打通':
      return {
        opener: '真正把链路打通的时候，问题就从“能不能开始”变成了“每一跳是不是都是真的”。',
        action: `我对照材料里记录的推进过程去核对 ${profile.routeNoun} 和数据落点，发现需要把触发点和回写点一起收紧。`,
        problem:
          `之前最大的误判，是把某个局部成功当成整体成功；实际上只要一段 ${profile.stateNoun} 没对齐，后面的结果就会看起来对、但追不到源头。`,
        judgement: '这一段的结论不是“做完了”，而是“链路终于可追踪了”，这一步比单纯出结果更重要。',
      };
    case '项目复杂化':
      return {
        opener: profile.batchMode
          ? '当批量处理和离线 review 进来以后，系统就不再只是单次执行，而是开始变成一串需要调度的动作。'
          : '当更多并行步骤进来以后，系统就不再只是单次执行，而是开始变成一串需要调度的动作。',
        action: profile.batchMode
          ? '我把批量批改、异步任务和执行侧的配合方式拆开，看每一段什么时候入队、什么时候回写、什么时候才算结束。'
          : '我把并行处理、状态回写和执行侧的配合方式拆开，看每一段什么时候进入下一步、什么时候回写、什么时候才算结束。',
        problem:
          '复杂化带来的直接问题，是并发一上来，原来“顺手就能看懂”的流程开始出现等待、重试和顺序错位。',
        judgement: '这时候不能再靠直觉判断，得把每一步的责任边界和状态变化都明确下来，系统才不会越做越乱。',
      };
    case '工程收口':
      return {
        opener: profile.infraMode
          ? '收口阶段看的是工程边界，不是功能想象。'
          : '收口阶段看的是工程边界，不是功能想象。',
        action: profile.infraMode
          ? '我去看部署方式、存储和环境边界，确认哪些依赖必须收在一起，哪些可以继续拆开。'
          : '我去看路由、日志和环境边界，确认哪些依赖必须收在一起，哪些可以继续拆开。',
        problem: profile.infraMode
          ? '如果边界不收紧，执行侧能跑也只是偶然，链路一旦抖一下，整个流程就会重新变得脆弱。'
          : '如果边界不收紧，流程能跑也只是偶然，链路一旦抖一下，整个结果就会重新变得脆弱。',
        judgement: profile.infraMode
          ? '所以工程收口不是补丁活，而是把系统从“能演示”推进到“能稳定部署”的关键一步。'
          : '所以工程收口不是补丁活，而是把系统从“能演示”推进到“能稳定运行”的关键一步。',
      };
    case '最后的判断':
      return {
        opener: '最后的判断不在于用了多少技巧，而在于这条链路是不是已经能被反复验证。',
        action: profile.infraMode || profile.asyncMode
          ? `回看这些推进信号，最有意义的是把入口、执行侧和 ${profile.storageNoun} 再次对齐后，整条链路终于能稳定跑通。`
          : '回看这些推进信号，最有意义的是把入口、执行侧和状态回写再次对齐后，整条链路终于能稳定跑通。',
        problem:
          '真正值得警惕的，是任何一个环节又退回到“看起来能用”的状态，因为那样的成功很快就会在下一次变更里失效。',
        judgement: '所以这篇复盘的结论很简单：把真实问题收住，才有资格谈体验和扩展。',
      };
    default:
      return generic;
  }
};

const buildGenericSectionPlan = (
  section: ArticleOutline['sections'][number],
  profile: RetrospectiveSignalProfile,
): { opener: string; action: string; problem: string; judgement: string } => ({
  opener: section.goal,
  action: '我把这一段的推进拆成可验证的步骤。',
  problem: `中间仍然有需要收紧的地方，尤其是 ${profile.routeNoun} 和 ${profile.stateNoun} 的衔接。`,
  judgement: '这一节先把判断落到具体问题上，再继续往下推进。',
});

const buildEnding = (profile: RetrospectiveSignalProfile): string =>
  profile.infraMode
    ? '所以这篇复盘最后留下的，不是模板化的方法论，而是一个更朴素的判断：只有把 API、状态流转、异步任务和部署收口都接到真实链路里，项目才算真的从演示走到可用。'
    : '所以这篇复盘最后留下的，不是模板化的方法论，而是一个更朴素的判断：只有把 API、路由、状态回写和数据链路都接到真实流程里，项目才算真的从演示走到可用。';

const chooseEntryNoun = (apiMode: boolean): string => (apiMode ? 'API' : '接口');

const chooseExecutionNoun = (asyncMode: boolean, batchMode: boolean): string => {
  if (batchMode) return '批量处理';
  if (asyncMode) return 'worker';
  return '执行侧';
};

const chooseStorageNoun = (infraMode: boolean): string => (infraMode ? 'MySQL' : '数据链路');

const chooseRouteNoun = (routeMode: boolean, batchMode: boolean): string => {
  if (batchMode) return '队列';
  if (routeMode) return '路由';
  return '调用路径';
};

const chooseStateNoun = (asyncMode: boolean, infraMode: boolean): string => {
  if (asyncMode) return '状态流转';
  if (infraMode) return '数据落盘';
  return '状态回写';
};

const generateGenericDraftMarkdown = (
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

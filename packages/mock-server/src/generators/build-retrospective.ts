import type { Material } from '@ptce/shared';

export interface RetrospectiveBeat {
  openingProblem: string;
  projectGoal: string;
  phaseHighlights: string[];
  judgementCalls: string[];
  closingTakeaway: string;
}

export const extractRetrospectiveBeat = (materials: Material[]): RetrospectiveBeat => {
  const orderedMaterials = stableOrder(materials);
  const latestPrompt = latestMatching(orderedMaterials, (material) => material.type === 'prompt');
  const latestArticle = latestMatching(orderedMaterials, (material) => material.type === 'article');
  const timelineMaterials = orderedMaterials.filter(
    (material) =>
      material.type === 'note' &&
      (/时间线|timeline/i.test(material.title) || hasTimelineShape(material.content)),
  );
  const latestTimeline = timelineMaterials.at(-1);
  const scopeMaterials = orderedMaterials.filter(
    (material) =>
      !timelineMaterials.some((timelineMaterial) => timelineMaterial.id === material.id) &&
      (material.type === 'note' || material.type === 'repo' || material.type === 'reference'),
  );

  return {
    openingProblem:
      findSentence(latestArticle?.content, [/看起来像通了/, /其实没通/, /最容易踩的一个坑/, /失败/, /卡住/]) ??
      firstSentence(latestArticle?.content) ??
      '项目看起来能演示，但真实链路并没有真正跑通。',
    projectGoal:
      deriveProjectGoal(latestPrompt?.content) ??
      '项目最初的目标是先把一个真实问题做成可验证的最小闭环。',
    phaseHighlights: compact([
      ...mergeSignalGroups(
        timelineMaterials.flatMap((material) => deriveTimelineSignals(material.content)),
        orderedMaterials.flatMap((material) =>
          deriveArticleSignals(material.type === 'article' ? material.content : undefined),
        ),
        scopeMaterials.flatMap((material) => deriveScopeSignals(material.content)),
      ),
    ]).slice(0, 4),
    judgementCalls: compact([
      ...mergeSignalGroups(
        orderedMaterials.flatMap((material) =>
          deriveJudgementCalls(material.type === 'article' ? material.content : undefined),
        ),
        scopeMaterials.flatMap((material) => deriveJudgementCalls(material.content)),
      ),
    ]).slice(0, 3),
    closingTakeaway:
      deriveClosingTakeaway(latestArticle?.content, latestPrompt?.content, latestTimeline?.content) ??
      '这个项目最后说明的不是技术本身，而是我什么时候该让 agent 推进，什么时候必须由人收口。',
  };
};

const deriveProjectGoal = (content?: string): string | undefined => {
  if (!content) return undefined;

  const fragments: string[] = [];

  if (content.includes('第一人称')) fragments.push('第一人称复盘');
  if (content.includes('时间线')) fragments.push('按时间线讲清楚推进过程');
  if (/AI\/agent|agent|AI/.test(content)) fragments.push('用 AI/agent 推进真实项目');
  if (content.includes('开发者') || content.includes('读者')) fragments.push('面向开发者写出可复用的经验');

  return fragments.length > 0 ? `项目最初想做的是${fragments.join('，')}。` : undefined;
};

const deriveTimelineSignals = (content?: string): string[] => {
  if (!content) return [];

  return content
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const signal = line.replace(/^[0-9a-f]{6,40}\s+\w+:\s+/i, '');

      if (/offline|batch review|task center/i.test(signal)) {
        return `从「${signal}」可以看出，项目开始进入离线批量评审和任务中心阶段。`;
      }

      if (/mysql|vpc/i.test(signal)) {
        return `从「${signal}」可以看出，数据库访问和部署收口开始进入 VPC 范围。`;
      }

      if (/demo|fake|mock|real/i.test(signal)) {
        return `从「${signal}」可以看出，项目开始从演示态转向真实链路。`;
      }

      return `从「${signal}」可以看出，项目进入了新的演进阶段。`;
    });
};

const deriveArticleSignals = (content?: string): string[] => {
  if (!content) return [];

  return splitSentences(content)
    .filter((sentence) => /不是.*而是|看起来像通了|其实没通|最容易踩的一个坑/.test(sentence))
    .map((sentence) => `文章里的判断是：${sentence}`);
};

const deriveScopeSignals = (content?: string): string[] => {
  if (!content) return [];

  return splitSentences(content)
    .filter((sentence) => /worker|VPC|MySQL|task center|batch review|离线|部署|数据库|边界|架构/i.test(sentence))
    .map((sentence) => `范围和边界信号：${sentence}`);
};

const deriveJudgementCalls = (content?: string): string[] => {
  if (!content) return [];

  return splitSentences(content)
    .filter((sentence) => /应该|必须|需要|不能|不再|适合|判断|收口|落地|边界/i.test(sentence))
    .map((sentence) => `这里的判断是：${sentence}`);
};

const deriveClosingTakeaway = (
  article?: string,
  prompt?: string,
  timeline?: string,
): string | undefined => {
  if (article && /真实可用|真正跑通|其实没通/.test(article)) {
    return '真正重要的是把看起来能跑的东西推进成真实可用。';
  }

  if (prompt?.includes('第一人称')) {
    return '我需要亲自收口判断，而不是只交给工具推进。';
  }

  if (timeline && /vpc|mysql/i.test(timeline)) {
    return '工程收口阶段更考验判断和取舍。';
  }

  return undefined;
};

const hasTimelineShape = (content: string): boolean => /^(?:\s*[0-9a-f]{6,40}\s+\w+:\s+)/im.test(content);

const splitSentences = (content: string): string[] =>
  content
    .replace(/\s+/g, ' ')
    .split(/[。！？!?]/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

const findSentence = (content: string | undefined, patterns: RegExp[]): string | undefined => {
  if (!content) return undefined;

  return splitSentences(content).find((sentence) => patterns.some((pattern) => pattern.test(sentence)));
};

const firstSentence = (content?: string): string | undefined => {
  if (!content) return undefined;

  return content.replace(/\s+/g, ' ').trim().split(/[。！？!?]/, 1)[0]?.trim();
};

const compact = (values: Array<string | undefined>): string[] =>
  values.filter((value): value is string => typeof value === 'string' && value.length > 0);

const mergeSignalGroups = (...groups: string[][]): string[] => {
  const merged: string[] = [];
  const maxLength = Math.max(0, ...groups.map((group) => group.length));

  for (let index = 0; index < maxLength; index += 1) {
    for (const group of groups) {
      const signal = group[index];

      if (signal) {
        merged.push(signal);
      }
    }
  }

  return merged;
};

const stableOrder = (materials: Material[]): Material[] =>
  materials
    .map((material, index) => ({ material, index }))
    .sort((left, right) => {
      const createdAtDiff = left.material.createdAt.localeCompare(right.material.createdAt);
      return createdAtDiff !== 0 ? createdAtDiff : left.index - right.index;
    })
    .map(({ material }) => material);

const latestMatching = (
  materials: Material[],
  predicate: (material: Material) => boolean,
): Material | undefined => materials.filter(predicate).at(-1);

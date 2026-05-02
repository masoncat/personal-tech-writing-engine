import type { ArticleVersion, StyleProfile } from '@ptce/shared';

const METADATA_BLOCK_PATTERN = /\n## (Revision instruction|Style cues applied|Editorial note)[\s\S]*$/;
const RETROSPECTIVE_SECTION_ORDER = [
  '开场问题',
  '项目起步',
  '真实链路打通',
  '项目复杂化',
  '工程收口',
  '最后的判断',
];

export const rewriteMarkdown = (
  version: ArticleVersion,
  styleProfile: StyleProfile,
  instruction: string,
): string => {
  const cleanContent = stripMetadataBlocks(version.content);

  if (looksLikeRetrospectiveBlog(cleanContent)) {
    return rewriteRetrospectiveBlog(cleanContent, styleProfile, instruction);
  }

  return buildLegacyRewrite(cleanContent, styleProfile, instruction);
};

const rewriteRetrospectiveBlog = (
  content: string,
  styleProfile: StyleProfile,
  instruction: string,
): string => {
  const title = extractTitle(content);
  const sections = extractSections(content);
  const shortMode = /更短|短一点|简短|微信|weChat/i.test(instruction);
  const opening = shortMode ? buildShortOpening() : buildOpening();
  const signal = detectSignals(sections);
  const rewrittenSections = RETROSPECTIVE_SECTION_ORDER.map((sectionTitle) =>
    rewriteRetrospectiveSection(sectionTitle, sections[sectionTitle] ?? '', signal, shortMode),
  );

  const tailSections = Object.keys(sections)
    .filter((sectionTitle) => !RETROSPECTIVE_SECTION_ORDER.includes(sectionTitle))
    .map((sectionTitle) =>
      rewriteRetrospectiveSection(sectionTitle, sections[sectionTitle] ?? '', signal, shortMode),
    );

  const closing = shortMode
    ? '回头看，agent 最有用的地方是提速，但真正收口还是要我自己来。'
    : '回头看，agent 的价值在于帮我更快走到判断点，但真正的边界和取舍还是要我自己来。';

  return `# ${title}

${opening}

${[...rewrittenSections, ...tailSections].join('\n\n')}

${closing}`;
};

const rewriteRetrospectiveSection = (
  title: string,
  _body: string,
  signal: RetrospectiveSignals,
  shortMode: boolean,
): string => {
  const builders: Record<string, () => string[]> = {
    开场问题: () =>
      shortMode
        ? [
            '真正先要解决的，不是功能能不能跑，而是接口、路由和状态回写能不能对上。',
            'agent 能帮我更快看清局部，但断点还是要我自己确认。',
          ]
        : [
            '真正先要解决的，不是功能能不能跑，而是接口、路由和状态回写能不能对上。',
            '我把问题压回到可验证的链路上，重新看输入、路由和状态流转，先确认断点在哪。',
            'agent 在这里的作用是帮我更快看清局部，但真正的判断还是要我自己落下去。',
          ],
    项目起步: () =>
      shortMode
        ? [
            '起步时，我先把最小闭环跑起来，确认接口和回写能闭合。',
            'agent 只负责压缩重复劳动，不负责替我判断哪一步算完成。',
          ]
        : [
            '起步时，我先把最小闭环跑起来，确认接口、路由和回写都能闭合。',
            '这一步的重点不是做得多，而是把最小闭环压实，让每次请求都能走到结果。',
            'agent 能帮我把步骤梳顺，但不能替我决定哪一层才算真正跑通。',
          ],
    '真实链路打通': () =>
      shortMode
        ? [
            '真正把链路打通时，我盯住的是路由和数据落点。',
            '我让 agent 帮我梳理路由和日志，最后还是要我自己收口。',
          ]
        : [
            '真正把链路打通时，我盯住的是路由和数据落点。',
            '我让 agent 帮我梳理路由、日志和状态回写，确认每一跳是不是都真的落到了下一步。',
            '之前最容易误判的，就是把局部成功当成整体成功，所以这一步必须把源头追清楚。',
          ],
    '项目复杂化': () =>
      shortMode
        ? [
            '当并行步骤进来后，流程就变成了需要调度的动作。',
            'agent 可以帮我整理节奏，但不能替我处理边界。',
          ]
        : [
            '当并行步骤进来后，流程就变成了需要调度的动作。',
            '我把批量处理、异步任务和执行侧的节奏拆开，检查什么时候入队、什么时候回写、什么时候才算结束。',
            '这时候最重要的不是把事情写满，而是把责任边界和状态变化讲清楚。',
          ],
    '工程收口': () =>
      shortMode
        ? [
            '工程收口看的是部署和边界，不是功能想象。',
            'agent 能帮我整理收口项，但部署和边界还是要我来定。',
          ]
        : [
            '工程收口看的是部署和边界，不是功能想象。',
            '我去看部署、环境和数据落盘，确认哪些依赖必须收在一起，哪些可以继续拆开。',
            '如果边界不收紧，流程能跑也只是偶然，后面一变更就会重新脆弱。',
          ],
    '最后的判断': () =>
      shortMode
        ? [
            '最后的判断不在于用了多少技巧，而在于这条链路是不是已经能被反复验证。',
            'agent 能提速，但收口和判断还是得我来。',
          ]
        : [
            '最后的判断不在于用了多少技巧，而在于这条链路是不是已经能被反复验证。',
            '回看这些推进，我更清楚 agent 的价值在于提速和整理，而不是替我做边界决定。',
            '真正留下来的，是一条能稳定跑通的链路，而不是一版更像样的说明文。',
          ],
  };

  const paragraphs = builders[title]?.() ?? buildFallbackSection(title, signal, shortMode);

  return `## ${title}

${paragraphs.join('\n\n')}`;
};

const buildFallbackSection = (
  title: string,
  signal: RetrospectiveSignals,
  shortMode: boolean,
): string[] => {
  return [
    shortMode
      ? `这一段还是围绕 ${signal.problem || title}。`
      : `这一段还是围绕 ${signal.problem || title}。`,
    shortMode
      ? '我把接口、路由和状态回写再对一遍，确认没有漏掉的断点。'
      : '我把接口、路由和状态回写再对一遍，确认没有漏掉的断点。',
    '这一节先把判断落到具体问题上，再继续往下推进。',
  ];
};

const buildOpening = (): string =>
  '我重新看了一遍这版稿子，先说结论：agent 能帮我提速，但判断和收口还是得我来。';

const buildShortOpening = (): string =>
  '我把这版复盘压短了，但结论没变：agent 能帮我提速，边界还是要我来收。';

type RetrospectiveSignals = {
  problem: string;
  start: string;
  chain: string;
  complexity: string;
  infra: string;
  hasAsync: boolean;
  hasInfra: boolean;
};

const detectSignals = (sections: Record<string, string>): RetrospectiveSignals => {
  const text = Object.values(sections).join(' ').toLowerCase();
  const hasAsync = /异步|队列|worker|task|批量|批改|review|并行/.test(text);
  const hasInfra = /mysql|vpc|部署|落盘|数据库|storage|db|环境/.test(text);

  return {
    problem: hasAsync ? '链路已经能出结果，但中间还没真正咬合' : '功能已经能跑，但中间链路还没真正咬合',
    start: hasAsync ? '最小闭环' : '最小闭环',
    chain: hasAsync ? '路由和状态回写' : '路由和状态回写',
    complexity: hasAsync ? '并行步骤进来' : '流程开始变复杂',
    infra: hasInfra ? '部署和边界' : '工程边界',
    hasAsync,
    hasInfra,
  };
};

const buildLegacyRewrite = (
  content: string,
  styleProfile: StyleProfile,
  instruction: string,
): string => {
  const cues = [
    ...styleProfile.openingTraits,
    ...styleProfile.rhythmTraits,
    ...styleProfile.explanationTraits,
  ]
    .slice(0, 4)
    .map((trait) => `- ${trait}`)
    .join('\n');

  return `${content}

## Revision instruction

${instruction}

## Style cues applied

${cues}

## Editorial note

${styleProfile.summary}`;
};

const stripMetadataBlocks = (content: string): string => content.replace(METADATA_BLOCK_PATTERN, '').trim();

const looksLikeRetrospectiveBlog = (content: string): boolean =>
  /## 开场问题/.test(content) || /## 项目起步/.test(content) || /## 最后的判断/.test(content);

const extractTitle = (content: string): string => {
  const heading = content.split('\n').find((line) => /^#\s+/.test(line));
  return heading?.replace(/^#\s+/, '').trim() || '未命名文章';
};

const extractSections = (content: string): Record<string, string> => {
  const sections: Record<string, string> = {};
  const chunks = content.split(/\n## /);

  for (const chunk of chunks.slice(1)) {
    const [headerLine, ...bodyLines] = chunk.split('\n');
    const title = headerLine.trim();
    const body = bodyLines.join('\n').trim();

    sections[title] = body;
  }

  return sections;
};

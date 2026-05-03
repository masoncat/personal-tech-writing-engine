import type { VisualBrief } from '../types.js';

export interface PlanVisualBriefsInput {
  topic: string;
  sections: Array<{
    id: string;
    title: string;
    text: string;
  }>;
}

export const planVisualBriefs = ({ topic, sections }: PlanVisualBriefsInput): VisualBrief[] =>
  sections.slice(0, 4).map((section, index) => buildBrief({ topic, section, index }));

const buildBrief = ({
  topic,
  section,
  index,
}: {
  topic: string;
  section: { id: string; title: string; text: string };
  index: number;
}): VisualBrief => {
  const role = index === 0 ? 'comparison' : index === 3 ? 'dashboard' : 'concept_map';
  const style = role === 'dashboard' ? 'dark_dashboard' : 'wechat_infographic';
  const coreMessage = inferCoreMessage(section.text);

  return {
    id: `visual-brief-${index + 1}`,
    sectionId: section.id,
    placementAfterAnchor: section.text,
    role,
    coreMessage,
    chartText: buildChartText(coreMessage),
    style,
    prompt: buildPrompt({ topic, role, style, coreMessage }),
    negativePrompt: '不要通用办公插画，不要真人照片，不要长段文字，不要英文标签，不要喧宾夺主。',
  };
};

const inferCoreMessage = (text: string): string => {
  if (text.includes('代码产出') && text.includes('好软件')) {
    return '前端价值迁移：代码产出变便宜，体验和约束更值钱';
  }
  if (text.includes('约束设计者')) {
    return '前端把混乱需求和工程约束整理成界面状态系统';
  }
  if (text.includes('体验')) {
    return '前端定义 AI 产品的用户信任路径';
  }
  return text.slice(0, 80);
};

const buildChartText = (coreMessage: string): string[] => {
  if (coreMessage.includes('价值迁移')) {
    return ['下降的技能', 'AI 代码生成加速', '上升的技能', '不是转行，是换一种值钱法'];
  }
  if (coreMessage.includes('约束')) {
    return ['需求不清', '接口异常', '权限状态', '约束设计者', '界面状态矩阵'];
  }
  return ['输入', '状态', '风险', '验收', '结论'];
};

const buildPrompt = ({
  topic,
  role,
  style,
  coreMessage,
}: {
  topic: string;
  role: VisualBrief['role'];
  style: VisualBrief['style'];
  coreMessage: string;
}): string =>
  [
    `16:9 中文科技信息图，用于微信公众号文章《${topic}》。`,
    `主题：${coreMessage}。`,
    `图形类型：${role}，视觉风格：${style}。`,
    '要求：清晰中文大标题，图标、箭头、卡片、结论条，帮助读者理解文章观点。',
  ].join('');

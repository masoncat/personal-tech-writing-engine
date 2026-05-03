import type { ResearchQueryPlan } from '../types.js';

export interface PlanResearchQueriesInput {
  topic: string;
  currentDate: string;
  audience?: string;
}

export const planResearchQueries = ({
  topic,
  currentDate,
}: PlanResearchQueriesInput): ResearchQueryPlan => {
  const year = currentDate.slice(0, 4);
  const normalizedTopic = normalizeTopic(topic);

  return {
    topic,
    currentDate,
    queries: [
      {
        query: `${normalizedTopic} developer survey AI tools ${year} official report`,
        topic: 'general',
        intent: 'official_report',
        maxResults: 5,
        timeRange: 'year',
      },
      {
        query: `${normalizedTopic} AI developer trust agents ${year} official blog`,
        topic: 'general',
        intent: 'official_blog',
        maxResults: 5,
        timeRange: 'year',
      },
      {
        query: `GitHub Copilot coding agent frontend developers ${year} announcement`,
        topic: 'news',
        intent: 'product_announcement',
        maxResults: 5,
        timeRange: 'year',
      },
      {
        query: `OpenAI Codex Claude Code AI coding agent developers ${year} announcement`,
        topic: 'news',
        intent: 'product_announcement',
        maxResults: 5,
        timeRange: 'year',
      },
      {
        query: `AI generated code software delivery stability developers ${year} analysis`,
        topic: 'news',
        intent: 'news_analysis',
        maxResults: 5,
        timeRange: 'year',
      },
      {
        query: `AI coding tools developer skepticism trust accuracy ${year}`,
        topic: 'general',
        intent: 'counterpoint',
        maxResults: 5,
        timeRange: 'year',
      },
    ],
  };
};

const normalizeTopic = (topic: string): string => {
  if (/前端|frontend/i.test(topic)) {
    return 'frontend engineers';
  }

  return topic.trim();
};

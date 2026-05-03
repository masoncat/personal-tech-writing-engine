import { ResearchMediaError } from '../errors.js';
import type { WebSearchRequest, WebSearchResult } from '../types.js';

interface TavilyProviderOptions {
  apiKey: string;
  fetchFn?: typeof fetch;
}

interface TavilySearchResponse {
  results?: Array<{
    title?: string;
    url?: string;
    content?: string;
    raw_content?: string;
    published_date?: string;
    score?: number;
  }>;
}

export const createTavilyProvider = ({ apiKey, fetchFn = fetch }: TavilyProviderOptions) => ({
  async searchWeb(request: WebSearchRequest): Promise<WebSearchResult> {
    if (!apiKey) {
      throw new ResearchMediaError('missing_provider_config', 'TAVILY_API_KEY is required.');
    }

    const response = await fetchFn('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        query: request.query,
        topic: request.topic ?? 'general',
        max_results: request.maxResults ?? 5,
        time_range: request.timeRange,
        start_date: request.startDate,
        end_date: request.endDate,
        include_raw_content: request.includeRawContent ?? false,
        include_images: request.includeImages ?? false,
      }),
    });

    if (!response.ok) {
      throw new ResearchMediaError('provider_request_failed', 'Tavily search request failed.', { status: response.status });
    }

    const payload = await response.json() as TavilySearchResponse;
    return {
      query: request.query,
      provider: 'tavily',
      results: (payload.results ?? []).flatMap((item) => {
        if (!item.url) {
          return [];
        }
        const url = new URL(item.url);
        return [{
          title: item.title ?? item.url,
          url: item.url,
          sourceDomain: url.hostname,
          snippet: item.content ?? '',
          publishedAt: item.published_date,
          score: item.score,
          rawContent: item.raw_content,
          evidenceStrength: 'candidate' as const,
        }];
      }),
    };
  },
});

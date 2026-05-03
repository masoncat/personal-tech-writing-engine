import { ResearchMediaError } from '../errors.js';
import type { MediaAsset, MemeSearchRequest } from '../types.js';

interface KlipyProviderOptions {
  apiKey: string;
  fetchFn?: typeof fetch;
  baseUrl?: string;
}

interface KlipyResponse {
  data?: Array<{
    id?: string;
    title?: string;
    url?: string;
    source_url?: string;
    preview?: string;
  }>;
}

export const createKlipyProvider = ({
  apiKey,
  fetchFn = fetch,
  baseUrl = 'https://api.klipy.com/api/v1',
}: KlipyProviderOptions) => ({
  async searchMemes(request: MemeSearchRequest): Promise<MediaAsset[]> {
    if (!apiKey) {
      throw new ResearchMediaError('missing_provider_config', 'KLIPY_API_KEY is required.');
    }

    const url = new URL(`${baseUrl}/memes/search`);
    url.searchParams.set('q', request.query);
    url.searchParams.set('limit', String(request.maxResults ?? 5));

    const response = await fetchFn(url.href, {
      headers: { authorization: `Bearer ${apiKey}` },
    });
    if (!response.ok) {
      throw new ResearchMediaError('provider_request_failed', 'KLIPY meme search request failed.', { status: response.status });
    }

    const payload = await response.json() as KlipyResponse;
    return (payload.data ?? []).map((item, index) => ({
      id: `klipy-${item.id ?? index}`,
      kind: 'klipy_meme',
      url: item.url ?? item.preview,
      title: item.title,
      sourceUrl: item.source_url,
      provider: 'klipy',
      attribution: 'Media from KLIPY',
      generated: false,
    }));
  },
});

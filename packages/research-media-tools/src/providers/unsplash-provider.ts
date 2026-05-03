import { ResearchMediaError } from '../errors.js';
import type { MediaAsset, PhotoSearchRequest } from '../types.js';

interface UnsplashProviderOptions {
  accessKey: string;
  fetchFn?: typeof fetch;
}

interface UnsplashResponse {
  results?: Array<{
    id: string;
    description?: string;
    alt_description?: string;
    urls?: { regular?: string };
    links?: { html?: string; download_location?: string };
    user?: { name?: string; links?: { html?: string } };
  }>;
}

export const createUnsplashProvider = ({ accessKey, fetchFn = fetch }: UnsplashProviderOptions) => ({
  async searchPhotos(request: PhotoSearchRequest): Promise<MediaAsset[]> {
    if (!accessKey) {
      throw new ResearchMediaError('missing_provider_config', 'UNSPLASH_ACCESS_KEY is required.');
    }

    const url = new URL('https://api.unsplash.com/search/photos');
    url.searchParams.set('query', request.query);
    url.searchParams.set('per_page', String(request.maxResults ?? 5));
    if (request.orientation) {
      url.searchParams.set('orientation', request.orientation);
    }

    const response = await fetchFn(url.href, {
      headers: { authorization: `Client-ID ${accessKey}` },
    });
    if (!response.ok) {
      throw new ResearchMediaError('provider_request_failed', 'Unsplash search request failed.', { status: response.status });
    }

    const payload = await response.json() as UnsplashResponse;
    return (payload.results ?? []).map((photo) => ({
      id: `unsplash-${photo.id}`,
      kind: 'unsplash_photo',
      url: photo.urls?.regular,
      title: photo.description ?? photo.alt_description,
      alt: photo.alt_description,
      sourceUrl: photo.links?.html,
      provider: 'unsplash',
      author: photo.user?.name,
      attribution: `Photo by ${photo.user?.name ?? 'Unknown photographer'} on Unsplash`,
      generated: false,
    }));
  },
});

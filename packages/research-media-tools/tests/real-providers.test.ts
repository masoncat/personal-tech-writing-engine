import { describe, expect, it, vi } from 'vitest';

import {
  createMemegenProvider,
  createOpenAIImageProvider,
  createPageExtractor,
  createTavilyProvider,
  createUnsplashProvider,
  ResearchMediaError,
} from '../src/index.js';

describe('real provider adapters', () => {
  it('throws configuration errors when required keys are missing', async () => {
    const provider = createTavilyProvider({ apiKey: '', fetchFn: vi.fn() as unknown as typeof fetch });

    await expect(provider.searchWeb({ query: 'test' })).rejects.toBeInstanceOf(ResearchMediaError);
  });

  it('maps Tavily search responses into normalized web results', async () => {
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse({
      results: [
        {
          title: 'Source title',
          url: 'https://example.com/post',
          content: 'Search snippet',
          published_date: '2026-05-03',
          score: 0.8,
        },
      ],
    }));
    const provider = createTavilyProvider({ apiKey: 'tavily-key', fetchFn });

    const result = await provider.searchWeb({ query: 'latest ai news', topic: 'news' });

    expect(fetchFn).toHaveBeenCalledWith('https://api.tavily.com/search', expect.objectContaining({ method: 'POST' }));
    expect(result.results[0]).toMatchObject({
      sourceDomain: 'example.com',
      evidenceStrength: 'candidate',
    });
  });

  it('extracts title, article body, and page images from static html', async () => {
    const extractor = createPageExtractor({
      fetchFn: vi.fn().mockResolvedValue(textResponse('<html><head><title>Article title</title><meta property="article:published_time" content="2026-05-03"></head><body><article><p>First paragraph.</p><figure><img src="/hero.jpg" alt="Hero"><figcaption>Hero caption</figcaption></figure></article></body></html>')) as unknown as typeof fetch,
    });

    const result = await extractor.extractPage({ url: 'https://example.com/post' });

    expect(result.title).toBe('Article title');
    expect(result.textContent).toContain('First paragraph.');
    expect(result.images[0]).toMatchObject({
      imageUrl: 'https://example.com/hero.jpg',
      caption: 'Hero caption',
    });
  });

  it('maps Unsplash responses and keeps attribution metadata', async () => {
    const provider = createUnsplashProvider({
      accessKey: 'unsplash-key',
      fetchFn: vi.fn().mockResolvedValue(jsonResponse({
        results: [
          {
            id: 'photo1',
            description: 'Desk photo',
            alt_description: 'A desk',
            urls: { regular: 'https://images.unsplash.com/photo.jpg' },
            links: { html: 'https://unsplash.com/photos/photo1', download_location: 'https://api.unsplash.com/photos/photo1/download' },
            user: { name: 'Photographer', links: { html: 'https://unsplash.com/@photographer' } },
          },
        ],
      })) as unknown as typeof fetch,
    });

    const assets = await provider.searchPhotos({ query: 'desk' });

    expect(assets[0]).toMatchObject({
      kind: 'unsplash_photo',
      provider: 'unsplash',
      author: 'Photographer',
      attribution: 'Photo by Photographer on Unsplash',
    });
  });

  it('builds memegen image URLs without network calls', async () => {
    const provider = createMemegenProvider();
    const asset = await provider.generateMeme({ template: 'drake', top: 'old way', bottom: 'new way' });

    expect(asset.url).toBe('https://api.memegen.link/images/drake/old-way/new-way.jpg');
  });

  it('calls OpenAI image generation with gpt-image-2', async () => {
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse({
      data: [{ b64_json: Buffer.from('mock image').toString('base64') }],
    }));
    const provider = createOpenAIImageProvider({ apiKey: 'openai-key', fetchFn, writeFile: vi.fn().mockResolvedValue(undefined) });

    const asset = await provider.generateImage({ prompt: 'A focused concept image', outputDirectory: 'artifacts/images' });

    expect(fetchFn).toHaveBeenCalledWith('https://api.openai.com/v1/images/generations', expect.objectContaining({ method: 'POST' }));
    expect(asset).toMatchObject({
      kind: 'generated_image',
      provider: 'openai',
      model: 'gpt-image-2',
      generated: true,
    });
  });
});

const jsonResponse = (body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });

const textResponse = (body: string): Response =>
  new Response(body, {
    status: 200,
    headers: { 'content-type': 'text/html' },
  });

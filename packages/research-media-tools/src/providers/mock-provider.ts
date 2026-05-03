import type {
  ExtractedPageImage,
  ImageGenerationRequest,
  MediaAsset,
  MemeGenerationRequest,
  MemeSearchRequest,
  PageExtractionRequest,
  PageExtractionResult,
  PhotoSearchRequest,
  WebSearchRequest,
  WebSearchResult,
} from '../types.js';

export interface ResearchMediaProvider {
  searchWeb(request: WebSearchRequest): Promise<WebSearchResult>;
  extractPage(request: PageExtractionRequest): Promise<PageExtractionResult>;
  searchPhotos(request: PhotoSearchRequest): Promise<MediaAsset[]>;
  searchMemes(request: MemeSearchRequest): Promise<MediaAsset[]>;
  generateMeme(request: MemeGenerationRequest): Promise<MediaAsset>;
  generateImage(request: ImageGenerationRequest): Promise<MediaAsset>;
}

export const createMockResearchMediaProvider = (): ResearchMediaProvider => ({
  async searchWeb(request) {
    return {
      query: request.query,
      provider: 'mock',
      results: [
        {
          title: `Mock source for ${request.query}`,
          url: 'https://example.com/article',
          sourceDomain: 'example.com',
          snippet: `Mock snippet for ${request.query}`,
          publishedAt: '2026-05-03T00:00:00.000Z',
          score: 0.91,
          evidenceStrength: 'candidate',
        },
      ],
    };
  },
  async extractPage(request) {
    const image: ExtractedPageImage = {
      imageUrl: 'https://example.com/article-hero.jpg',
      sourcePageUrl: request.url,
      alt: 'OpenAI image generation announcement',
      caption: 'Mock extracted article body says OpenAI released an image generation announcement.',
      nearbyText: 'Mock extracted article body says OpenAI released an image generation announcement.',
      roleHint: 'hero',
    };

    return {
      url: request.url,
      canonicalUrl: request.url,
      title: 'Mock extracted article',
      author: 'Mock Reporter',
      publishedAt: '2026-05-03T00:00:00.000Z',
      extractedAt: '2026-05-03T00:00:00.000Z',
      textContent: 'Mock extracted article body with enough context to cite.',
      evidenceBlocks: [
        {
          sourceUrl: request.url,
          text: 'Mock extracted article body with enough context to cite.',
        },
      ],
      images: [image],
      warnings: [],
    };
  },
  async searchPhotos(request) {
    return [
      {
        id: `mock-unsplash-${slugify(request.query)}`,
        kind: 'unsplash_photo',
        url: 'https://images.unsplash.com/mock.jpg',
        title: `Mock Unsplash photo for ${request.query}`,
        sourceUrl: 'https://unsplash.com/photos/mock',
        provider: 'unsplash',
        author: 'Mock Photographer',
        attribution: 'Photo by Mock Photographer on Unsplash',
        generated: false,
      },
    ];
  },
  async searchMemes(request) {
    return [
      {
        id: `mock-klipy-${slugify(request.query)}`,
        kind: 'klipy_meme',
        url: 'https://media.klipy.com/mock.gif',
        title: `Mock meme for ${request.query}`,
        sourceUrl: 'https://klipy.com/mock',
        provider: 'klipy',
        attribution: 'Mock KLIPY media',
        generated: false,
      },
    ];
  },
  async generateMeme(request) {
    return {
      id: `mock-memegen-${request.template}`,
      kind: 'memegen_image',
      url: `https://api.memegen.link/images/${request.template}/${encodeSegment(request.top)}/${encodeSegment(request.bottom)}.${request.format ?? 'jpg'}`,
      title: `Generated meme: ${request.template}`,
      provider: 'memegen',
      generated: true,
    };
  },
  async generateImage(request) {
    return {
      id: `mock-generated-${slugify(request.prompt)}`,
      kind: 'generated_image',
      localPath: `${request.outputDirectory ?? 'artifacts/images'}/mock-generated-image.png`,
      title: 'Mock generated image',
      provider: 'openai',
      generated: true,
      model: request.model ?? 'gpt-image-2',
      prompt: request.prompt,
    };
  },
});

const slugify = (value: string): string =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'item';

const encodeSegment = (value: string): string =>
  encodeURIComponent(value.trim().replace(/\s+/g, '-'));

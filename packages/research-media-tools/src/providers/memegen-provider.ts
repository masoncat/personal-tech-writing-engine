import type { MediaAsset, MemeGenerationRequest } from '../types.js';

export const createMemegenProvider = () => ({
  async generateMeme(request: MemeGenerationRequest): Promise<MediaAsset> {
    const format = request.format ?? 'jpg';
    return {
      id: `memegen-${request.template}-${slug(request.top)}-${slug(request.bottom)}`,
      kind: 'memegen_image',
      url: `https://api.memegen.link/images/${request.template}/${slug(request.top)}/${slug(request.bottom)}.${format}`,
      title: `Generated meme from ${request.template}`,
      sourceUrl: 'https://api.memegen.link/',
      provider: 'memegen',
      generated: true,
    };
  },
});

const slug = (value: string): string =>
  encodeURIComponent(value.trim().replace(/\s+/g, '-'));

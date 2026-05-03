import type { ResearchMediaProvider } from './mock-provider.js';
import { createKlipyProvider } from './klipy-provider.js';
import { createMemegenProvider } from './memegen-provider.js';
import { createOpenAIImageProvider } from './openai-image-provider.js';
import { createPageExtractor } from './page-extractor.js';
import { createTavilyProvider } from './tavily-provider.js';
import { createUnsplashProvider } from './unsplash-provider.js';

export interface RealProviderConfig {
  tavilyApiKey: string;
  unsplashAccessKey: string;
  klipyApiKey: string;
  openaiApiKey: string;
  openaiBaseUrl?: string;
  openaiImageModel?: string;
  openaiImageApiStyle?: 'openai-images' | 'gemini-generate-content';
  openaiImageEndpoint?: string;
  fetchFn?: typeof fetch;
}

export const createRealResearchMediaProvider = (config: RealProviderConfig): ResearchMediaProvider => {
  const tavily = createTavilyProvider({ apiKey: config.tavilyApiKey, fetchFn: config.fetchFn });
  const extractor = createPageExtractor({ fetchFn: config.fetchFn });
  const unsplash = createUnsplashProvider({ accessKey: config.unsplashAccessKey, fetchFn: config.fetchFn });
  const klipy = createKlipyProvider({ apiKey: config.klipyApiKey, fetchFn: config.fetchFn });
  const memegen = createMemegenProvider();
  const openai = createOpenAIImageProvider({
    apiKey: config.openaiApiKey,
    baseUrl: config.openaiBaseUrl,
    defaultModel: config.openaiImageModel,
    apiStyle: config.openaiImageApiStyle,
    endpointPath: config.openaiImageEndpoint,
    fetchFn: config.fetchFn,
  });

  return {
    searchWeb: tavily.searchWeb,
    extractPage: extractor.extractPage,
    searchPhotos: unsplash.searchPhotos,
    searchMemes: klipy.searchMemes,
    generateMeme: memegen.generateMeme,
    generateImage: openai.generateImage,
  };
};

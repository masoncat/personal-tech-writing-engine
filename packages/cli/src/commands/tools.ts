import { Command, InvalidArgumentError } from 'commander';

import {
  createMediaPlan,
  createMockResearchMediaProvider,
  createRealResearchMediaProvider,
  createResearchPackage,
  type ResearchMediaProvider,
} from '@ptce/research-media-tools';

import {
  OUTPUT_FORMATS,
  createChoiceParser,
  type OutputFormat,
  type Writer,
  writeRenderedOutput,
} from '../output/renderers.js';

export type CreateResearchPackageLike = typeof createResearchPackage;

interface ToolsCommandDependencies {
  createToolsProvider: () => Partial<ResearchMediaProvider>;
  createResearchPackage?: typeof createResearchPackage;
  stdout: Writer;
}

interface CommonOptions {
  render: OutputFormat;
}

export const createDefaultToolsProvider = (): ResearchMediaProvider => {
  if (process.env.PTCE_TOOLS_PROVIDER_MODE === 'mock') {
    return createMockResearchMediaProvider();
  }

  return createRealResearchMediaProvider({
    tavilyApiKey: process.env.TAVILY_API_KEY ?? '',
    unsplashAccessKey: process.env.UNSPLASH_ACCESS_KEY ?? '',
    klipyApiKey: process.env.KLIPY_API_KEY ?? '',
    openaiApiKey: process.env.OPENAI_API_KEY ?? '',
    openaiBaseUrl: process.env.OPENAI_BASE_URL,
    openaiImageModel: process.env.OPENAI_IMAGE_MODEL,
    openaiImageApiStyle: process.env.OPENAI_IMAGE_API_STYLE as 'openai-images' | 'gemini-generate-content' | undefined,
    openaiImageEndpoint: process.env.OPENAI_IMAGE_ENDPOINT,
  });
};

export const registerToolsCommands = (
  program: Command,
  dependencies: ToolsCommandDependencies,
): void => {
  const { createToolsProvider, stdout } = dependencies;
  const createResearch = dependencies.createResearchPackage ?? createResearchPackage;
  const tools = program.command('tools').description('Search, extract, and plan research media');
  const search = tools.command('search').description('Search web, photos, and memes');

  withCommonOptions(
    search
      .command('web')
      .description('Search web sources')
      .requiredOption('--query <query>', 'Search query')
      .option('--topic <topic>', 'Search topic', 'general')
      .action(async (options: CommonOptions & { query: string; topic: 'general' | 'news' }) => {
        const provider = createToolsProvider();
        const result = await requireMethod(provider.searchWeb, 'searchWeb')({
          query: options.query,
          topic: options.topic,
        });
        writeRenderedOutput(stdout, result, options.render);
      }),
  );

  withCommonOptions(
    search
      .command('photo')
      .description('Search Unsplash photos')
      .requiredOption('--query <query>', 'Search query')
      .action(async (options: CommonOptions & { query: string }) => {
        const provider = createToolsProvider();
        const result = await requireMethod(provider.searchPhotos, 'searchPhotos')({ query: options.query });
        writeRenderedOutput(stdout, result, options.render);
      }),
  );

  withCommonOptions(
    search
      .command('meme')
      .description('Search KLIPY memes')
      .requiredOption('--query <query>', 'Search query')
      .action(async (options: CommonOptions & { query: string }) => {
        const provider = createToolsProvider();
        const result = await requireMethod(provider.searchMemes, 'searchMemes')({ query: options.query });
        writeRenderedOutput(stdout, result, options.render);
      }),
  );

  const page = tools.command('page').description('Extract web pages');
  withCommonOptions(
    page
      .command('extract')
      .description('Extract a web page')
      .requiredOption('--url <url>', 'Page URL')
      .action(async (options: CommonOptions & { url: string }) => {
        const provider = createToolsProvider();
        const result = await requireMethod(provider.extractPage, 'extractPage')({ url: options.url });
        writeRenderedOutput(stdout, result, options.render);
      }),
  );

  const meme = tools.command('meme').description('Generate memes');
  withCommonOptions(
    meme
      .command('generate')
      .requiredOption('--template <template>', 'memegen template')
      .requiredOption('--top <text>', 'Top text')
      .requiredOption('--bottom <text>', 'Bottom text')
      .action(async (options: CommonOptions & { template: string; top: string; bottom: string }) => {
        const provider = createToolsProvider();
        const result = await requireMethod(provider.generateMeme, 'generateMeme')({
          template: options.template,
          top: options.top,
          bottom: options.bottom,
        });
        writeRenderedOutput(stdout, result, options.render);
      }),
  );

  const image = tools.command('image').description('Generate images');
  withCommonOptions(
    image
      .command('generate')
      .requiredOption('--prompt <prompt>', 'Image prompt')
      .option('--model <model>', 'Image model')
      .action(async (options: CommonOptions & { prompt: string; model?: string }) => {
        const provider = createToolsProvider();
        const result = await requireMethod(provider.generateImage, 'generateImage')({
          prompt: options.prompt,
          model: options.model,
        });
        writeRenderedOutput(stdout, result, options.render);
      }),
  );

  const media = tools.command('media').description('Plan article media');
  withCommonOptions(
    media
      .command('plan')
      .requiredOption('--title <title>', 'Article title')
      .requiredOption('--section <section>', 'Article section text')
      .action(async (options: CommonOptions & { title: string; section: string }) => {
        const provider = createToolsProvider() as ResearchMediaProvider;
        const result = await createMediaPlan({
          articleTitle: options.title,
          sections: [{ id: 'section-1', text: options.section }],
          provider,
        });
        writeRenderedOutput(stdout, result, options.render);
      }),
  );

  withCommonOptions(
    tools
      .command('research')
      .description('Create a research package')
      .requiredOption('--query <query>', 'Research query')
      .option('--topic <topic>', 'Search topic', 'news')
      .option('--max-results <count>', 'Max search results', parsePositiveInt)
      .option('--time-range <range>', 'Search time range (day, week, month, year)', createChoiceParser(['day', 'week', 'month', 'year'] as const, '--time-range'))
      .option('--include-raw-content', 'Include raw provider content', false)
      .action(async (options: CommonOptions & {
        query: string;
        topic: 'general' | 'news';
        maxResults?: number;
        timeRange?: 'day' | 'week' | 'month' | 'year';
        includeRawContent: boolean;
      }) => {
        const provider = createToolsProvider() as ResearchMediaProvider;
        const result = await createResearch({
          queries: [{
            query: options.query,
            topic: options.topic,
            maxResults: options.maxResults,
            timeRange: options.timeRange,
            includeRawContent: options.includeRawContent,
          }],
          provider,
        });
        writeRenderedOutput(stdout, result, options.render);
      }),
  );
};

const withCommonOptions = <T extends Command>(command: T): T =>
  command.option(
    '--render <format>',
    `Output format (${OUTPUT_FORMATS.join(', ')})`,
    createChoiceParser(OUTPUT_FORMATS, '--render'),
    OUTPUT_FORMATS[1],
  );

const requireMethod = <T extends (...args: never[]) => unknown>(method: T | undefined, name: string): T => {
  if (!method) {
    throw new Error(`Tools provider does not implement ${name}`);
  }
  return method;
};

const parsePositiveInt = (value: string): number => {
  if (!/^\d+$/.test(value)) {
    throw new InvalidArgumentError('--max-results must be a positive integer');
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new InvalidArgumentError('--max-results must be a positive integer');
  }
  return parsed;
};

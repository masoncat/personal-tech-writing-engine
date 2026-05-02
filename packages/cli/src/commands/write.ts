import { Command, InvalidArgumentError } from 'commander';

import type { ExportChannel } from '@ptce/shared';

import { DEFAULT_BASE_URL, type ApiClientLike } from '../client/api-client.js';
import {
  OUTPUT_FORMATS,
  createChoiceParser,
  type OutputFormat,
  type Writer,
  writeRenderedOutput,
} from '../output/renderers.js';
import type {
  EditorialMode,
  ModelEnhancementMode,
  ProjectWriteOptions,
  ProjectWriteResult,
  WriteStopAt,
} from '../write/types.js';

export interface ProjectWriteRunnerLike {
  run(options: ProjectWriteOptions): Promise<ProjectWriteResult>;
}

export interface WriteCommandDependencies {
  createApiClient: (options: { baseUrl: string }) => ApiClientLike;
  createWriteProjectRunner: (options: {
    baseUrl: string;
    createApiClient: (options: { baseUrl: string }) => ApiClientLike;
  }) => ProjectWriteRunnerLike;
  stdout: Writer;
}

const CHANNELS = ['blog', 'wechat'] as const;
const STOP_POINTS = ['bedrock', 'outline', 'draft', 'rewrite', 'export'] as const;
const EDITORIAL_MODES = ['none', 'publishable'] as const;
const MODEL_MODES = ['off', 'select-only', 'standard'] as const;

interface CommonOptions {
  baseUrl: string;
  render: OutputFormat;
}

interface ProjectCommandOptions extends CommonOptions {
  projectPath: string;
  title: string;
  articleType: string;
  reader: string;
  goal?: string;
  channel: ExportChannel;
  stopAt: WriteStopAt;
  editorialMode: EditorialMode;
  export: boolean;
  exportPath?: string;
  obsidianVaultPath?: string;
  sourcePaths?: string[];
  withGitLog?: boolean;
  withoutGitLog?: boolean;
  withObsidianContext: boolean;
  maxMaterials?: number;
  modelEnhancement: ModelEnhancementMode;
}

export const registerWriteCommands = (
  program: Command,
  { createApiClient, createWriteProjectRunner, stdout }: WriteCommandDependencies,
): void => {
  const write = program.command('write').description('Run high-level PTCE writing workflows');

  withCommonOptions(
    write
      .command('project')
      .description('Generate a writing task from a local project directory')
      .requiredOption('--project-path <path>', 'Local project root path')
      .requiredOption('--title <title>', 'Writing task title')
      .requiredOption('--article-type <articleType>', 'Writing article type')
      .requiredOption('--reader <reader>', 'Target reader')
      .option('--goal <goal>', 'Writing goal')
      .option(
        '--channel <channel>',
        `Preferred channel (${CHANNELS.join(', ')})`,
        createChoiceParser(CHANNELS, '--channel'),
        CHANNELS[0],
      )
      .option(
        '--stop-at <stopAt>',
        `Workflow stop point (${STOP_POINTS.join(', ')})`,
        createChoiceParser(STOP_POINTS, '--stop-at'),
        'draft',
      )
      .option(
        '--editorial-mode <mode>',
        `Editorial finishing mode (${EDITORIAL_MODES.join(', ')})`,
        createChoiceParser(EDITORIAL_MODES, '--editorial-mode'),
        'none',
      )
      .option('--export', 'Run export after the requested stop point', false)
      .option('--export-path <path>', 'Export output path')
      .option('--obsidian-vault-path <path>', 'Obsidian vault path')
      .option('--source-paths <paths...>', 'Specific project paths to scan')
      .option('--with-git-log', 'Include recent git history', true)
      .option('--without-git-log', 'Skip recent git history')
      .option('--with-obsidian-context', 'Include Obsidian context sources', false)
      .option(
        '--max-materials <count>',
        'Max workflow materials',
        parsePositiveInt,
      )
      .option(
        '--model-enhancement <mode>',
        `Model enhancement mode (${MODEL_MODES.join(', ')})`,
        createChoiceParser(MODEL_MODES, '--model-enhancement'),
        'standard',
      )
      .action(async (options: ProjectCommandOptions) => {
        const runner = createWriteProjectRunner({
          baseUrl: options.baseUrl,
          createApiClient,
        });
        const result = await runner.run({
          projectPath: options.projectPath,
          title: options.title,
          articleType: options.articleType,
          reader: options.reader,
          goal: options.goal,
          channel: options.channel,
          stopAt: options.stopAt,
          editorialMode: options.editorialMode,
          export: options.export,
          exportPath: options.exportPath,
          obsidianVaultPath: options.obsidianVaultPath,
          sourcePaths: options.sourcePaths,
          withGitLog: options.withoutGitLog ? false : (options.withGitLog ?? true),
          withObsidianContext: options.withObsidianContext,
          maxMaterials: options.maxMaterials,
          modelEnhancement: options.modelEnhancement,
        });

        writeRenderedOutput(stdout, result, options.render);
      }),
  );
};

const withCommonOptions = <T extends Command>(command: T): T =>
  command
    .option('--base-url <url>', 'PTCE API base URL', DEFAULT_BASE_URL)
    .option(
      '--render <format>',
      `Output format (${OUTPUT_FORMATS.join(', ')})`,
      createChoiceParser(OUTPUT_FORMATS, '--render'),
      OUTPUT_FORMATS[1],
    );

const parsePositiveInt = (value: string): number => {
  if (!/^\d+$/.test(value)) {
    throw new InvalidArgumentError('--max-materials must be a positive integer');
  }

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new InvalidArgumentError('--max-materials must be a positive integer');
  }

  return parsed;
};

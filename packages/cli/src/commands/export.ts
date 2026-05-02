import { Command } from 'commander';

import type {
  ExportChannel,
  ExportFormat,
  ExportResponse,
  ExportTarget,
  GenerateExportRequest,
} from '@ptce/shared';

import { DEFAULT_BASE_URL, type ApiClientLike } from '../client/api-client.js';
import {
  OUTPUT_FORMATS,
  createChoiceParser,
  type OutputFormat,
  type Writer,
  writeRenderedOutput,
} from '../output/renderers.js';

const EXPORT_CHANNELS = ['blog', 'wechat'] as const;
const EXPORT_FORMATS = ['markdown'] as const;
const EXPORT_TARGETS = ['local', 'obsidian'] as const;

interface ExportCommandDependencies {
  createApiClient: (options: { baseUrl: string }) => ApiClientLike;
  stdout: Writer;
}

interface ExportOptions extends CommonOptions {
  versionId: string;
  channel: ExportChannel;
  format: ExportFormat;
  target?: ExportTarget;
  outputPath?: string;
  vaultPath?: string;
}

interface CommonOptions {
  baseUrl: string;
  render: OutputFormat;
}

const DEFAULT_OBSIDIAN_EXPORT_DIR = 'content-engine/articles';

export const registerExportCommands = (
  program: Command,
  { createApiClient, stdout }: ExportCommandDependencies,
): void => {
  const exportCommand = program.command('export').description('Run export workflows');

  withCommonOptions(
    exportCommand
      .command('run')
      .description('Export a version to local or Obsidian output')
      .argument('<taskId>', 'Task identifier')
      .requiredOption('--version-id <versionId>', 'Version identifier')
      .requiredOption(
        '--channel <channel>',
        `Export channel (${EXPORT_CHANNELS.join(', ')})`,
        createChoiceParser(EXPORT_CHANNELS, '--channel'),
      )
      .requiredOption(
        '--format <format>',
        `Export format (${EXPORT_FORMATS.join(', ')})`,
        createChoiceParser(EXPORT_FORMATS, '--format'),
      )
      .option(
        '--target <target>',
        `Export target (${EXPORT_TARGETS.join(', ')})`,
        createChoiceParser(EXPORT_TARGETS, '--target'),
        getDefaultExportTarget(),
      )
      .option('--output-path <path>', 'Relative or local output path')
      .option('--vault-path <path>', 'Obsidian vault path', getDefaultObsidianVaultPath())
      .action(async (taskId: string, options: ExportOptions) => {
        const client = createApiClient({ baseUrl: options.baseUrl });
        const response = await client.request<ExportResponse>({
          method: 'POST',
          path: `/tasks/${taskId}/exports`,
          body: buildExportRequest(taskId, options),
        });

        writeRenderedOutput(stdout, response, options.render);
      }),
  );
};

const buildExportRequest = (taskId: string, options: ExportOptions): GenerateExportRequest => {
  if (options.target === 'obsidian') {
    if (!options.vaultPath) {
      throw new Error(
        '--vault-path is required when --target=obsidian unless PTCE_OBSIDIAN_VAULT_PATH is set',
      );
    }

    return {
      versionId: options.versionId,
      channel: options.channel,
      format: options.format,
      target: 'obsidian',
      vaultPath: options.vaultPath,
      outputPath: options.outputPath ?? createDefaultObsidianOutputPath(taskId, options.channel),
    };
  }

  return {
    versionId: options.versionId,
    channel: options.channel,
    format: options.format,
    target: 'local',
    outputPath: options.outputPath,
  };
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

const getDefaultObsidianVaultPath = (): string | undefined => {
  const value = process.env.PTCE_OBSIDIAN_VAULT_PATH?.trim();
  return value && value.length > 0 ? value : undefined;
};

const getDefaultExportTarget = (): ExportTarget =>
  getDefaultObsidianVaultPath() ? 'obsidian' : 'local';

const createDefaultObsidianOutputPath = (
  taskId: string,
  channel: ExportChannel,
): string => `${DEFAULT_OBSIDIAN_EXPORT_DIR}/${taskId}-${channel}.md`;

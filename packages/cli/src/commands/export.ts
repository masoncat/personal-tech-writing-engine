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
      .requiredOption('--channel <channel>', 'Export channel')
      .requiredOption('--format <format>', 'Export format')
      .option('--target <target>', 'Export target', 'local')
      .option('--output-path <path>', 'Relative or local output path')
      .option('--vault-path <path>', 'Obsidian vault path')
      .action(async (taskId: string, options: ExportOptions) => {
        const client = createApiClient({ baseUrl: options.baseUrl });
        const response = await client.request<ExportResponse>({
          method: 'POST',
          path: `/tasks/${taskId}/exports`,
          body: buildExportRequest(options),
        });

        writeRenderedOutput(stdout, response, options.render);
      }),
  );
};

const buildExportRequest = (options: ExportOptions): GenerateExportRequest => {
  if (options.target === 'obsidian') {
    if (!options.vaultPath || !options.outputPath) {
      throw new Error('--vault-path and --output-path are required when --target=obsidian');
    }

    return {
      versionId: options.versionId,
      channel: options.channel,
      format: options.format,
      target: 'obsidian',
      vaultPath: options.vaultPath,
      outputPath: options.outputPath,
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
    .option('--render <format>', `Output format (${OUTPUT_FORMATS.join(', ')})`, OUTPUT_FORMATS[1]);

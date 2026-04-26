import { Command } from 'commander';

import type { GenerateRewriteRequest, VersionResponse } from '@ptce/shared';

import { DEFAULT_BASE_URL, type ApiClientLike } from '../client/api-client.js';
import {
  OUTPUT_FORMATS,
  type OutputFormat,
  type Writer,
  writeRenderedOutput,
} from '../output/renderers.js';

interface RewriteCommandDependencies {
  createApiClient: (options: { baseUrl: string }) => ApiClientLike;
  stdout: Writer;
}

interface RewriteOptions extends CommonOptions {
  versionId: string;
  instruction: string;
}

interface CommonOptions {
  baseUrl: string;
  render: OutputFormat;
}

export const registerRewriteCommands = (
  program: Command,
  { createApiClient, stdout }: RewriteCommandDependencies,
): void => {
  const rewrite = program.command('rewrite').description('Run rewrite workflows');

  withCommonOptions(
    rewrite
      .command('run')
      .description('Generate a rewrite from an existing version')
      .argument('<taskId>', 'Task identifier')
      .requiredOption('--version-id <versionId>', 'Source version identifier')
      .requiredOption('--instruction <instruction>', 'Rewrite instruction')
      .action(async (taskId: string, options: RewriteOptions) => {
        const client = createApiClient({ baseUrl: options.baseUrl });
        const response = await client.request<VersionResponse>({
          method: 'POST',
          path: `/tasks/${taskId}/rewrites`,
          body: {
            versionId: options.versionId,
            instruction: options.instruction,
          } satisfies GenerateRewriteRequest,
        });

        writeRenderedOutput(stdout, response, options.render);
      }),
  );
};

const withCommonOptions = <T extends Command>(command: T): T =>
  command
    .option('--base-url <url>', 'PTCE API base URL', DEFAULT_BASE_URL)
    .option('--render <format>', `Output format (${OUTPUT_FORMATS.join(', ')})`, OUTPUT_FORMATS[1]);

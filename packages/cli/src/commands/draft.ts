import { Command } from 'commander';

import type { VersionResponse, VersionsResponse } from '@ptce/shared';

import { DEFAULT_BASE_URL, type ApiClientLike } from '../client/api-client.js';
import {
  OUTPUT_FORMATS,
  type OutputFormat,
  type Writer,
  writeRenderedOutput,
} from '../output/renderers.js';

interface DraftCommandDependencies {
  createApiClient: (options: { baseUrl: string }) => ApiClientLike;
  stdout: Writer;
}

interface CommonOptions {
  baseUrl: string;
  render: OutputFormat;
}

export const registerDraftCommands = (
  program: Command,
  { createApiClient, stdout }: DraftCommandDependencies,
): void => {
  const draft = program.command('draft').description('Manage draft generation and versions');

  withCommonOptions(
    draft
      .command('generate')
      .description('Generate a draft from the latest confirmed outline')
      .argument('<taskId>', 'Task identifier')
      .action(async (taskId: string, options: CommonOptions) => {
        const client = createApiClient({ baseUrl: options.baseUrl });
        const response = await client.request<VersionResponse>({
          method: 'POST',
          path: `/tasks/${taskId}/drafts/generate`,
        });

        writeRenderedOutput(stdout, response, options.render);
      }),
  );

  withCommonOptions(
    draft
      .command('list')
      .description('List generated versions for a task')
      .argument('<taskId>', 'Task identifier')
      .action(async (taskId: string, options: CommonOptions) => {
        const client = createApiClient({ baseUrl: options.baseUrl });
        const response = await client.request<VersionsResponse>({
          method: 'GET',
          path: `/tasks/${taskId}/versions`,
        });

        writeRenderedOutput(stdout, response, options.render);
      }),
  );
};

const withCommonOptions = <T extends Command>(command: T): T =>
  command
    .option('--base-url <url>', 'PTCE API base URL', DEFAULT_BASE_URL)
    .option('--render <format>', `Output format (${OUTPUT_FORMATS.join(', ')})`, OUTPUT_FORMATS[1]);

import { Command } from 'commander';

import type { OutlineResponse } from '@ptce/shared';

import { DEFAULT_BASE_URL, type ApiClientLike } from '../client/api-client.js';
import {
  OUTPUT_FORMATS,
  type OutputFormat,
  type Writer,
  writeRenderedOutput,
} from '../output/renderers.js';

interface OutlineCommandDependencies {
  createApiClient: (options: { baseUrl: string }) => ApiClientLike;
  stdout: Writer;
}

interface CommonOptions {
  baseUrl: string;
  render: OutputFormat;
}

export const registerOutlineCommands = (
  program: Command,
  { createApiClient, stdout }: OutlineCommandDependencies,
): void => {
  const outline = program.command('outline').description('Manage article outlines');

  withCommonOptions(
    outline
      .command('generate')
      .description('Generate an outline from the latest confirmed bedrock')
      .argument('<taskId>', 'Task identifier')
      .action(async (taskId: string, options: CommonOptions) => {
        const client = createApiClient({ baseUrl: options.baseUrl });
        const response = await client.request<OutlineResponse>({
          method: 'POST',
          path: `/tasks/${taskId}/outlines/generate`,
        });

        writeRenderedOutput(stdout, response, options.render);
      }),
  );

  withCommonOptions(
    outline
      .command('confirm')
      .description('Confirm a generated outline')
      .argument('<taskId>', 'Task identifier')
      .argument('<outlineId>', 'Outline identifier')
      .action(async (taskId: string, outlineId: string, options: CommonOptions) => {
        const client = createApiClient({ baseUrl: options.baseUrl });
        const response = await client.request<OutlineResponse>({
          method: 'POST',
          path: `/tasks/${taskId}/outlines/${outlineId}/confirm`,
        });

        writeRenderedOutput(stdout, response, options.render);
      }),
  );

  withCommonOptions(
    outline
      .command('get')
      .description('Fetch the latest outline')
      .argument('<taskId>', 'Task identifier')
      .action(async (taskId: string, options: CommonOptions) => {
        const client = createApiClient({ baseUrl: options.baseUrl });
        const response = await client.request<OutlineResponse>({
          method: 'GET',
          path: `/tasks/${taskId}/outlines/latest`,
        });

        writeRenderedOutput(stdout, response, options.render);
      }),
  );
};

const withCommonOptions = <T extends Command>(command: T): T =>
  command
    .option('--base-url <url>', 'PTCE API base URL', DEFAULT_BASE_URL)
    .option('--render <format>', `Output format (${OUTPUT_FORMATS.join(', ')})`, OUTPUT_FORMATS[1]);

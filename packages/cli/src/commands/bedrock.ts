import { Command } from 'commander';

import type { BedrockResponse } from '@ptce/shared';

import { DEFAULT_BASE_URL, type ApiClientLike } from '../client/api-client.js';
import {
  OUTPUT_FORMATS,
  createChoiceParser,
  type OutputFormat,
  type Writer,
  writeRenderedOutput,
} from '../output/renderers.js';

interface BedrockCommandDependencies {
  createApiClient: (options: { baseUrl: string }) => ApiClientLike;
  stdout: Writer;
}

interface CommonOptions {
  baseUrl: string;
  render: OutputFormat;
}

export const registerBedrockCommands = (
  program: Command,
  { createApiClient, stdout }: BedrockCommandDependencies,
): void => {
  const bedrock = program.command('bedrock').description('Manage information bedrock workflow');

  withCommonOptions(
    bedrock
      .command('generate')
      .description('Generate a task bedrock')
      .argument('<taskId>', 'Task identifier')
      .action(async (taskId: string, options: CommonOptions) => {
        const client = createApiClient({ baseUrl: options.baseUrl });
        const response = await client.request<BedrockResponse>({
          method: 'POST',
          path: `/tasks/${taskId}/bedrock/generate`,
        });

        writeRenderedOutput(stdout, response, options.render);
      }),
  );

  withCommonOptions(
    bedrock
      .command('confirm')
      .description('Confirm a generated bedrock')
      .argument('<taskId>', 'Task identifier')
      .argument('<bedrockId>', 'Bedrock identifier')
      .action(async (taskId: string, bedrockId: string, options: CommonOptions) => {
        const client = createApiClient({ baseUrl: options.baseUrl });
        const response = await client.request<BedrockResponse>({
          method: 'POST',
          path: `/tasks/${taskId}/bedrock/${bedrockId}/confirm`,
        });

        writeRenderedOutput(stdout, response, options.render);
      }),
  );

  withCommonOptions(
    bedrock
      .command('get')
      .description('Fetch the latest bedrock')
      .argument('<taskId>', 'Task identifier')
      .action(async (taskId: string, options: CommonOptions) => {
        const client = createApiClient({ baseUrl: options.baseUrl });
        const response = await client.request<BedrockResponse>({
          method: 'GET',
          path: `/tasks/${taskId}/bedrock/latest`,
        });

        writeRenderedOutput(stdout, response, options.render);
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

import { Command } from 'commander';

import type { CreateTaskRequest, TaskEnvelope } from '@ptce/shared';

import { DEFAULT_BASE_URL, type ApiClientLike } from '../client/api-client.js';
import {
  OUTPUT_FORMATS,
  createChoiceParser,
  type OutputFormat,
  type Writer,
  writeRenderedOutput,
} from '../output/renderers.js';

interface TaskCommandDependencies {
  createApiClient: (options: { baseUrl: string }) => ApiClientLike;
  stdout: Writer;
}

interface CommonOptions {
  baseUrl: string;
  render: OutputFormat;
}

interface CreateTaskOptions extends CommonOptions {
  title: string;
  articleType: string;
  reader: string;
}

export const registerTaskCommands = (
  program: Command,
  { createApiClient, stdout }: TaskCommandDependencies,
): void => {
  const task = program.command('task').description('Manage PTCE writing tasks');

  withCommonOptions(
    task
      .command('create')
      .description('Create a new writing task')
      .requiredOption('--title <title>', 'Task title')
      .requiredOption('--article-type <articleType>', 'Article type')
      .requiredOption('--reader <reader>', 'Target reader')
      .action(async (options: CreateTaskOptions) => {
        const client = createApiClient({ baseUrl: options.baseUrl });
        const response = await client.request<TaskEnvelope>({
          method: 'POST',
          path: '/tasks',
          body: {
            title: options.title,
            articleType: options.articleType,
            reader: options.reader,
          } satisfies CreateTaskRequest,
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

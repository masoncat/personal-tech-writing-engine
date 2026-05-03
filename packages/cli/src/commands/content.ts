import { Command } from 'commander';
import { readFile } from 'node:fs/promises';

import type {
  AddContentArtifactRequest,
  ContentArtifactsResponse,
  ContentRunResponse,
  ContentTaskEnvelope,
  ContentType,
  CreateContentTaskRequest,
  ExportChannel,
  RunContentTaskRequest,
} from '@ptce/shared';

import { DEFAULT_BASE_URL, type ApiClientLike } from '../client/api-client.js';
import {
  OUTPUT_FORMATS,
  createChoiceParser,
  type OutputFormat,
  type Writer,
  writeRenderedOutput,
} from '../output/renderers.js';

interface ContentCommandDependencies {
  createApiClient: (options: { baseUrl: string }) => ApiClientLike;
  stdout: Writer;
}

interface CommonOptions {
  baseUrl: string;
  render: OutputFormat;
}

interface ContentCreateOptions extends CommonOptions {
  title: string;
  type: ContentType;
  subtype: CreateContentTaskRequest['contentSubtype'];
  audience: string;
  purpose?: string;
  preferredChannel?: ExportChannel;
}

interface ContentRunOptions extends CommonOptions {
  taskId: string;
  until?: string;
}

interface ContentArtifactAddOptions extends CommonOptions {
  taskId: string;
  type: string;
  title: string;
  contentFile?: string;
  content?: string;
  format: AddContentArtifactRequest['format'];
  createdBy: AddContentArtifactRequest['createdBy'];
}

interface ContentCompleteOptions extends CommonOptions {
  taskId: string;
}

const CONTENT_TYPES = ['general', 'public_article', 'prd', 'technical_doc'] as const;
const CHANNELS = ['blog', 'wechat'] as const;
const ARTIFACT_FORMATS = ['markdown', 'json', 'text'] as const;
const ARTIFACT_CREATORS = ['agent', 'model', 'user', 'system'] as const;

export const registerContentCommands = (
  program: Command,
  { createApiClient, stdout }: ContentCommandDependencies,
): void => {
  const content = program.command('content').description('Manage typed PTCE content tasks');

  withCommonOptions(
    content
      .command('create')
      .description('Create a typed content task')
      .requiredOption('--title <title>', 'Content task title')
      .requiredOption(
        '--type <type>',
        `Content type (${CONTENT_TYPES.join(', ')})`,
        createChoiceParser(CONTENT_TYPES, '--type'),
      )
      .requiredOption('--subtype <subtype>', 'Content subtype')
      .requiredOption('--audience <audience>', 'Target audience')
      .option('--purpose <purpose>', 'Content purpose')
      .option(
        '--preferred-channel <channel>',
        `Preferred channel (${CHANNELS.join(', ')})`,
        createChoiceParser(CHANNELS, '--preferred-channel'),
      )
      .action(async (options: ContentCreateOptions) => {
        const client = createApiClient({ baseUrl: options.baseUrl });
        const response = await client.request<ContentTaskEnvelope>({
          method: 'POST',
          path: '/content-tasks',
          body: {
            title: options.title,
            contentType: options.type,
            contentSubtype: options.subtype,
            audience: options.audience,
            purpose: options.purpose,
            preferredChannel: options.preferredChannel,
          } satisfies CreateContentTaskRequest,
        });

        writeRenderedOutput(stdout, response, options.render);
      }),
  );

  withCommonOptions(
    content
      .command('run')
      .description('Run a typed content task')
      .requiredOption('--task-id <taskId>', 'Content task identifier')
      .option('--until <actionId>', 'Stop after action id')
      .action(async (options: ContentRunOptions) => {
        const client = createApiClient({ baseUrl: options.baseUrl });
        const body: RunContentTaskRequest = options.until
          ? { untilActionId: options.until }
          : {};
        const response = await client.request<ContentRunResponse>({
          method: 'POST',
          path: `/content-tasks/${options.taskId}/runs`,
          body,
        });

        writeRenderedOutput(stdout, response, options.render);
      }),
  );

  const artifact = content.command('artifact').description('Manage content task artifacts');

  withCommonOptions(
    artifact
      .command('add')
      .description('Add a content artifact')
      .requiredOption('--task-id <taskId>', 'Content task identifier')
      .requiredOption('--type <artifactType>', 'Artifact type')
      .requiredOption('--title <title>', 'Artifact title')
      .option('--content-file <path>', 'Read artifact content from a file')
      .option('--content <content>', 'Inline artifact content')
      .requiredOption(
        '--format <format>',
        `Artifact format (${ARTIFACT_FORMATS.join(', ')})`,
        createChoiceParser(ARTIFACT_FORMATS, '--format'),
      )
      .option(
        '--created-by <creator>',
        `Artifact creator (${ARTIFACT_CREATORS.join(', ')})`,
        createChoiceParser(ARTIFACT_CREATORS, '--created-by'),
        'agent',
      )
      .action(async (options: ContentArtifactAddOptions) => {
        const client = createApiClient({ baseUrl: options.baseUrl });
        const contentBody = await resolveArtifactContent(options);
        const response = await client.request<ContentArtifactsResponse>({
          method: 'POST',
          path: `/content-tasks/${options.taskId}/artifacts`,
          body: {
            artifactType: options.type,
            title: options.title,
            content: contentBody,
            format: options.format,
            createdBy: options.createdBy,
          } satisfies AddContentArtifactRequest,
        });

        writeRenderedOutput(stdout, response, options.render);
      }),
  );

  withCommonOptions(
    content
      .command('complete')
      .description('Mark a content task complete')
      .requiredOption('--task-id <taskId>', 'Content task identifier')
      .action(async (options: ContentCompleteOptions) => {
        const client = createApiClient({ baseUrl: options.baseUrl });
        const response = await client.request<ContentTaskEnvelope>({
          method: 'POST',
          path: `/content-tasks/${options.taskId}/complete`,
          body: {},
        });

        writeRenderedOutput(stdout, response, options.render);
      }),
  );
};

const resolveArtifactContent = async (options: ContentArtifactAddOptions): Promise<string> => {
  if (options.contentFile) {
    return readFile(options.contentFile, 'utf8');
  }

  return options.content ?? '';
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

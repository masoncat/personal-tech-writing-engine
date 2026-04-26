import { Command } from 'commander';

import type {
  AddMaterialRequest,
  ImportObsidianRequest,
  MaterialListResponse,
  MaterialSource,
  MaterialType,
} from '@ptce/shared';

import { DEFAULT_BASE_URL, type ApiClientLike } from '../client/api-client.js';
import {
  OUTPUT_FORMATS,
  createChoiceParser,
  type OutputFormat,
  type Writer,
  writeRenderedOutput,
} from '../output/renderers.js';

const MATERIAL_TYPES = ['prompt', 'note', 'repo', 'article', 'draft', 'reference'] as const;
const MATERIAL_SOURCES = ['inline', 'file', 'obsidian'] as const;

interface MaterialCommandDependencies {
  createApiClient: (options: { baseUrl: string }) => ApiClientLike;
  stdout: Writer;
}

interface CommonOptions {
  baseUrl: string;
  render: OutputFormat;
}

interface AddMaterialOptions extends CommonOptions {
  type: MaterialType;
  title: string;
  source: MaterialSource;
  content: string;
  relativePath?: string;
  vaultPath?: string;
}

interface ImportObsidianOptions extends CommonOptions {
  vaultPath: string;
  path: string;
}

export const registerMaterialCommands = (
  program: Command,
  { createApiClient, stdout }: MaterialCommandDependencies,
): void => {
  const material = program.command('material').description('Manage task materials');

  withCommonOptions(
    material
      .command('add')
      .description('Add material to a task')
      .argument('<taskId>', 'Task identifier')
      .requiredOption(
        '--type <type>',
        `Material type (${MATERIAL_TYPES.join(', ')})`,
        createChoiceParser(MATERIAL_TYPES, '--type'),
      )
      .requiredOption('--title <title>', 'Material title')
      .requiredOption(
        '--source <source>',
        `Material source (${MATERIAL_SOURCES.join(', ')})`,
        createChoiceParser(MATERIAL_SOURCES, '--source'),
      )
      .requiredOption('--content <content>', 'Material content')
      .option('--relative-path <path>', 'Relative path for file or obsidian sources')
      .option('--vault-path <path>', 'Vault path for obsidian sources')
      .action(async (taskId: string, options: AddMaterialOptions) => {
        const body = buildAddMaterialRequest(options);
        const client = createApiClient({ baseUrl: options.baseUrl });
        const response = await client.request<MaterialListResponse>({
          method: 'POST',
          path: `/tasks/${taskId}/materials`,
          body,
        });

        writeRenderedOutput(stdout, response, options.render);
      }),
  );

  withCommonOptions(
    material
      .command('import-obsidian')
      .description('Import materials from an Obsidian vault path')
      .argument('<taskId>', 'Task identifier')
      .requiredOption('--vault-path <path>', 'Absolute vault path')
      .requiredOption('--path <path>', 'File or directory path inside the vault')
      .action(async (taskId: string, options: ImportObsidianOptions) => {
        const client = createApiClient({ baseUrl: options.baseUrl });
        const response = await client.request<MaterialListResponse>({
          method: 'POST',
          path: `/tasks/${taskId}/materials/import-obsidian`,
          body: {
            vaultPath: options.vaultPath,
            path: options.path,
          } satisfies ImportObsidianRequest,
        });

        writeRenderedOutput(stdout, response, options.render);
      }),
  );

  withCommonOptions(
    material
      .command('list')
      .description('List materials for a task')
      .argument('<taskId>', 'Task identifier')
      .action(async (taskId: string, options: CommonOptions) => {
        const client = createApiClient({ baseUrl: options.baseUrl });
        const response = await client.request<MaterialListResponse>({
          method: 'GET',
          path: `/tasks/${taskId}/materials`,
        });

        writeRenderedOutput(stdout, response, options.render);
      }),
  );
};

const buildAddMaterialRequest = (options: AddMaterialOptions): AddMaterialRequest => {
  if (options.source === 'inline') {
    return {
      type: options.type,
      title: options.title,
      source: options.source,
      content: options.content,
    };
  }

  if (options.source === 'file') {
    if (!options.relativePath) {
      throw new Error('--relative-path is required when --source=file');
    }

    return {
      type: options.type,
      title: options.title,
      source: options.source,
      content: options.content,
      relativePath: options.relativePath,
    };
  }

  if (!options.relativePath || !options.vaultPath) {
    throw new Error('--relative-path and --vault-path are required when --source=obsidian');
  }

  return {
    type: options.type,
    title: options.title,
    source: options.source,
    content: options.content,
    relativePath: options.relativePath,
    vaultPath: options.vaultPath,
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

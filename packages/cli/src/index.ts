import { Command } from 'commander';
import { pathToFileURL } from 'node:url';

import {
  ApiClientError,
  createApiClient as defaultCreateApiClient,
  type ApiClientLike,
} from './client/api-client.js';
import { registerBedrockCommands } from './commands/bedrock.js';
import { registerContentCommands } from './commands/content.js';
import { registerDraftCommands } from './commands/draft.js';
import { registerExportCommands } from './commands/export.js';
import { registerMaterialCommands } from './commands/material.js';
import { registerOutlineCommands } from './commands/outline.js';
import { registerRewriteCommands } from './commands/rewrite.js';
import { registerTaskCommands } from './commands/task.js';
import {
  createDefaultToolsProvider,
  registerToolsCommands,
  type CreateResearchPackageLike,
} from './commands/tools.js';
import {
  registerWriteCommands,
  type ProjectWriteRunnerLike,
} from './commands/write.js';
import type { Writer } from './output/renderers.js';
import { createProjectWriteRunner } from './write/workflow-runner.js';

export type { ApiClientLike } from './client/api-client.js';

export interface BuildProgramDependencies {
  createApiClient?: (options: { baseUrl: string }) => ApiClientLike;
  createWriteProjectRunner?: (options: {
    baseUrl: string;
    createApiClient: (options: { baseUrl: string }) => ApiClientLike;
  }) => ProjectWriteRunnerLike;
  createResearchPackage?: CreateResearchPackageLike;
  createToolsProvider?: typeof createDefaultToolsProvider;
  stdout?: Writer;
  stderr?: Writer;
}

export const buildProgram = ({
  createApiClient = defaultCreateApiClient,
  createWriteProjectRunner = createProjectWriteRunner,
  createResearchPackage,
  createToolsProvider = createDefaultToolsProvider,
  stdout = process.stdout,
  stderr = process.stderr,
}: BuildProgramDependencies = {}): Command => {
  const program = new Command()
    .name('ptce')
    .description('PTCE CLI for driving the mock workflow server')
    .showHelpAfterError();

  const commandDependencies = {
    createApiClient,
    stdout,
  };

  registerTaskCommands(program, commandDependencies);
  registerMaterialCommands(program, commandDependencies);
  registerBedrockCommands(program, commandDependencies);
  registerOutlineCommands(program, commandDependencies);
  registerDraftCommands(program, commandDependencies);
  registerRewriteCommands(program, commandDependencies);
  registerExportCommands(program, commandDependencies);
  registerWriteCommands(program, {
    createApiClient,
    createWriteProjectRunner,
    stdout,
  });
  registerContentCommands(program, commandDependencies);
  registerToolsCommands(program, {
    createToolsProvider,
    createResearchPackage,
    stdout,
  });

  program.configureOutput({
    writeErr: (value) => {
      stderr.write(value);
    },
  });

  return program;
};

const runCli = async (): Promise<void> => {
  try {
    await buildProgram().parseAsync(process.argv);
  } catch (error) {
    const stderr = process.stderr;

    if (error instanceof ApiClientError) {
      stderr.write(formatApiClientError(error));
      process.exitCode = 1;
      return;
    }

    if (error instanceof Error) {
      stderr.write(`${error.message}\n`);
      process.exitCode = 1;
      return;
    }

    stderr.write('Unknown CLI error\n');
    process.exitCode = 1;
  }
};

const formatApiClientError = (error: ApiClientError): string => {
  if (typeof error.body === 'object' && error.body !== null) {
    const code = 'code' in error.body && typeof error.body.code === 'string' ? error.body.code : undefined;
    const details =
      'details' in error.body && error.body.details !== undefined
        ? ` details=${JSON.stringify(error.body.details)}`
        : '';

    return `${code ? `${code}: ` : ''}${error.message} (status ${error.status})${details}\n`;
  }

  if (typeof error.body === 'string' && error.body.length > 0) {
    return `${error.message} (status ${error.status}) ${error.body}\n`;
  }

  return `${error.message} (status ${error.status})\n`;
};
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void runCli();
}

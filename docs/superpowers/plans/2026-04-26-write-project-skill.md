# Write Project Skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a high-level `ptce write project` CLI command that scans a local project, selects high-value materials, runs the existing PTCE workflow through `draft` by default, and returns structured output suitable for a writing skill.

**Architecture:** Keep all new orchestration in the CLI package. Add a deterministic project scanner, a pluggable write-model provider layer, a workflow runner that reuses the existing task/material/bedrock/outline/draft/rewrite/export endpoints, and an optional editorial finalizer. Expose the whole flow through one new high-level command and document a repo-local skill wrapper that calls it.

**Tech Stack:** TypeScript, Commander, Vitest, existing PTCE CLI API client, existing mock server workflow routes, Node filesystem/path/process APIs

---

## File Structure

### Existing files to modify

- `packages/cli/src/index.ts`
  - Register the new `write` command group and inject write-runner dependencies for tests.
- `packages/cli/tests/cli.test.ts`
  - Extend command-surface and high-level command tests.
- `packages/cli/src/output/renderers.ts`
  - Reuse existing structured output rendering if the new result shape needs a small helper.

### New files to create

- `packages/cli/src/commands/write.ts`
  - Register `ptce write project` and parse high-level options.
- `packages/cli/src/write/types.ts`
  - Shared types for candidate materials, selected materials, write options, and result payloads.
- `packages/cli/src/write/project-scanner.ts`
  - Deterministic project scanning and candidate material collection.
- `packages/cli/src/write/material-selector.ts`
  - Provider-driven candidate material selection with deterministic fallback.
- `packages/cli/src/write/material-normalizer.ts`
  - Normalize selected candidate materials into workflow-ready PTCE materials.
- `packages/cli/src/write/intent-enhancer.ts`
  - Build the stronger task framing material.
- `packages/cli/src/write/model-provider.ts`
  - Provider interface plus default deterministic provider used by the first implementation.
- `packages/cli/src/write/editorial-finalizer.ts`
  - Optional publishable editorial pass using the provider interface.
- `packages/cli/src/write/workflow-runner.ts`
  - Orchestrate task creation and downstream workflow calls through the existing API client.
- `packages/cli/tests/write/project-scanner.test.ts`
  - Unit tests for default source discovery and narrowing behavior.
- `packages/cli/tests/write/material-selector.test.ts`
  - Unit tests for provider-driven selection and deterministic fallback.
- `packages/cli/tests/write/workflow-runner.test.ts`
  - Orchestration tests for stop points and structured output.
- `.agents/skills/ptce-writing/SKILL.md`
  - Repo-local writing skill wrapper that explains when and how to call `ptce write project`.

### Responsibility boundaries

- `commands/write.ts`
  - Command surface only.
- `project-scanner.ts`
  - Filesystem and git candidate discovery only.
- `model-provider.ts`
  - Structured interface for reasoning tasks, plus a deterministic default provider.
- `material-selector.ts`
  - Convert many candidates into selected/skipped groups.
- `material-normalizer.ts`
  - Convert selected source documents into PTCE workflow materials.
- `intent-enhancer.ts`
  - Create the strongest possible writing-task prompt material from explicit user parameters.
- `editorial-finalizer.ts`
  - Only touches publishable-mode article output.
- `workflow-runner.ts`
  - Only talks to the existing PTCE workflow API and assembles the final result.
- `.agents/skills/ptce-writing/SKILL.md`
  - Human/agent guidance only, no business logic.

---

### Task 1: Add the `write` Command Surface and Shared Types

**Files:**
- Modify: `packages/cli/src/index.ts`
- Create: `packages/cli/src/commands/write.ts`
- Create: `packages/cli/src/write/types.ts`
- Modify: `packages/cli/tests/cli.test.ts`

- [ ] **Step 1: Write the failing CLI tests**

Add these tests to `packages/cli/tests/cli.test.ts`:

```ts
import type { ProjectWriteResult } from '../src/write/types.js';

it('registers the write command group with the project subcommand', () => {
  const program = buildProgram();
  const writeCommand = program.commands.find((command) => command.name() === 'write');

  expect(writeCommand?.commands.map((command) => command.name())).toEqual(['project']);
});

it('maps write project options into a high-level runner request and renders json', async () => {
  const stdout = createCaptureStream();
  const runProjectWrite = vi.fn().mockResolvedValue({
    task: {
      id: 'task-1',
      title: 'AI Homework Review Retrospective',
      articleType: 'build-retrospective',
      preferredChannel: 'blog',
      reader: 'agent curious developers',
      stage: TaskStage.DraftReady,
      createdAt: '2026-04-26T00:00:00.000Z',
      updatedAt: '2026-04-26T00:00:00.000Z',
    },
    materials: [],
    bedrock: null,
    outline: null,
    draftVersion: null,
    rewriteVersion: null,
    exportRecord: null,
    stopAt: 'draft',
    editorialMode: 'none',
    selectedSources: [
      {
        id: 'source-readme',
        kind: 'file',
        path: '/repo/README.md',
        role: 'project-definition',
      },
    ],
    skippedSources: [],
    modelActions: ['selected_materials', 'enhanced_intent'],
  } satisfies ProjectWriteResult);

  const program = buildProgram({
    createWriteProjectRunner: () => ({ run: runProjectWrite }),
    stdout,
  });

  await program.parseAsync([
    'node',
    'ptce',
    'write',
    'project',
    '--project-path',
    '/repo',
    '--title',
    'AI Homework Review Retrospective',
    '--article-type',
    'build-retrospective',
    '--reader',
    'agent curious developers',
    '--stop-at',
    'draft',
    '--render',
    'json',
  ]);

  expect(runProjectWrite).toHaveBeenCalledWith({
    projectPath: '/repo',
    title: 'AI Homework Review Retrospective',
    articleType: 'build-retrospective',
    reader: 'agent curious developers',
    goal: undefined,
    channel: 'blog',
    stopAt: 'draft',
    editorialMode: 'none',
    export: false,
    exportPath: undefined,
    obsidianVaultPath: undefined,
    sourcePaths: undefined,
    withGitLog: true,
    withObsidianContext: false,
    maxMaterials: undefined,
    modelEnhancement: 'standard',
  });
  expect(stdout.output).toContain('"selectedSources"');
  expect(stdout.output).toContain('"modelActions"');
});
```

- [ ] **Step 2: Run CLI tests to verify they fail**

Run:

```bash
npm test -- --run packages/cli/tests/cli.test.ts
```

Expected:

- FAIL because `write` is not registered
- FAIL because `createWriteProjectRunner` does not exist in `buildProgram()`

- [ ] **Step 3: Add shared write types**

Create `packages/cli/src/write/types.ts`:

```ts
import type {
  ArticleOutline,
  ArticleVersion,
  ExportChannel,
  ExportRecord,
  InformationBedrock,
  Material,
  WritingTask,
} from '@ptce/shared';

export type WriteStopAt = 'bedrock' | 'outline' | 'draft' | 'rewrite' | 'export';
export type EditorialMode = 'none' | 'publishable';
export type ModelEnhancementMode = 'off' | 'select-only' | 'standard';

export interface ProjectWriteOptions {
  projectPath: string;
  title: string;
  articleType: string;
  reader: string;
  goal?: string;
  channel: ExportChannel;
  stopAt: WriteStopAt;
  editorialMode: EditorialMode;
  export: boolean;
  exportPath?: string;
  obsidianVaultPath?: string;
  sourcePaths?: string[];
  withGitLog: boolean;
  withObsidianContext: boolean;
  maxMaterials?: number;
  modelEnhancement: ModelEnhancementMode;
}

export type CandidateSourceRole =
  | 'project-definition'
  | 'turning-point'
  | 'engineering-detail'
  | 'style-sample'
  | 'background-only';

export interface CandidateProjectSource {
  id: string;
  kind: 'file' | 'git-log' | 'obsidian-context';
  path: string;
  title: string;
  content: string;
}

export interface SelectedProjectSource {
  id: string;
  kind: CandidateProjectSource['kind'];
  path: string;
  role: CandidateSourceRole;
}

export interface ProjectWriteResult {
  task: WritingTask;
  materials: Material[];
  bedrock: InformationBedrock | null;
  outline: ArticleOutline | null;
  draftVersion: ArticleVersion | null;
  rewriteVersion: ArticleVersion | null;
  exportRecord: ExportRecord | null;
  stopAt: WriteStopAt;
  editorialMode: EditorialMode;
  selectedSources: SelectedProjectSource[];
  skippedSources: SelectedProjectSource[];
  modelActions: string[];
}
```

- [ ] **Step 4: Register the new command surface**

Create `packages/cli/src/commands/write.ts`:

```ts
import { Command } from 'commander';

import { DEFAULT_BASE_URL, type ApiClientLike } from '../client/api-client.js';
import {
  OUTPUT_FORMATS,
  createChoiceParser,
  type OutputFormat,
  type Writer,
  writeRenderedOutput,
} from '../output/renderers.js';
import type {
  EditorialMode,
  ModelEnhancementMode,
  ProjectWriteOptions,
  ProjectWriteResult,
  WriteStopAt,
} from '../write/types.js';

export interface ProjectWriteRunnerLike {
  run(options: ProjectWriteOptions): Promise<ProjectWriteResult>;
}

export interface WriteCommandDependencies {
  createApiClient: (options: { baseUrl: string }) => ApiClientLike;
  createWriteProjectRunner: (options: {
    baseUrl: string;
    createApiClient: (options: { baseUrl: string }) => ApiClientLike;
  }) => ProjectWriteRunnerLike;
  stdout: Writer;
}

const STOP_POINTS = ['bedrock', 'outline', 'draft', 'rewrite', 'export'] as const;
const EDITORIAL_MODES = ['none', 'publishable'] as const;
const MODEL_MODES = ['off', 'select-only', 'standard'] as const;

interface CommonOptions {
  baseUrl: string;
  render: OutputFormat;
}

interface ProjectCommandOptions extends CommonOptions {
  projectPath: string;
  title: string;
  articleType: string;
  reader: string;
  goal?: string;
  channel: 'blog' | 'wechat';
  stopAt: WriteStopAt;
  editorialMode: EditorialMode;
  export: boolean;
  exportPath?: string;
  obsidianVaultPath?: string;
  sourcePaths?: string[];
  withGitLog: boolean;
  withObsidianContext: boolean;
  maxMaterials?: number;
  modelEnhancement: ModelEnhancementMode;
}

export const registerWriteCommands = (
  program: Command,
  { createApiClient, createWriteProjectRunner, stdout }: WriteCommandDependencies,
): void => {
  const write = program.command('write').description('Run high-level PTCE writing workflows');

  withCommonOptions(
    write
      .command('project')
      .description('Generate a writing task from a local project directory')
      .requiredOption('--project-path <path>', 'Local project root path')
      .requiredOption('--title <title>', 'Writing task title')
      .requiredOption('--article-type <articleType>', 'Writing article type')
      .requiredOption('--reader <reader>', 'Target reader')
      .option('--goal <goal>', 'Writing goal')
      .option('--channel <channel>', 'Preferred channel', createChoiceParser(['blog', 'wechat'] as const, '--channel'), 'blog')
      .option('--stop-at <stopAt>', 'Workflow stop point', createChoiceParser(STOP_POINTS, '--stop-at'), 'draft')
      .option('--editorial-mode <mode>', 'Editorial finishing mode', createChoiceParser(EDITORIAL_MODES, '--editorial-mode'), 'none')
      .option('--export', 'Run export after the requested stop point', false)
      .option('--export-path <path>', 'Export output path')
      .option('--obsidian-vault-path <path>', 'Obsidian vault path')
      .option('--source-paths <paths...>', 'Specific project paths to scan')
      .option('--with-git-log', 'Include recent git history', true)
      .option('--without-git-log', 'Skip recent git history')
      .option('--with-obsidian-context', 'Include Obsidian context sources', false)
      .option('--max-materials <count>', 'Max workflow materials', (value) => Number.parseInt(value, 10))
      .option('--model-enhancement <mode>', 'Model enhancement mode', createChoiceParser(MODEL_MODES, '--model-enhancement'), 'standard')
      .action(async (options: ProjectCommandOptions) => {
        const runner = createWriteProjectRunner({
          baseUrl: options.baseUrl,
          createApiClient,
        });
        const result = await runner.run({
          projectPath: options.projectPath,
          title: options.title,
          articleType: options.articleType,
          reader: options.reader,
          goal: options.goal,
          channel: options.channel,
          stopAt: options.stopAt,
          editorialMode: options.editorialMode,
          export: options.export,
          exportPath: options.exportPath,
          obsidianVaultPath: options.obsidianVaultPath,
          sourcePaths: options.sourcePaths,
          withGitLog: options.withGitLog,
          withObsidianContext: options.withObsidianContext,
          maxMaterials: options.maxMaterials,
          modelEnhancement: options.modelEnhancement,
        });

        writeRenderedOutput(stdout, result, options.render);
      }),
  );
};

const withCommonOptions = <T extends Command>(command: T): T =>
  command
    .option('--base-url <url>', 'PTCE API base URL', DEFAULT_BASE_URL)
    .option('--render <format>', `Output format (${OUTPUT_FORMATS.join(', ')})`, createChoiceParser(OUTPUT_FORMATS, '--render'), OUTPUT_FORMATS[1]);
```

Modify `packages/cli/src/index.ts`:

```ts
import { registerWriteCommands, type ProjectWriteRunnerLike } from './commands/write.js';
import { createProjectWriteRunner } from './write/workflow-runner.js';
import { registerBedrockCommands } from './commands/bedrock.js';
import { registerDraftCommands } from './commands/draft.js';
import { registerExportCommands } from './commands/export.js';
import { registerMaterialCommands } from './commands/material.js';
import { registerOutlineCommands } from './commands/outline.js';
import { registerRewriteCommands } from './commands/rewrite.js';
import { registerTaskCommands } from './commands/task.js';

export interface BuildProgramDependencies {
  createApiClient?: (options: { baseUrl: string }) => ApiClientLike;
  createWriteProjectRunner?: (options: {
    baseUrl: string;
    createApiClient: (options: { baseUrl: string }) => ApiClientLike;
  }) => ProjectWriteRunnerLike;
  stdout?: Writer;
  stderr?: Writer;
}

export const buildProgram = ({
  createApiClient = defaultCreateApiClient,
  createWriteProjectRunner = createProjectWriteRunner,
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
  program.configureOutput({
    writeErr: (value) => {
      stderr.write(value);
    },
  });
  return program;
};
```

- [ ] **Step 5: Run CLI tests to verify they pass**

Run:

```bash
npm test -- --run packages/cli/tests/cli.test.ts
```

Expected:

- PASS
- command surface now includes `write`
- high-level command delegates to injected runner and renders JSON

- [ ] **Step 6: Commit**

```bash
git add \
  packages/cli/src/index.ts \
  packages/cli/src/commands/write.ts \
  packages/cli/src/write/types.ts \
  packages/cli/tests/cli.test.ts
git commit -m "feat: add write project command surface"
```

---

### Task 2: Build Deterministic Project Scanning

**Files:**
- Create: `packages/cli/src/write/project-scanner.ts`
- Create: `packages/cli/tests/write/project-scanner.test.ts`

- [ ] **Step 1: Write the failing scanner tests**

Create `packages/cli/tests/write/project-scanner.test.ts`:

```ts
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { afterEach, describe, expect, it } from 'vitest';

import { collectProjectSources } from '../../src/write/project-scanner.js';

const tempDirs: string[] = [];

const createProjectFixture = async () => {
  const root = await mkdtemp(join(tmpdir(), 'ptce-project-scan-'));
  tempDirs.push(root);

  await mkdir(join(root, 'docs', 'articles'), { recursive: true });
  await mkdir(join(root, 'docs', 'superpowers', 'specs'), { recursive: true });
  await mkdir(join(root, 'docs', 'superpowers', 'plans'), { recursive: true });

  await writeFile(join(root, 'README.md'), '# Project');
  await writeFile(join(root, 'docs', 'overview.md'), '# Overview');
  await writeFile(join(root, 'docs', 'articles', 'post.md'), '# Article');
  await writeFile(join(root, 'docs', 'superpowers', 'specs', 'spec.md'), '# Spec');
  await writeFile(join(root, 'docs', 'superpowers', 'plans', 'plan.md'), '# Plan');

  return root;
};

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map(async (dir) => import('node:fs/promises').then(({ rm }) => rm(dir, { recursive: true, force: true }))));
});

describe('collectProjectSources', () => {
  it('collects default project sources plus git history when enabled', async () => {
    const projectPath = await createProjectFixture();

    const sources = await collectProjectSources({
      projectPath,
      withGitLog: true,
      sourcePaths: undefined,
      loadGitLog: async () => 'abc123 feat: add task center',
    });

    expect(sources.map((source) => source.path)).toEqual([
      join(projectPath, 'README.md'),
      join(projectPath, 'docs', 'overview.md'),
      join(projectPath, 'docs', 'articles', 'post.md'),
      join(projectPath, 'docs', 'superpowers', 'specs', 'spec.md'),
      join(projectPath, 'docs', 'superpowers', 'plans', 'plan.md'),
      'git-log://recent',
    ]);
  });

  it('narrows scanning to explicit source paths and can skip git history', async () => {
    const projectPath = await createProjectFixture();

    const sources = await collectProjectSources({
      projectPath,
      withGitLog: false,
      sourcePaths: ['docs/articles'],
      loadGitLog: async () => {
        throw new Error('should not be called');
      },
    });

    expect(sources.map((source) => source.path)).toEqual([
      join(projectPath, 'docs', 'articles', 'post.md'),
    ]);
  });
});
```

- [ ] **Step 2: Run scanner tests to verify they fail**

Run:

```bash
npm test -- --run packages/cli/tests/write/project-scanner.test.ts
```

Expected:

- FAIL because `collectProjectSources()` does not exist yet

- [ ] **Step 3: Implement deterministic project scanning**

Create `packages/cli/src/write/project-scanner.ts`:

```ts
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import type { CandidateProjectSource } from './types.js';

const execFileAsync = promisify(execFile);

export interface CollectProjectSourcesOptions {
  projectPath: string;
  withGitLog: boolean;
  sourcePaths?: string[];
  loadGitLog?: (projectPath: string) => Promise<string>;
}

export const collectProjectSources = async ({
  projectPath,
  withGitLog,
  sourcePaths,
  loadGitLog = loadRecentGitLog,
}: CollectProjectSourcesOptions): Promise<CandidateProjectSource[]> => {
  const root = resolve(projectPath);
  const scopedPaths = sourcePaths?.length
    ? sourcePaths.map((value) => resolve(root, value))
    : [
        resolve(root, 'README.md'),
        resolve(root, 'docs'),
        resolve(root, 'docs/articles'),
        resolve(root, 'docs/superpowers/specs'),
        resolve(root, 'docs/superpowers/plans'),
      ];

  const files = (
    await Promise.all(scopedPaths.map(async (path) => collectPathSources(root, path)))
  ).flat();

  const deduped = new Map<string, CandidateProjectSource>();
  for (const source of files) deduped.set(source.path, source);

  if (withGitLog) {
    const gitLog = await loadGitLog(root);
    if (gitLog.trim().length > 0) {
      deduped.set('git-log://recent', {
        id: 'git-log-recent',
        kind: 'git-log',
        path: 'git-log://recent',
        title: 'Recent git history',
        content: gitLog,
      });
    }
  }

  return [...deduped.values()].sort((left, right) => left.path.localeCompare(right.path));
};

const collectPathSources = async (
  root: string,
  path: string,
): Promise<CandidateProjectSource[]> => {
  try {
    const metadata = await stat(path);
    if (metadata.isDirectory()) {
      const entries = await readdir(path, { withFileTypes: true });
      const nested = await Promise.all(
        entries.map((entry) => collectPathSources(root, join(path, entry.name))),
      );
      return nested.flat();
    }
    if (!metadata.isFile() || !path.endsWith('.md')) {
      return [];
    }

    const content = await readFile(path, 'utf8');
    return [
      {
        id: relative(root, path) || 'README.md',
        kind: 'file',
        path,
        title: relative(root, path) || path,
        content,
      },
    ];
  } catch {
    return [];
  }
};

const loadRecentGitLog = async (projectPath: string): Promise<string> => {
  const { stdout } = await execFileAsync('git', ['-C', projectPath, 'log', '--oneline', '-n', '12']);
  return stdout;
};
```

- [ ] **Step 4: Run scanner tests to verify they pass**

Run:

```bash
npm test -- --run packages/cli/tests/write/project-scanner.test.ts
```

Expected:

- PASS
- default source discovery works
- narrowed scanning works

- [ ] **Step 5: Commit**

```bash
git add \
  packages/cli/src/write/project-scanner.ts \
  packages/cli/tests/write/project-scanner.test.ts
git commit -m "feat: add deterministic project source scanning"
```

---

### Task 3: Add the Model Provider Layer and Material Selection

**Files:**
- Create: `packages/cli/src/write/model-provider.ts`
- Create: `packages/cli/src/write/material-selector.ts`
- Create: `packages/cli/src/write/material-normalizer.ts`
- Create: `packages/cli/src/write/intent-enhancer.ts`
- Create: `packages/cli/tests/write/material-selector.test.ts`

- [ ] **Step 1: Write the failing material-selection tests**

Create `packages/cli/tests/write/material-selector.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { selectProjectSources } from '../../src/write/material-selector.js';
import type { CandidateProjectSource } from '../../src/write/types.js';

const candidates: CandidateProjectSource[] = [
  {
    id: 'readme',
    kind: 'file',
    path: '/repo/README.md',
    title: 'README.md',
    content: '# Project overview',
  },
  {
    id: 'article',
    kind: 'file',
    path: '/repo/docs/articles/post.md',
    title: 'docs/articles/post.md',
    content: '# Historical post',
  },
  {
    id: 'plan',
    kind: 'file',
    path: '/repo/docs/superpowers/plans/plan.md',
    title: 'docs/superpowers/plans/plan.md',
    content: '# Plan',
  },
];

describe('selectProjectSources', () => {
  it('uses the provider result in standard mode', async () => {
    const result = await selectProjectSources({
      candidates,
      maxMaterials: 2,
      mode: 'standard',
      provider: {
        selectMaterials: async () => ({
          selected: [
            { id: 'readme', role: 'project-definition', reason: 'root project shape' },
            { id: 'article', role: 'style-sample', reason: 'historical tone sample' },
          ],
          skipped: [{ id: 'plan', role: 'background-only', reason: 'lower signal' }],
          action: 'selected_materials',
        }),
        normalizeMaterials: async () => {
          throw new Error('not needed in this test');
        },
        enhanceIntent: async () => {
          throw new Error('not needed in this test');
        },
        evaluateDraft: async () => {
          throw new Error('not needed in this test');
        },
        finalizeEditorialDraft: async () => {
          throw new Error('not needed in this test');
        },
      },
    });

    expect(result.selectedSources).toEqual([
      { id: 'readme', kind: 'file', path: '/repo/README.md', role: 'project-definition' },
      { id: 'article', kind: 'file', path: '/repo/docs/articles/post.md', role: 'style-sample' },
    ]);
    expect(result.skippedSources).toEqual([
      { id: 'plan', kind: 'file', path: '/repo/docs/superpowers/plans/plan.md', role: 'background-only' },
    ]);
    expect(result.modelActions).toEqual(['selected_materials']);
  });

  it('falls back deterministically when model enhancement is off', async () => {
    const result = await selectProjectSources({
      candidates,
      maxMaterials: 2,
      mode: 'off',
      provider: undefined,
    });

    expect(result.selectedSources.map((source) => source.id)).toEqual(['readme', 'article']);
    expect(result.skippedSources.map((source) => source.id)).toEqual(['plan']);
    expect(result.modelActions).toEqual([]);
  });
});
```

- [ ] **Step 2: Run selection tests to verify they fail**

Run:

```bash
npm test -- --run packages/cli/tests/write/material-selector.test.ts
```

Expected:

- FAIL because `selectProjectSources()` and the provider interface do not exist yet

- [ ] **Step 3: Add the provider interface and deterministic fallback**

Create `packages/cli/src/write/model-provider.ts`:

```ts
import type { CandidateProjectSource, ProjectWriteOptions } from './types.js';

export interface MaterialSelectionDecision {
  id: string;
  role: 'project-definition' | 'turning-point' | 'engineering-detail' | 'style-sample' | 'background-only';
  reason: string;
}

export interface MaterialSelectionResult {
  selected: MaterialSelectionDecision[];
  skipped: MaterialSelectionDecision[];
  action: string;
}

export interface NormalizedMaterialResult {
  workflowMaterials: Array<{
    type: 'prompt' | 'note' | 'article' | 'reference';
    title: string;
    content: string;
  }>;
  action: string;
}

export interface EnhancedIntentResult {
  title: string;
  content: string;
  action: string;
}

export interface DraftEvaluationResult {
  continueToEditorial: boolean;
  instruction?: string;
  action: string;
}

export interface EditorialFinalizationResult {
  content: string;
  action: string;
}

export interface WriteModelProvider {
  selectMaterials(input: {
    candidates: CandidateProjectSource[];
    options: ProjectWriteOptions;
  }): Promise<MaterialSelectionResult>;
  normalizeMaterials(input: {
    candidates: CandidateProjectSource[];
    selectedIds: string[];
    options: ProjectWriteOptions;
  }): Promise<NormalizedMaterialResult>;
  enhanceIntent(input: {
    options: ProjectWriteOptions;
    selectedCandidates: CandidateProjectSource[];
  }): Promise<EnhancedIntentResult>;
  evaluateDraft(input: {
    draft: string;
    options: ProjectWriteOptions;
  }): Promise<DraftEvaluationResult>;
  finalizeEditorialDraft(input: {
    draft: string;
    options: ProjectWriteOptions;
  }): Promise<EditorialFinalizationResult>;
}

export class DeterministicWriteModelProvider implements WriteModelProvider {
  async selectMaterials({ candidates, options }: {
    candidates: CandidateProjectSource[];
    options: ProjectWriteOptions;
  }): Promise<MaterialSelectionResult> {
    const sorted = [...candidates].sort((left, right) => left.path.localeCompare(right.path));
    const selected = sorted.slice(0, options.maxMaterials ?? sorted.length).map((candidate, index) => ({
      id: candidate.id,
      role: index === 0 ? 'project-definition' : candidate.path.includes('/articles/') ? 'style-sample' : 'engineering-detail',
      reason: 'deterministic fallback selection',
    }));
    const selectedIds = new Set(selected.map((item) => item.id));
    const skipped = sorted
      .filter((candidate) => !selectedIds.has(candidate.id))
      .map((candidate) => ({
        id: candidate.id,
        role: 'background-only' as const,
        reason: 'deterministic fallback skip',
      }));

    return {
      selected,
      skipped,
      action: 'selected_materials',
    };
  }

  async normalizeMaterials({ candidates, selectedIds }: {
    candidates: CandidateProjectSource[];
    selectedIds: string[];
    options: ProjectWriteOptions;
  }): Promise<NormalizedMaterialResult> {
    const selected = candidates.filter((candidate) => selectedIds.includes(candidate.id));
    return {
      workflowMaterials: selected.map((candidate) => ({
        type: candidate.path.includes('/articles/') ? 'article' : 'note',
        title: candidate.title,
        content: candidate.content,
      })),
      action: 'normalized_materials',
    };
  }

  async enhanceIntent({ options }: {
    options: ProjectWriteOptions;
    selectedCandidates: CandidateProjectSource[];
  }): Promise<EnhancedIntentResult> {
    return {
      title: '写作任务说明',
      content: [
        `文章标题：${options.title}`,
        `文章类型：${options.articleType}`,
        `目标读者：${options.reader}`,
        options.goal ? `写作目标：${options.goal}` : undefined,
        '要求：先讲真实问题，再讲关键转折，最后给出明确判断。',
      ].filter(Boolean).join('\n'),
      action: 'enhanced_intent',
    };
  }

  async evaluateDraft(): Promise<DraftEvaluationResult> {
    return {
      continueToEditorial: false,
      action: 'evaluated_draft',
    };
  }

  async finalizeEditorialDraft({ draft }: {
    draft: string;
    options: ProjectWriteOptions;
  }): Promise<EditorialFinalizationResult> {
    return {
      content: draft,
      action: 'finalized_editorial_draft',
    };
  }
}
```

Create `packages/cli/src/write/material-selector.ts`:

```ts
import { DeterministicWriteModelProvider, type WriteModelProvider } from './model-provider.js';
import type {
  CandidateProjectSource,
  ModelEnhancementMode,
  ProjectWriteOptions,
  SelectedProjectSource,
} from './types.js';

export interface MaterialSelectionOutput {
  selectedSources: SelectedProjectSource[];
  skippedSources: SelectedProjectSource[];
  modelActions: string[];
  provider: WriteModelProvider;
}

export const selectProjectSources = async ({
  candidates,
  maxMaterials,
  mode,
  provider,
  options,
}: {
  candidates: CandidateProjectSource[];
  maxMaterials?: number;
  mode: ModelEnhancementMode;
  provider?: WriteModelProvider;
  options?: ProjectWriteOptions;
}): Promise<MaterialSelectionOutput> => {
  const activeProvider = provider ?? new DeterministicWriteModelProvider();
  const effectiveOptions = {
    ...(options ?? {}),
    maxMaterials,
  } as ProjectWriteOptions;

  if (mode === 'off') {
    const fallback = await new DeterministicWriteModelProvider().selectMaterials({
      candidates,
      options: effectiveOptions,
    });
    return {
      selectedSources: mapSelections(candidates, fallback.selected),
      skippedSources: mapSelections(candidates, fallback.skipped),
      modelActions: [],
      provider: activeProvider,
    };
  }

  const result = await activeProvider.selectMaterials({
    candidates,
    options: effectiveOptions,
  });

  return {
    selectedSources: mapSelections(candidates, result.selected),
    skippedSources: mapSelections(candidates, result.skipped),
    modelActions: [result.action],
    provider: activeProvider,
  };
};

const mapSelections = (
  candidates: CandidateProjectSource[],
  decisions: Array<{ id: string; role: SelectedProjectSource['role'] }>,
): SelectedProjectSource[] =>
  decisions.map((decision) => {
    const source = candidates.find((candidate) => candidate.id === decision.id);
    if (!source) throw new Error(`Unknown source id: ${decision.id}`);
    return {
      id: source.id,
      kind: source.kind,
      path: source.path,
      role: decision.role,
    };
  });
```

Create `packages/cli/src/write/material-normalizer.ts`:

```ts
import type { AddMaterialRequest } from '@ptce/shared';

import type { CandidateProjectSource, ProjectWriteOptions, SelectedProjectSource } from './types.js';
import type { WriteModelProvider } from './model-provider.js';

export const normalizeProjectMaterials = async ({
  candidates,
  selectedSources,
  options,
  provider,
}: {
  candidates: CandidateProjectSource[];
  selectedSources: SelectedProjectSource[];
  options: ProjectWriteOptions;
  provider: WriteModelProvider;
}): Promise<{ materials: AddMaterialRequest[]; modelActions: string[] }> => {
  const result =
    options.modelEnhancement === 'select-only'
      ? {
          workflowMaterials: candidates
            .filter((candidate) => selectedSources.some((source) => source.id === candidate.id))
            .map((candidate) => ({
              type: candidate.path.includes('/articles/') ? 'article' : 'note',
              title: candidate.title,
              content: candidate.content,
            })),
          action: 'normalized_materials',
        }
      : await provider.normalizeMaterials({
          candidates,
          selectedIds: selectedSources.map((source) => source.id),
          options,
        });

  return {
    materials: result.workflowMaterials.map((material) => ({
      source: 'inline',
      type: material.type,
      title: material.title,
      content: material.content,
    })),
    modelActions: [result.action],
  };
};
```

Create `packages/cli/src/write/intent-enhancer.ts`:

```ts
import type { AddMaterialRequest } from '@ptce/shared';

import type { CandidateProjectSource, ProjectWriteOptions } from './types.js';
import type { WriteModelProvider } from './model-provider.js';

export const buildIntentMaterial = async ({
  options,
  selectedCandidates,
  provider,
}: {
  options: ProjectWriteOptions;
  selectedCandidates: CandidateProjectSource[];
  provider: WriteModelProvider;
}): Promise<{ material: AddMaterialRequest; modelActions: string[] }> => {
  const result = await provider.enhanceIntent({
    options,
    selectedCandidates,
  });

  return {
    material: {
      source: 'inline',
      type: 'prompt',
      title: result.title,
      content: result.content,
    },
    modelActions: [result.action],
  };
};
```

- [ ] **Step 4: Run selection tests to verify they pass**

Run:

```bash
npm test -- --run packages/cli/tests/write/material-selector.test.ts
```

Expected:

- PASS
- provider-driven selection works
- deterministic fallback works

- [ ] **Step 5: Commit**

```bash
git add \
  packages/cli/src/write/model-provider.ts \
  packages/cli/src/write/material-selector.ts \
  packages/cli/src/write/material-normalizer.ts \
  packages/cli/src/write/intent-enhancer.ts \
  packages/cli/tests/write/material-selector.test.ts
git commit -m "feat: add write project selection and model provider layer"
```

---

### Task 4: Orchestrate the Existing Workflow Through `draft`

**Files:**
- Create: `packages/cli/src/write/workflow-runner.ts`
- Create: `packages/cli/tests/write/workflow-runner.test.ts`

- [ ] **Step 1: Write the failing workflow-runner tests**

Create `packages/cli/tests/write/workflow-runner.test.ts`:

```ts
import { TaskStage } from '@ptce/shared';
import { describe, expect, it, vi } from 'vitest';

import { createProjectWriteRunner } from '../../src/write/workflow-runner.js';
import type { ApiClientLike } from '../../src/client/api-client.js';

describe('createProjectWriteRunner', () => {
  it('runs task, material, bedrock, outline, and draft in order by default', async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce({
        task: {
          id: 'task-1',
          title: 'Retrospective',
          articleType: 'build-retrospective',
          preferredChannel: 'blog',
          reader: 'developers',
          stage: TaskStage.Created,
          createdAt: '2026-04-26T00:00:00.000Z',
          updatedAt: '2026-04-26T00:00:00.000Z',
        },
      })
      .mockResolvedValue({
        task: {
          id: 'task-1',
          title: 'Retrospective',
          articleType: 'build-retrospective',
          preferredChannel: 'blog',
          reader: 'developers',
          stage: TaskStage.DraftReady,
          createdAt: '2026-04-26T00:00:00.000Z',
          updatedAt: '2026-04-26T00:00:00.000Z',
        },
        materials: [],
        bedrock: { id: 'bedrock-1', taskId: 'task-1', theme: 'Retrospective', coreQuestion: 'Why now?', arguments: [], evidence: [], uncertainties: [], confirmed: true },
        outline: { id: 'outline-1', taskId: 'task-1', title: 'Retrospective', sections: [], confirmed: true },
        version: { id: 'version-1', taskId: 'task-1', versionType: 'draft', content: '# Draft', basedOnBedrockId: 'bedrock-1', basedOnOutlineId: 'outline-1', styleProfileId: 'style-1', changeSummary: 'Initial draft' },
      });

    const createApiClient = vi.fn((): ApiClientLike => ({ request }));

    const runner = createProjectWriteRunner({
      baseUrl: 'http://127.0.0.1:4312',
      createApiClient,
    });

    const result = await runner.run({
      projectPath: '/repo',
      title: 'Retrospective',
      articleType: 'build-retrospective',
      reader: 'developers',
      channel: 'blog',
      stopAt: 'draft',
      editorialMode: 'none',
      export: false,
      withGitLog: false,
      withObsidianContext: false,
      modelEnhancement: 'off',
    });

    expect(request.mock.calls.map(([call]) => `${call.method} ${call.path}`)).toEqual([
      'POST /tasks',
      'POST /tasks/task-1/materials',
      'POST /tasks/task-1/bedrock/generate',
      'POST /tasks/task-1/bedrock/bedrock-1/confirm',
      'POST /tasks/task-1/outlines/generate',
      'POST /tasks/task-1/outlines/outline-1/confirm',
      'POST /tasks/task-1/drafts/generate',
    ]);
    expect(result.stopAt).toBe('draft');
    expect(result.draftVersion?.id).toBe('version-1');
  });
});
```

- [ ] **Step 2: Run workflow-runner tests to verify they fail**

Run:

```bash
npm test -- --run packages/cli/tests/write/workflow-runner.test.ts
```

Expected:

- FAIL because `createProjectWriteRunner()` does not exist yet

- [ ] **Step 3: Implement the workflow runner**

Create `packages/cli/src/write/workflow-runner.ts`:

```ts
import type {
  BedrockResponse,
  MaterialListResponse,
  OutlineResponse,
  TaskEnvelope,
  VersionResponse,
} from '@ptce/shared';

import type { ApiClientLike } from '../client/api-client.js';
import type { ProjectWriteRunnerLike } from '../commands/write.js';
import { buildIntentMaterial } from './intent-enhancer.js';
import { normalizeProjectMaterials } from './material-normalizer.js';
import { DeterministicWriteModelProvider } from './model-provider.js';
import { collectProjectSources } from './project-scanner.js';
import { selectProjectSources } from './material-selector.js';
import type { ProjectWriteOptions, ProjectWriteResult } from './types.js';

export const createProjectWriteRunner = ({
  baseUrl,
  createApiClient,
}: {
  baseUrl: string;
  createApiClient: (options: { baseUrl: string }) => ApiClientLike;
}): ProjectWriteRunnerLike => {
  const client = createApiClient({ baseUrl });
  const provider = new DeterministicWriteModelProvider();

  return {
    async run(options: ProjectWriteOptions): Promise<ProjectWriteResult> {
      const candidates = await collectProjectSources({
        projectPath: options.projectPath,
        withGitLog: options.withGitLog,
        sourcePaths: options.sourcePaths,
      });

      const selection = await selectProjectSources({
        candidates,
        maxMaterials: options.maxMaterials,
        mode: options.modelEnhancement,
        provider,
        options,
      });

      const selectedCandidates = candidates.filter((candidate) =>
        selection.selectedSources.some((source) => source.id === candidate.id),
      );

      const intent = await buildIntentMaterial({
        options,
        selectedCandidates,
        provider: selection.provider,
      });
      const normalized = await normalizeProjectMaterials({
        candidates,
        selectedSources: selection.selectedSources,
        options,
        provider: selection.provider,
      });

      const createTask = await client.request<TaskEnvelope>({
        method: 'POST',
        path: '/tasks',
        body: {
          title: options.title,
          articleType: options.articleType,
          preferredChannel: options.channel,
          reader: options.reader,
        },
      });

      const taskId = createTask.task.id;
      let latestMaterials: MaterialListResponse | null = null;

      for (const material of [intent.material, ...normalized.materials]) {
        latestMaterials = await client.request<MaterialListResponse>({
          method: 'POST',
          path: `/tasks/${taskId}/materials`,
          body: material,
        });
      }

      const bedrock = await client.request<BedrockResponse>({
        method: 'POST',
        path: `/tasks/${taskId}/bedrock/generate`,
      });

      if (options.stopAt === 'bedrock') {
        return {
          task: bedrock.task,
          materials: latestMaterials?.materials ?? [],
          bedrock: bedrock.bedrock,
          outline: null,
          draftVersion: null,
          rewriteVersion: null,
          exportRecord: null,
          stopAt: options.stopAt,
          editorialMode: options.editorialMode,
          selectedSources: selection.selectedSources,
          skippedSources: selection.skippedSources,
          modelActions: [...selection.modelActions, ...intent.modelActions, ...normalized.modelActions],
        };
      }

      const confirmedBedrock = await client.request<BedrockResponse>({
        method: 'POST',
        path: `/tasks/${taskId}/bedrock/${bedrock.bedrock.id}/confirm`,
      });
      const outline = await client.request<OutlineResponse>({
        method: 'POST',
        path: `/tasks/${taskId}/outlines/generate`,
      });

      if (options.stopAt === 'outline') {
        return {
          task: outline.task,
          materials: latestMaterials?.materials ?? [],
          bedrock: confirmedBedrock.bedrock,
          outline: outline.outline,
          draftVersion: null,
          rewriteVersion: null,
          exportRecord: null,
          stopAt: options.stopAt,
          editorialMode: options.editorialMode,
          selectedSources: selection.selectedSources,
          skippedSources: selection.skippedSources,
          modelActions: [...selection.modelActions, ...intent.modelActions, ...normalized.modelActions],
        };
      }

      const confirmedOutline = await client.request<OutlineResponse>({
        method: 'POST',
        path: `/tasks/${taskId}/outlines/${outline.outline.id}/confirm`,
      });
      const draft = await client.request<VersionResponse>({
        method: 'POST',
        path: `/tasks/${taskId}/drafts/generate`,
      });

      if (options.stopAt === 'draft' && !options.export) {
        return {
          task: draft.task,
          materials: latestMaterials?.materials ?? [],
          bedrock: confirmedBedrock.bedrock,
          outline: confirmedOutline.outline,
          draftVersion: draft.version,
          rewriteVersion: null,
          exportRecord: null,
          stopAt: options.stopAt,
          editorialMode: options.editorialMode,
          selectedSources: selection.selectedSources,
          skippedSources: selection.skippedSources,
          modelActions: [...selection.modelActions, ...intent.modelActions, ...normalized.modelActions],
        };
      }

      return {
        task: draft.task,
        materials: latestMaterials?.materials ?? [],
        bedrock: confirmedBedrock.bedrock,
        outline: confirmedOutline.outline,
        draftVersion: draft.version,
        rewriteVersion: null,
        exportRecord: null,
        stopAt: options.stopAt,
        editorialMode: options.editorialMode,
        selectedSources: selection.selectedSources,
        skippedSources: selection.skippedSources,
        modelActions: [...selection.modelActions, ...intent.modelActions, ...normalized.modelActions],
      };
    },
  };
};
```

- [ ] **Step 4: Run workflow-runner tests to verify they pass**

Run:

```bash
npm test -- --run packages/cli/tests/write/workflow-runner.test.ts
```

Expected:

- PASS
- runner calls the existing workflow in the right order

- [ ] **Step 5: Commit**

```bash
git add \
  packages/cli/src/write/workflow-runner.ts \
  packages/cli/tests/write/workflow-runner.test.ts
git commit -m "feat: orchestrate project writing through existing workflow"
```

---

### Task 5: Add Publishable Editorial Mode and Stop-Point Completion

**Files:**
- Create: `packages/cli/src/write/editorial-finalizer.ts`
- Modify: `packages/cli/src/write/workflow-runner.ts`
- Modify: `packages/cli/tests/write/workflow-runner.test.ts`

- [ ] **Step 1: Write the failing editorial-mode tests**

Extend `packages/cli/tests/write/workflow-runner.test.ts`:

```ts
it('can continue into rewrite and export when publishable editorial mode is requested', async () => {
  const request = vi
    .fn()
    .mockResolvedValueOnce({
      task: {
        id: 'task-2',
        title: 'Retrospective',
        articleType: 'build-retrospective',
        preferredChannel: 'blog',
        reader: 'developers',
        stage: TaskStage.Created,
        createdAt: '2026-04-26T00:00:00.000Z',
        updatedAt: '2026-04-26T00:00:00.000Z',
      },
    })
    .mockResolvedValue({
      task: {
        id: 'task-2',
        title: 'Retrospective',
        articleType: 'build-retrospective',
        preferredChannel: 'blog',
        reader: 'developers',
        stage: TaskStage.Exported,
        createdAt: '2026-04-26T00:00:00.000Z',
        updatedAt: '2026-04-26T00:00:00.000Z',
      },
      materials: [],
      bedrock: { id: 'bedrock-2', taskId: 'task-2', theme: 'Retrospective', coreQuestion: 'Why now?', arguments: [], evidence: [], uncertainties: [], confirmed: true },
      outline: { id: 'outline-2', taskId: 'task-2', title: 'Retrospective', sections: [], confirmed: true },
      version: { id: 'version-2', taskId: 'task-2', versionType: 'rewrite', content: '# Publishable', basedOnBedrockId: 'bedrock-2', basedOnOutlineId: 'outline-2', styleProfileId: 'style-2', changeSummary: 'Editorial pass' },
      exportRecord: { id: 'export-1', taskId: 'task-2', versionId: 'version-2', channel: 'blog', format: 'markdown', outputPath: '/vault/out.md' },
    });

  const runner = createProjectWriteRunner({
    baseUrl: 'http://127.0.0.1:4312',
    createApiClient: () => ({ request }),
  });

  const result = await runner.run({
    projectPath: '/repo',
    title: 'Retrospective',
    articleType: 'build-retrospective',
    reader: 'developers',
    channel: 'blog',
    stopAt: 'export',
    editorialMode: 'publishable',
    export: true,
    exportPath: 'content-engine/articles/task-2.md',
    obsidianVaultPath: '/vault',
    withGitLog: false,
    withObsidianContext: false,
    modelEnhancement: 'off',
  });

  expect(request.mock.calls.map(([call]) => `${call.method} ${call.path}`)).toContain(
    'POST /tasks/task-2/rewrites',
  );
  expect(request.mock.calls.map(([call]) => `${call.method} ${call.path}`)).toContain(
    'POST /tasks/task-2/exports',
  );
  expect(result.rewriteVersion?.versionType).toBe('rewrite');
  expect(result.exportRecord?.outputPath).toBe('/vault/out.md');
});
```

- [ ] **Step 2: Run workflow-runner tests to verify they fail**

Run:

```bash
npm test -- --run packages/cli/tests/write/workflow-runner.test.ts
```

Expected:

- FAIL because the runner currently stops at `draft`

- [ ] **Step 3: Add editorial instruction generation and stop-point completion**

Create `packages/cli/src/write/editorial-finalizer.ts`:

```ts
import type { ProjectWriteOptions } from './types.js';
import type { WriteModelProvider } from './model-provider.js';

export const buildEditorialInstruction = async ({
  draft,
  options,
  provider,
}: {
  draft: string;
  options: ProjectWriteOptions;
  provider: WriteModelProvider;
}): Promise<{ continueToEditorial: boolean; instruction?: string; modelActions: string[] }> => {
  if (options.editorialMode !== 'publishable') {
    return {
      continueToEditorial: false,
      modelActions: [],
    };
  }

  const evaluation = await provider.evaluateDraft({
    draft,
    options,
  });

  return {
    continueToEditorial: evaluation.continueToEditorial || true,
    instruction:
      evaluation.instruction ??
      '更像第一人称技术复盘，强化开头吸引力、小标题节奏和最后一句总结。',
    modelActions: [evaluation.action],
  };
};
```

Modify `packages/cli/src/write/workflow-runner.ts`:

```ts
import type { ExportResponse } from '@ptce/shared';

import { buildEditorialInstruction } from './editorial-finalizer.js';

// inside run(), after draft generation:
const editorial = await buildEditorialInstruction({
  draft: draft.version.content,
  options,
  provider: selection.provider,
});

if (options.stopAt === 'draft' && !options.export) {
  return {
    // existing draft result...
    modelActions: [
      ...selection.modelActions,
      ...intent.modelActions,
      ...normalized.modelActions,
      ...editorial.modelActions,
    ],
  };
}

let rewriteVersion = null;
if (options.stopAt === 'rewrite' || options.stopAt === 'export' || editorial.continueToEditorial) {
  const rewrite = await client.request<VersionResponse>({
    method: 'POST',
    path: `/tasks/${taskId}/rewrites`,
    body: {
      versionId: draft.version.id,
      instruction: editorial.instruction ?? 'Tighten the draft.',
    },
  });
  rewriteVersion = rewrite.version;

  if (options.stopAt === 'rewrite' && !options.export) {
    return {
      task: rewrite.task,
      materials: latestMaterials?.materials ?? [],
      bedrock: confirmedBedrock.bedrock,
      outline: confirmedOutline.outline,
      draftVersion: draft.version,
      rewriteVersion,
      exportRecord: null,
      stopAt: options.stopAt,
      editorialMode: options.editorialMode,
      selectedSources: selection.selectedSources,
      skippedSources: selection.skippedSources,
      modelActions: [
        ...selection.modelActions,
        ...intent.modelActions,
        ...normalized.modelActions,
        ...editorial.modelActions,
      ],
    };
  }
}

if (options.export || options.stopAt === 'export') {
  const exportResponse = await client.request<ExportResponse>({
    method: 'POST',
    path: `/tasks/${taskId}/exports`,
    body: {
      versionId: rewriteVersion?.id ?? draft.version.id,
      channel: options.channel,
      format: 'markdown',
      target: options.obsidianVaultPath ? 'obsidian' : 'local',
      ...(options.obsidianVaultPath
        ? {
            vaultPath: options.obsidianVaultPath,
            outputPath: options.exportPath ?? `content-engine/articles/${taskId}-${options.channel}.md`,
          }
        : {
            outputPath: options.exportPath,
          }),
    },
  });

  return {
    task: exportResponse.task,
    materials: latestMaterials?.materials ?? [],
    bedrock: confirmedBedrock.bedrock,
    outline: confirmedOutline.outline,
    draftVersion: draft.version,
    rewriteVersion,
    exportRecord: exportResponse.exportRecord,
    stopAt: options.stopAt,
    editorialMode: options.editorialMode,
    selectedSources: selection.selectedSources,
    skippedSources: selection.skippedSources,
    modelActions: [
      ...selection.modelActions,
      ...intent.modelActions,
      ...normalized.modelActions,
      ...editorial.modelActions,
    ],
  };
}
```

- [ ] **Step 4: Run workflow-runner tests to verify they pass**

Run:

```bash
npm test -- --run packages/cli/tests/write/workflow-runner.test.ts
```

Expected:

- PASS
- runner can continue into rewrite/export
- publishable path stays structured

- [ ] **Step 5: Commit**

```bash
git add \
  packages/cli/src/write/editorial-finalizer.ts \
  packages/cli/src/write/workflow-runner.ts \
  packages/cli/tests/write/workflow-runner.test.ts
git commit -m "feat: add publishable editorial flow for write project"
```

---

### Task 6: Add the Repo-Local Skill Wrapper and Full CLI Coverage

**Files:**
- Create: `.agents/skills/ptce-writing/SKILL.md`
- Modify: `packages/cli/tests/cli.test.ts`
- Modify: `packages/cli/src/index.ts`

- [ ] **Step 1: Write the failing CLI coverage test for the final command surface**

Extend `packages/cli/tests/cli.test.ts`:

```ts
it('includes the write command in the full PTCE command surface', () => {
  const program = buildProgram();
  const commandNames = program.commands.map((command) => command.name());

  expect(commandNames).toEqual([
    'task',
    'material',
    'bedrock',
    'outline',
    'draft',
    'rewrite',
    'export',
    'write',
  ]);
});
```

- [ ] **Step 2: Run CLI tests to verify the final surface is correct**

Run:

```bash
npm test -- --run packages/cli/tests/cli.test.ts
```

Expected:

- PASS after the earlier command-surface updates
- FAIL if the final order or registration is still wrong

- [ ] **Step 3: Add the repo-local skill wrapper**

Create `.agents/skills/ptce-writing/SKILL.md`:

```md
---
name: ptce-writing
description: "Use PTCE's high-level CLI entrypoint to generate technical writing from a local project, optionally with model-assisted selection and publishable editorial finishing."
---

# PTCE Writing Skill

Use this skill when the user wants to turn a local technical project into structured writing through PTCE.

## When to use it

- project retrospectives
- technical summaries
- practice shares
- design explanations

## Primary command

```bash
ptce write project \
  --project-path /path/to/project \
  --title "..." \
  --article-type build-retrospective \
  --reader "..." \
  --stop-at draft \
  --render json
```

## Operating rules

1. Prefer `--render json` so downstream agents can inspect structured output.
2. Default to `--stop-at draft` unless the user explicitly asks for a publishable result.
3. Use `--editorial-mode publishable --export` only when the user wants a stronger final article.
4. Prefer project directory input first; use Obsidian only as optional context or export target.
5. Explain which sources were selected and which were skipped.

## Required parameters

- `--project-path`
- `--title`
- `--article-type`
- `--reader`

## Strong defaults

- `--channel blog`
- `--stop-at draft`
- `--model-enhancement standard`

## Publishable mode

When the user wants a stronger public-facing article:

```bash
ptce write project \
  --project-path /path/to/project \
  --title "..." \
  --article-type build-retrospective \
  --reader "..." \
  --stop-at export \
  --editorial-mode publishable \
  --export \
  --obsidian-vault-path "/abs/vault" \
  --render json
```
```

- [ ] **Step 4: Run the focused CLI suite**

Run:

```bash
npm test -- --run \
  packages/cli/tests/cli.test.ts \
  packages/cli/tests/write/project-scanner.test.ts \
  packages/cli/tests/write/material-selector.test.ts \
  packages/cli/tests/write/workflow-runner.test.ts
```

Expected:

- PASS
- high-level command surface, scanner, selection, orchestration, and skill-facing JSON shape are covered

- [ ] **Step 5: Commit**

```bash
git add \
  .agents/skills/ptce-writing/SKILL.md \
  packages/cli/tests/cli.test.ts
git commit -m "feat: add ptce writing skill wrapper"
```

---

### Task 7: Final Verification

**Files:**
- No new files

- [ ] **Step 1: Run the full relevant test set**

Run:

```bash
npm test -- --run \
  packages/cli/tests/cli.test.ts \
  packages/cli/tests/write/project-scanner.test.ts \
  packages/cli/tests/write/material-selector.test.ts \
  packages/cli/tests/write/workflow-runner.test.ts \
  packages/mock-server/tests/generators/bedrock-generator.test.ts \
  packages/mock-server/tests/generators/outline-generator.test.ts \
  packages/mock-server/tests/generators/draft-generator.test.ts \
  packages/mock-server/tests/generators/rewrite-generator.test.ts \
  packages/mock-server/tests/workflow-routes.test.ts \
  packages/shared/tests/contracts.test.ts
```

Expected:

- all CLI tests PASS
- all write-project unit tests PASS
- existing generator and workflow tests remain green
- no regressions in low-level task/material/workflow behavior

- [ ] **Step 2: Run a smoke CLI invocation with injected deterministic behavior**

Run:

```bash
node --import tsx packages/cli/src/index.ts write project \
  --project-path /Users/a1234/Workspace/ai-homework-review \
  --title "AI Homework Review Retrospective" \
  --article-type build-retrospective \
  --reader "agent curious developers" \
  --stop-at draft \
  --render json
```

Expected:

- structured JSON output
- selected/skipped sources included
- task plus draft-level workflow objects returned

- [ ] **Step 3: Commit final integration if needed**

```bash
git add packages/cli/src packages/cli/tests .agents/skills/ptce-writing/SKILL.md
git commit -m "feat: add high-level write project workflow"
```

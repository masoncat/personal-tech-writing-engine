# PTCE Impact Card Command Surface Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new `ptce write impact-card` command surface so PTCE can accept approved `Impact Card` JSON input as a first-class writing source.

**Architecture:** Extend the existing `write` command group rather than replacing it. Reuse the same output shape as `write project`, but add a dedicated runner interface and option type for impact-card-driven writing.

**Tech Stack:** TypeScript, Commander, Vitest, existing PTCE CLI dependency injection pattern.

---

## File Structure

- Modify: `packages/cli/src/index.ts`
- Modify: `packages/cli/src/commands/write.ts`
- Modify: `packages/cli/src/write/types.ts`
- Modify: `packages/cli/tests/cli.test.ts`

### Task 1: Add the Failing CLI Tests

**Files:**
- Modify: `packages/cli/tests/cli.test.ts`

- [ ] **Step 1: Add command-registration and option-mapping tests**

Add to `packages/cli/tests/cli.test.ts`:

```ts
it('registers the write command group with project and impact-card subcommands', () => {
  const program = buildProgram();
  const writeCommand = program.commands.find((command) => command.name() === 'write');

  expect(writeCommand?.commands.map((command) => command.name())).toEqual(['project', 'impact-card']);
});

it('maps write impact-card options into a high-level runner request', async () => {
  const stdout = createCaptureStream();
  const runImpactCardWrite = vi.fn().mockResolvedValue({
    task: {
      id: 'task-impact-1',
      title: 'Why this Copilot update matters',
      articleType: 'news-brief',
      preferredChannel: 'blog',
      reader: 'ordinary office workers',
      stage: TaskStage.DraftReady,
      createdAt: '2026-04-29T00:00:00.000Z',
      updatedAt: '2026-04-29T00:00:00.000Z',
    },
    materials: [],
    bedrock: null,
    outline: null,
    draftVersion: null,
    rewriteVersion: null,
    exportRecord: null,
    stopAt: 'draft',
    editorialMode: 'none',
    selectedSources: [],
    skippedSources: [],
    modelActions: ['loaded_impact_card'],
  });

  const program = buildProgram({
    createWriteImpactCardRunner: () => ({ run: runImpactCardWrite }),
    stdout,
  });

  await program.parseAsync([
    'node',
    'ptce',
    'write',
    'impact-card',
    '--card-path',
    '/tmp/impact-1.json',
    '--title',
    'Why this Copilot update matters',
    '--article-type',
    'news-brief',
    '--reader',
    'ordinary office workers',
    '--render',
    'json',
  ]);

  expect(runImpactCardWrite).toHaveBeenCalledWith({
    cardPath: '/tmp/impact-1.json',
    title: 'Why this Copilot update matters',
    articleType: 'news-brief',
    reader: 'ordinary office workers',
    goal: undefined,
    channel: 'blog',
    stopAt: 'draft',
    editorialMode: 'none',
    export: false,
    exportPath: undefined,
    obsidianVaultPath: undefined,
    modelEnhancement: 'standard',
  });
});
```

- [ ] **Step 2: Run the test to verify failure**

Run:

```bash
npm test -- --run packages/cli/tests/cli.test.ts
```

Expected:

- FAIL because `impact-card` is not registered
- FAIL because `createWriteImpactCardRunner` does not exist

### Task 2: Add the New Option Type and Runner Interface

**Files:**
- Modify: `packages/cli/src/write/types.ts`
- Modify: `packages/cli/src/index.ts`

- [ ] **Step 1: Add `ImpactCardWriteOptions`**

Update `packages/cli/src/write/types.ts`:

```ts
export interface ImpactCardWriteOptions {
  cardPath: string;
  title: string;
  articleType: 'news-brief' | 'news-explainer' | 'weekly-roundup';
  reader: string;
  goal?: string;
  channel: ExportChannel;
  stopAt: WriteStopAt;
  editorialMode: EditorialMode;
  export: boolean;
  exportPath?: string;
  obsidianVaultPath?: string;
  modelEnhancement: ModelEnhancementMode;
}
```

- [ ] **Step 2: Add dependency injection for the new runner**

Update `packages/cli/src/index.ts`:

```ts
import {
  registerWriteCommands,
  type ImpactCardWriteRunnerLike,
  type ProjectWriteRunnerLike,
} from './commands/write.js';
import { createImpactCardWriteRunner, createProjectWriteRunner } from './write/impact-card-workflow-runner.js';

export interface BuildProgramDependencies {
  createApiClient?: (options: { baseUrl: string }) => ApiClientLike;
  createWriteProjectRunner?: (options: {
    baseUrl: string;
    createApiClient: (options: { baseUrl: string }) => ApiClientLike;
  }) => ProjectWriteRunnerLike;
  createWriteImpactCardRunner?: (options: {
    baseUrl: string;
    createApiClient: (options: { baseUrl: string }) => ApiClientLike;
  }) => ImpactCardWriteRunnerLike;
  stdout?: Writer;
  stderr?: Writer;
}
```

- [ ] **Step 3: Wire the default runner into `buildProgram()`**

Update `packages/cli/src/index.ts`:

```ts
export const buildProgram = ({
  createApiClient = defaultCreateApiClient,
  createWriteProjectRunner = createProjectWriteRunner,
  createWriteImpactCardRunner = createImpactCardWriteRunner,
  stdout = process.stdout,
  stderr = process.stderr,
}: BuildProgramDependencies = {}): Command => {
  // ...
  registerWriteCommands(program, {
    createApiClient,
    createWriteProjectRunner,
    createWriteImpactCardRunner,
    stdout,
  });
}
```

- [ ] **Step 4: Commit**

```bash
git add packages/cli/src/write/types.ts packages/cli/src/index.ts
git commit -m "feat: add impact card write types"
```

### Task 3: Register `write impact-card`

**Files:**
- Modify: `packages/cli/src/commands/write.ts`

- [ ] **Step 1: Add the runner interface**

Update `packages/cli/src/commands/write.ts`:

```ts
import type {
  EditorialMode,
  ImpactCardWriteOptions,
  ModelEnhancementMode,
  ProjectWriteOptions,
  ProjectWriteResult,
  WriteStopAt,
} from '../write/types.js';

export interface ImpactCardWriteRunnerLike {
  run(options: ImpactCardWriteOptions): Promise<ProjectWriteResult>;
}
```

- [ ] **Step 2: Extend command dependencies**

Update `packages/cli/src/commands/write.ts`:

```ts
export interface WriteCommandDependencies {
  createApiClient: (options: { baseUrl: string }) => ApiClientLike;
  createWriteProjectRunner: (options: {
    baseUrl: string;
    createApiClient: (options: { baseUrl: string }) => ApiClientLike;
  }) => ProjectWriteRunnerLike;
  createWriteImpactCardRunner: (options: {
    baseUrl: string;
    createApiClient: (options: { baseUrl: string }) => ApiClientLike;
  }) => ImpactCardWriteRunnerLike;
  stdout: Writer;
}
```

- [ ] **Step 3: Register the new subcommand**

Update `packages/cli/src/commands/write.ts`:

```ts
withCommonOptions(
  write
    .command('impact-card')
    .description('Generate a writing task from one approved impact card JSON file')
    .requiredOption('--card-path <path>', 'Approved impact card JSON path')
    .requiredOption('--title <title>', 'Writing task title')
    .requiredOption('--article-type <articleType>', 'Writing article type')
    .requiredOption('--reader <reader>', 'Target reader')
    .option('--goal <goal>', 'Writing goal')
    .option('--channel <channel>', createChoiceParser(CHANNELS, '--channel'), 'blog')
    .option('--stop-at <stopAt>', createChoiceParser(STOP_POINTS, '--stop-at'), 'draft')
    .option('--editorial-mode <mode>', createChoiceParser(EDITORIAL_MODES, '--editorial-mode'), 'none')
    .option('--export', 'Run export after the requested stop point', false)
    .option('--export-path <path>', 'Export output path')
    .option('--obsidian-vault-path <path>', 'Obsidian vault path')
    .option('--model-enhancement <mode>', createChoiceParser(MODEL_MODES, '--model-enhancement'), 'standard')
    .action(async (options) => {
      const runner = createWriteImpactCardRunner({
        baseUrl: options.baseUrl,
        createApiClient,
      });
      const result = await runner.run({
        cardPath: options.cardPath,
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
        modelEnhancement: options.modelEnhancement,
      });
      writeRenderedOutput(stdout, result, options.render);
    }),
);
```

- [ ] **Step 4: Run the test to verify pass**

Run:

```bash
npm test -- --run packages/cli/tests/cli.test.ts
```

Expected:

- PASS for both `impact-card` CLI tests

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/commands/write.ts packages/cli/tests/cli.test.ts
git commit -m "feat: register ptce write impact-card"
```

### Task 4: Final Verification

**Files:**
- Verify: CLI package

- [ ] **Step 1: Run CLI tests**

```bash
npm test -- --run packages/cli/tests/cli.test.ts
```

Expected:

- PASS for both existing and new command-surface tests

- [ ] **Step 2: Run workspace verification**

```bash
npm run verify
```

Expected:

- PASS for the workspace suites that are already green on the base branch

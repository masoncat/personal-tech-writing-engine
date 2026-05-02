# CLI Mock Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a runnable `ptce` CLI plus local Fastify mock application service that completes `task -> material -> bedrock -> outline -> draft -> rewrite -> export`, including Obsidian import and selective Obsidian write-back.

**Architecture:** Use an npm workspace monorepo with three packages: `@ptce/shared` for domain types and contracts, `@ptce/mock-server` for the file-backed application service, and `@ptce/cli` for the HTTP-only command line client. Persist runtime state under `.ptce-data/`, keep the task workflow stage-gated, and write selected high-value artifacts back to Obsidian during export.

**Tech Stack:** Node.js, TypeScript, npm workspaces, Fastify, commander.js, zod, gray-matter, vitest, tsx

---

## File Structure

- Create: `package.json`
- Create: `tsconfig.base.json`
- Create: `.gitignore`
- Create: `vitest.workspace.ts`
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/domain.ts`
- Create: `packages/shared/src/contracts.ts`
- Create: `packages/shared/src/errors.ts`
- Create: `packages/shared/src/index.ts`
- Create: `packages/shared/tests/domain.test.ts`
- Create: `packages/mock-server/package.json`
- Create: `packages/mock-server/tsconfig.json`
- Create: `packages/mock-server/src/index.ts`
- Create: `packages/mock-server/src/app.ts`
- Create: `packages/mock-server/src/routes/task-routes.ts`
- Create: `packages/mock-server/src/routes/material-routes.ts`
- Create: `packages/mock-server/src/routes/workflow-routes.ts`
- Create: `packages/mock-server/src/repository/file-store.ts`
- Create: `packages/mock-server/src/repository/task-repository.ts`
- Create: `packages/mock-server/src/repository/material-repository.ts`
- Create: `packages/mock-server/src/repository/bedrock-repository.ts`
- Create: `packages/mock-server/src/repository/outline-repository.ts`
- Create: `packages/mock-server/src/repository/version-repository.ts`
- Create: `packages/mock-server/src/repository/style-profile-repository.ts`
- Create: `packages/mock-server/src/repository/export-repository.ts`
- Create: `packages/mock-server/src/services/task-service.ts`
- Create: `packages/mock-server/src/services/material-service.ts`
- Create: `packages/mock-server/src/services/obsidian-import-service.ts`
- Create: `packages/mock-server/src/services/bedrock-service.ts`
- Create: `packages/mock-server/src/services/outline-service.ts`
- Create: `packages/mock-server/src/services/draft-service.ts`
- Create: `packages/mock-server/src/services/rewrite-service.ts`
- Create: `packages/mock-server/src/services/export-service.ts`
- Create: `packages/mock-server/src/generators/bedrock-generator.ts`
- Create: `packages/mock-server/src/generators/outline-generator.ts`
- Create: `packages/mock-server/src/generators/draft-generator.ts`
- Create: `packages/mock-server/src/generators/style-generator.ts`
- Create: `packages/mock-server/src/generators/rewrite-generator.ts`
- Create: `packages/mock-server/src/generators/export-generator.ts`
- Create: `packages/mock-server/src/workflow/stage-guards.ts`
- Create: `packages/mock-server/tests/task-routes.test.ts`
- Create: `packages/mock-server/tests/material-routes.test.ts`
- Create: `packages/mock-server/tests/workflow-routes.test.ts`
- Create: `packages/cli/package.json`
- Create: `packages/cli/tsconfig.json`
- Create: `packages/cli/src/index.ts`
- Create: `packages/cli/src/client/api-client.ts`
- Create: `packages/cli/src/commands/task.ts`
- Create: `packages/cli/src/commands/material.ts`
- Create: `packages/cli/src/commands/bedrock.ts`
- Create: `packages/cli/src/commands/outline.ts`
- Create: `packages/cli/src/commands/draft.ts`
- Create: `packages/cli/src/commands/rewrite.ts`
- Create: `packages/cli/src/commands/export.ts`
- Create: `packages/cli/src/output/renderers.ts`
- Create: `packages/cli/tests/cli.test.ts`
- Create: `tests/e2e/package.json`
- Create: `tests/e2e/tsconfig.json`
- Create: `tests/e2e/cli-workflow.test.ts`
- Create: `fixtures/obsidian-vault/fiber-note.md`
- Create: `fixtures/obsidian-vault/history-post.md`
- Create: `.ptce-data/.gitkeep`

### Task 1: Scaffold the workspace and TypeScript toolchain

**Files:**
- Create: `package.json`
- Create: `tsconfig.base.json`
- Create: `.gitignore`
- Create: `vitest.workspace.ts`
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/mock-server/package.json`
- Create: `packages/mock-server/tsconfig.json`
- Create: `packages/cli/package.json`
- Create: `packages/cli/tsconfig.json`
- Create: `.ptce-data/.gitkeep`
- Test: `packages/shared/tests/domain.test.ts`

- [ ] **Step 1: Write the failing workspace smoke test**

```ts
import { describe, expect, it } from 'vitest';
import { TaskStage } from '../src/domain';

describe('shared domain bootstrap', () => {
  it('exposes the task stages needed by the workflow', () => {
    expect(TaskStage.Created).toBe('created');
    expect(TaskStage.Exported).toBe('exported');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test --workspace @ptce/shared -- --run`
Expected: FAIL with `Cannot find module '../src/domain'` or missing workspace configuration.

- [ ] **Step 3: Add the root workspace files and package manifests**

```json
{
  "name": "personal-tech-writing-engine",
  "private": true,
  "version": "0.1.0",
  "workspaces": [
    "packages/*"
  ],
  "scripts": {
    "build": "npm run build --workspaces",
    "test": "vitest --run",
    "test:watch": "vitest",
    "dev:server": "npm run dev --workspace @ptce/mock-server",
    "dev:cli": "npm run dev --workspace @ptce/cli"
  },
  "devDependencies": {
    "@types/node": "^24.0.0",
    "tsx": "^4.19.2",
    "typescript": "^5.8.3",
    "vitest": "^3.2.4"
  }
}
```

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "declaration": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": "."
  }
}
```

```gitignore
node_modules
dist
.ptce-data/*
!.ptce-data/.gitkeep
coverage
```

```ts
import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  'packages/shared',
  'packages/mock-server',
  'packages/cli',
  'tests/e2e',
]);
```

```json
{
  "name": "@ptce/shared",
  "version": "0.1.0",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "test": "vitest --run"
  }
}
```

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": ".",
    "outDir": "dist"
  },
  "include": [
    "src",
    "tests"
  ]
}
```

```json
{
  "name": "@ptce/mock-server",
  "version": "0.1.0",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "dev": "tsx src/index.ts",
    "test": "vitest --run"
  },
  "dependencies": {
    "@ptce/shared": "0.1.0",
    "fastify": "^5.3.3",
    "gray-matter": "^4.0.3",
    "zod": "^3.24.3"
  }
}
```

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": ".",
    "outDir": "dist"
  },
  "include": [
    "src",
    "tests"
  ]
}
```

```json
{
  "name": "@ptce/cli",
  "version": "0.1.0",
  "type": "module",
  "bin": {
    "ptce": "dist/index.js"
  },
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "dev": "tsx src/index.ts",
    "test": "vitest --run"
  },
  "dependencies": {
    "@ptce/shared": "0.1.0",
    "commander": "^14.0.0",
    "zod": "^3.24.3"
  }
}
```

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": ".",
    "outDir": "dist"
  },
  "include": [
    "src",
    "tests"
  ]
}
```

- [ ] **Step 4: Add the `.ptce-data` keep file**

```text

```

- [ ] **Step 5: Run the workspace smoke test again**

Run: `npm test --workspace @ptce/shared -- --run`
Expected: FAIL with `Cannot find module '../src/domain'`, confirming the workspace is wired but the shared domain file still does not exist.

- [ ] **Step 6: Install dependencies**

Run: `npm install`
Expected: `added ... packages` and a generated `package-lock.json`.

- [ ] **Step 7: Commit the scaffold**

```bash
git add package.json package-lock.json tsconfig.base.json vitest.workspace.ts .gitignore .ptce-data/.gitkeep packages/shared/package.json packages/shared/tsconfig.json packages/mock-server/package.json packages/mock-server/tsconfig.json packages/cli/package.json packages/cli/tsconfig.json
git commit -m "chore: scaffold ptce workspace"
```

### Task 2: Build the shared domain model, DTOs, and error contracts

**Files:**
- Create: `packages/shared/src/domain.ts`
- Create: `packages/shared/src/contracts.ts`
- Create: `packages/shared/src/errors.ts`
- Create: `packages/shared/src/index.ts`
- Modify: `packages/shared/tests/domain.test.ts`
- Create: `packages/shared/tests/contracts.test.ts`

- [ ] **Step 1: Write failing tests for the shared model**

```ts
import { describe, expect, it } from 'vitest';
import {
  ErrorCode,
  TaskStage,
  type CreateTaskRequest,
  type ExportTarget,
} from '../src/index';

describe('shared contracts', () => {
  it('defines the forward-only workflow stages', () => {
    expect(Object.values(TaskStage)).toEqual([
      'created',
      'collecting_materials',
      'bedrock_review',
      'outline_review',
      'draft_ready',
      'rewriting',
      'exported',
    ]);
  });

  it('keeps export targets explicit', () => {
    const target: ExportTarget = 'obsidian';
    expect(target).toBe('obsidian');
  });

  it('defines the required task creation request shape', () => {
    const request: CreateTaskRequest = {
      title: 'React Fiber scheduling',
      articleType: 'source-analysis',
      reader: 'frontend engineers',
    };

    expect(request.title).toContain('Fiber');
    expect(ErrorCode.InvalidStageTransition).toBe('INVALID_STAGE_TRANSITION');
  });
});
```

- [ ] **Step 2: Run the shared package tests to verify they fail**

Run: `npm test --workspace @ptce/shared -- --run`
Expected: FAIL with missing exports from `../src/index`.

- [ ] **Step 3: Implement the shared domain, contracts, and errors**

```ts
export enum TaskStage {
  Created = 'created',
  CollectingMaterials = 'collecting_materials',
  BedrockReview = 'bedrock_review',
  OutlineReview = 'outline_review',
  DraftReady = 'draft_ready',
  Rewriting = 'rewriting',
  Exported = 'exported',
}

export type MaterialType =
  | 'prompt'
  | 'note'
  | 'repo'
  | 'article'
  | 'draft'
  | 'reference';

export type MaterialSource = 'inline' | 'file' | 'obsidian';
export type ArticleVersionType = 'draft' | 'rewrite';
export type ExportChannel = 'blog' | 'wechat';
export type ExportFormat = 'markdown';
export type ExportTarget = 'local' | 'obsidian';

export interface WritingTask {
  id: string;
  title: string;
  articleType: string;
  reader: string;
  stage: TaskStage;
  createdAt: string;
  updatedAt: string;
}

export interface Material {
  id: string;
  taskId: string;
  type: MaterialType;
  title: string;
  source: MaterialSource;
  content: string;
  createdAt: string;
  vaultPath?: string;
  relativePath?: string;
  frontmatter?: Record<string, unknown>;
  tags?: string[];
}

export interface InformationBedrock {
  id: string;
  taskId: string;
  theme: string;
  coreQuestion: string;
  arguments: string[];
  evidence: string[];
  uncertainties: string[];
  confirmed: boolean;
}

export interface OutlineSection {
  title: string;
  goal: string;
  evidenceRefs: string[];
}

export interface ArticleOutline {
  id: string;
  taskId: string;
  title: string;
  sections: OutlineSection[];
  confirmed: boolean;
}

export interface StyleProfile {
  id: string;
  taskId: string;
  sourceMaterialIds: string[];
  openingTraits: string[];
  rhythmTraits: string[];
  explanationTraits: string[];
  forbiddenPatterns: string[];
  summary: string;
}

export interface ArticleVersion {
  id: string;
  taskId: string;
  versionType: ArticleVersionType;
  content: string;
  basedOnBedrockId: string;
  basedOnOutlineId: string;
  styleProfileId?: string;
  changeSummary: string;
}

export interface ExportRecord {
  id: string;
  taskId: string;
  versionId: string;
  channel: ExportChannel;
  format: ExportFormat;
  outputPath: string;
  vaultPath?: string;
  relativePath?: string;
}
```

```ts
import type {
  ArticleVersion,
  ExportChannel,
  ExportFormat,
  ExportRecord,
  InformationBedrock,
  Material,
  MaterialType,
  TaskStage,
  WritingTask,
  ArticleOutline,
} from './domain.js';

export interface CreateTaskRequest {
  title: string;
  articleType: string;
  reader: string;
}

export interface AddMaterialRequest {
  type: MaterialType;
  title: string;
  source: Material['source'];
  content: string;
  vaultPath?: string;
  relativePath?: string;
  frontmatter?: Record<string, unknown>;
  tags?: string[];
}

export interface ImportObsidianRequest {
  vaultPath: string;
  path: string;
}

export interface GenerateRewriteRequest {
  versionId: string;
  instruction: string;
}

export interface GenerateExportRequest {
  versionId: string;
  channel: ExportChannel;
  format: ExportFormat;
  target?: 'local' | 'obsidian';
  vaultPath?: string;
  outputPath?: string;
}

export interface TaskEnvelope {
  task: WritingTask;
}

export interface MaterialListResponse extends TaskEnvelope {
  materials: Material[];
}

export interface BedrockResponse extends TaskEnvelope {
  bedrock: InformationBedrock;
}

export interface OutlineResponse extends TaskEnvelope {
  outline: ArticleOutline;
}

export interface VersionsResponse extends TaskEnvelope {
  versions: ArticleVersion[];
}

export interface ExportResponse extends TaskEnvelope {
  exportRecord: ExportRecord;
}
```

```ts
export enum ErrorCode {
  TaskNotFound = 'TASK_NOT_FOUND',
  InvalidStageTransition = 'INVALID_STAGE_TRANSITION',
  BedrockNotConfirmed = 'BEDROCK_NOT_CONFIRMED',
  OutlineNotConfirmed = 'OUTLINE_NOT_CONFIRMED',
  MaterialNotFound = 'MATERIAL_NOT_FOUND',
  VersionNotFound = 'VERSION_NOT_FOUND',
  InvalidArgument = 'INVALID_ARGUMENT',
}

export interface AppErrorShape {
  code: ErrorCode;
  message: string;
  details?: Record<string, unknown>;
}
```

```ts
export * from './contracts.js';
export * from './domain.js';
export * from './errors.js';
```

- [ ] **Step 4: Run the shared tests to verify they pass**

Run: `npm test --workspace @ptce/shared -- --run`
Expected: PASS with both domain and contract tests green.

- [ ] **Step 5: Build the shared package**

Run: `npm run build --workspace @ptce/shared`
Expected: `tsc` exits successfully and writes `packages/shared/dist`.

- [ ] **Step 6: Commit the shared package**

```bash
git add packages/shared/src packages/shared/tests
git commit -m "feat: add shared ptce domain and contracts"
```

### Task 3: Implement file-backed repositories, stage guards, and task/material endpoints

**Files:**
- Create: `packages/mock-server/src/repository/file-store.ts`
- Create: `packages/mock-server/src/repository/task-repository.ts`
- Create: `packages/mock-server/src/repository/material-repository.ts`
- Create: `packages/mock-server/src/workflow/stage-guards.ts`
- Create: `packages/mock-server/src/services/task-service.ts`
- Create: `packages/mock-server/src/services/material-service.ts`
- Create: `packages/mock-server/src/routes/task-routes.ts`
- Create: `packages/mock-server/src/routes/material-routes.ts`
- Create: `packages/mock-server/src/app.ts`
- Create: `packages/mock-server/src/index.ts`
- Create: `packages/mock-server/tests/task-routes.test.ts`
- Create: `packages/mock-server/tests/material-routes.test.ts`

- [ ] **Step 1: Write failing route tests for tasks and materials**

```ts
import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { buildApp } from '../src/app';

describe('task routes', () => {
  const roots: string[] = [];

  afterEach(() => {
    while (roots.length > 0) {
      rmSync(roots.pop()!, { recursive: true, force: true });
    }
  });

  it('creates a task in created stage', async () => {
    const dataDir = mkdtempSync(join(tmpdir(), 'ptce-task-'));
    roots.push(dataDir);
    const app = buildApp({ dataDir });

    const response = await app.inject({
      method: 'POST',
      url: '/tasks',
      payload: {
        title: 'React Fiber scheduling',
        articleType: 'source-analysis',
        reader: 'frontend engineers',
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json().task.stage).toBe('created');
  });
});
```

```ts
import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { buildApp } from '../src/app';

describe('material routes', () => {
  const roots: string[] = [];

  afterEach(() => {
    while (roots.length > 0) {
      rmSync(roots.pop()!, { recursive: true, force: true });
    }
  });

  it('adds a material and moves the task to collecting_materials', async () => {
    const dataDir = mkdtempSync(join(tmpdir(), 'ptce-material-'));
    roots.push(dataDir);
    const app = buildApp({ dataDir });

    const taskResponse = await app.inject({
      method: 'POST',
      url: '/tasks',
      payload: {
        title: 'Fiber',
        articleType: 'source-analysis',
        reader: 'frontend engineers',
      },
    });

    const { task } = taskResponse.json();

    const materialResponse = await app.inject({
      method: 'POST',
      url: `/tasks/${task.id}/materials`,
      payload: {
        type: 'prompt',
        title: 'topic',
        source: 'inline',
        content: 'Explain the scheduler.',
      },
    });

    expect(materialResponse.statusCode).toBe(201);
    expect(materialResponse.json().task.stage).toBe('collecting_materials');
    expect(materialResponse.json().materials).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run the mock-server tests to verify they fail**

Run: `npm test --workspace @ptce/mock-server -- --run`
Expected: FAIL with missing `buildApp` or route modules.

- [ ] **Step 3: Implement repositories, stage guards, services, and HTTP routes**

```ts
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

export class FileStore<T> {
  constructor(private readonly filePath: string) {}

  readAll(): T[] {
    try {
      return JSON.parse(readFileSync(this.filePath, 'utf8')) as T[];
    } catch {
      return [];
    }
  }

  writeAll(values: T[]): void {
    mkdirSync(dirname(this.filePath), { recursive: true });
    writeFileSync(this.filePath, JSON.stringify(values, null, 2));
  }
}
```

```ts
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { FileStore } from './file-store.js';
import { TaskStage, type WritingTask } from '@ptce/shared';

export class TaskRepository {
  private readonly store: FileStore<WritingTask>;

  constructor(dataDir: string) {
    this.store = new FileStore(join(dataDir, 'tasks', 'tasks.json'));
  }

  create(input: Pick<WritingTask, 'title' | 'articleType' | 'reader'>): WritingTask {
    const now = new Date().toISOString();
    const task: WritingTask = {
      id: randomUUID(),
      title: input.title,
      articleType: input.articleType,
      reader: input.reader,
      stage: TaskStage.Created,
      createdAt: now,
      updatedAt: now,
    };
    const tasks = this.store.readAll();
    tasks.push(task);
    this.store.writeAll(tasks);
    return task;
  }

  get(taskId: string): WritingTask | undefined {
    return this.store.readAll().find((task) => task.id === taskId);
  }

  save(task: WritingTask): WritingTask {
    const tasks = this.store.readAll().map((candidate) =>
      candidate.id === task.id ? task : candidate,
    );
    this.store.writeAll(tasks);
    return task;
  }
}
```

```ts
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { FileStore } from './file-store.js';
import type { AddMaterialRequest, Material } from '@ptce/shared';

export class MaterialRepository {
  private readonly store: FileStore<Material>;

  constructor(dataDir: string) {
    this.store = new FileStore(join(dataDir, 'materials', 'materials.json'));
  }

  add(taskId: string, input: AddMaterialRequest): Material {
    const material: Material = {
      id: randomUUID(),
      taskId,
      type: input.type,
      title: input.title,
      source: input.source,
      content: input.content,
      createdAt: new Date().toISOString(),
      vaultPath: input.vaultPath,
      relativePath: input.relativePath,
      frontmatter: input.frontmatter,
      tags: input.tags,
    };
    const materials = this.store.readAll();
    materials.push(material);
    this.store.writeAll(materials);
    return material;
  }

  listByTask(taskId: string): Material[] {
    return this.store.readAll().filter((material) => material.taskId === taskId);
  }
}
```

```ts
import { ErrorCode, TaskStage, type WritingTask } from '@ptce/shared';

export function ensureTaskExists(task: WritingTask | undefined): WritingTask {
  if (!task) {
    throw {
      code: ErrorCode.TaskNotFound,
      message: 'Task was not found',
    };
  }

  return task;
}

export function touchStage(task: WritingTask, stage: TaskStage): WritingTask {
  return {
    ...task,
    stage,
    updatedAt: new Date().toISOString(),
  };
}
```

```ts
import type { CreateTaskRequest } from '@ptce/shared';
import { TaskRepository } from '../repository/task-repository.js';

export class TaskService {
  constructor(private readonly tasks: TaskRepository) {}

  createTask(input: CreateTaskRequest) {
    return this.tasks.create(input);
  }

  getTask(taskId: string) {
    return this.tasks.get(taskId);
  }
}
```

```ts
import { TaskStage, type AddMaterialRequest } from '@ptce/shared';
import { MaterialRepository } from '../repository/material-repository.js';
import { TaskRepository } from '../repository/task-repository.js';
import { ensureTaskExists, touchStage } from '../workflow/stage-guards.js';

export class MaterialService {
  constructor(
    private readonly tasks: TaskRepository,
    private readonly materials: MaterialRepository,
  ) {}

  addMaterial(taskId: string, input: AddMaterialRequest) {
    const task = ensureTaskExists(this.tasks.get(taskId));
    const material = this.materials.add(taskId, input);
    const nextTask =
      task.stage === TaskStage.Created ? touchStage(task, TaskStage.CollectingMaterials) : task;

    this.tasks.save(nextTask);

    return {
      task: nextTask,
      materials: this.materials.listByTask(taskId),
      material,
    };
  }

  listMaterials(taskId: string) {
    const task = ensureTaskExists(this.tasks.get(taskId));
    return {
      task,
      materials: this.materials.listByTask(taskId),
    };
  }
}
```

```ts
import Fastify from 'fastify';
import { TaskRepository } from './repository/task-repository.js';
import { MaterialRepository } from './repository/material-repository.js';
import { TaskService } from './services/task-service.js';
import { MaterialService } from './services/material-service.js';
import { registerTaskRoutes } from './routes/task-routes.js';
import { registerMaterialRoutes } from './routes/material-routes.js';

export function buildApp({ dataDir = '.ptce-data' }: { dataDir?: string } = {}) {
  const app = Fastify();
  const taskRepository = new TaskRepository(dataDir);
  const materialRepository = new MaterialRepository(dataDir);

  const taskService = new TaskService(taskRepository);
  const materialService = new MaterialService(taskRepository, materialRepository);

  registerTaskRoutes(app, taskService);
  registerMaterialRoutes(app, materialService);

  return app;
}
```

```ts
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { TaskService } from '../services/task-service.js';

const createTaskSchema = z.object({
  title: z.string().min(1),
  articleType: z.string().min(1),
  reader: z.string().min(1),
});

export function registerTaskRoutes(app: FastifyInstance, taskService: TaskService) {
  app.post('/tasks', async (request, reply) => {
    const payload = createTaskSchema.parse(request.body);
    const task = taskService.createTask(payload);
    return reply.code(201).send({ task });
  });

  app.get('/tasks/:taskId', async (request) => {
    const params = z.object({ taskId: z.string().uuid() }).parse(request.params);
    return { task: taskService.getTask(params.taskId) };
  });
}
```

```ts
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { MaterialService } from '../services/material-service.js';

const addMaterialSchema = z.object({
  type: z.enum(['prompt', 'note', 'repo', 'article', 'draft', 'reference']),
  title: z.string().min(1),
  source: z.enum(['inline', 'file', 'obsidian']),
  content: z.string().min(1),
});

export function registerMaterialRoutes(app: FastifyInstance, materialService: MaterialService) {
  app.post('/tasks/:taskId/materials', async (request, reply) => {
    const params = z.object({ taskId: z.string().uuid() }).parse(request.params);
    const payload = addMaterialSchema.parse(request.body);
    const response = materialService.addMaterial(params.taskId, payload);
    return reply.code(201).send(response);
  });

  app.get('/tasks/:taskId/materials', async (request) => {
    const params = z.object({ taskId: z.string().uuid() }).parse(request.params);
    return materialService.listMaterials(params.taskId);
  });
}
```

```ts
import { buildApp } from './app.js';

const app = buildApp();

await app.listen({
  host: '127.0.0.1',
  port: 4312,
});
```

- [ ] **Step 4: Run the mock-server tests to verify they pass**

Run: `npm test --workspace @ptce/mock-server -- --run`
Expected: PASS with task and material route tests green.

- [ ] **Step 5: Start the server locally and verify the task endpoint**

Run: `npm run dev --workspace @ptce/mock-server`
Expected: Fastify starts on `http://127.0.0.1:4312`.

Run: `curl -sS -X POST http://127.0.0.1:4312/tasks -H 'content-type: application/json' -d '{"title":"Fiber","articleType":"source-analysis","reader":"frontend engineers"}'`
Expected: JSON response with a `task.id` and `"stage":"created"`.

- [ ] **Step 6: Commit the repository and basic routes**

```bash
git add packages/mock-server/src packages/mock-server/tests
git commit -m "feat: add task and material mock server routes"
```

### Task 4: Add Obsidian import, workflow generators, versioning, and export write-back

**Files:**
- Create: `packages/mock-server/src/repository/bedrock-repository.ts`
- Create: `packages/mock-server/src/repository/outline-repository.ts`
- Create: `packages/mock-server/src/repository/version-repository.ts`
- Create: `packages/mock-server/src/repository/style-profile-repository.ts`
- Create: `packages/mock-server/src/repository/export-repository.ts`
- Create: `packages/mock-server/src/services/obsidian-import-service.ts`
- Create: `packages/mock-server/src/services/bedrock-service.ts`
- Create: `packages/mock-server/src/services/outline-service.ts`
- Create: `packages/mock-server/src/services/draft-service.ts`
- Create: `packages/mock-server/src/services/rewrite-service.ts`
- Create: `packages/mock-server/src/services/export-service.ts`
- Create: `packages/mock-server/src/generators/bedrock-generator.ts`
- Create: `packages/mock-server/src/generators/outline-generator.ts`
- Create: `packages/mock-server/src/generators/draft-generator.ts`
- Create: `packages/mock-server/src/generators/style-generator.ts`
- Create: `packages/mock-server/src/generators/rewrite-generator.ts`
- Create: `packages/mock-server/src/generators/export-generator.ts`
- Create: `packages/mock-server/src/routes/workflow-routes.ts`
- Modify: `packages/mock-server/src/app.ts`
- Create: `packages/mock-server/tests/workflow-routes.test.ts`
- Create: `fixtures/obsidian-vault/fiber-note.md`
- Create: `fixtures/obsidian-vault/history-post.md`

- [ ] **Step 1: Write failing workflow tests for Obsidian import and end-to-end generation**

```ts
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { buildApp } from '../src/app';

describe('workflow routes', () => {
  let dataDir: string;
  let vaultDir: string;

  beforeEach(() => {
    dataDir = mkdtempSync(join(tmpdir(), 'ptce-workflow-'));
    vaultDir = mkdtempSync(join(tmpdir(), 'ptce-vault-'));
    mkdirSync(join(vaultDir, 'notes'), { recursive: true });
    writeFileSync(
      join(vaultDir, 'notes', 'fiber.md'),
      `---
title: Fiber reading note
tags:
  - react
  - scheduler
---

React Fiber splits rendering work into units and schedules them by priority.
`,
    );
  });

  afterEach(() => {
    rmSync(dataDir, { recursive: true, force: true });
    rmSync(vaultDir, { recursive: true, force: true });
  });

  it('imports Obsidian notes and completes the staged workflow', async () => {
    const app = buildApp({ dataDir });

    const taskResponse = await app.inject({
      method: 'POST',
      url: '/tasks',
      payload: {
        title: 'React Fiber scheduling',
        articleType: 'source-analysis',
        reader: 'frontend engineers',
      },
    });

    const { task } = taskResponse.json();

    const importResponse = await app.inject({
      method: 'POST',
      url: `/tasks/${task.id}/materials/import-obsidian`,
      payload: {
        vaultPath: vaultDir,
        path: 'notes',
      },
    });

    expect(importResponse.statusCode).toBe(201);
    expect(importResponse.json().materials[0].source).toBe('obsidian');

    const bedrockResponse = await app.inject({
      method: 'POST',
      url: `/tasks/${task.id}/bedrock/generate`,
    });

    expect(bedrockResponse.statusCode).toBe(200);
    expect(bedrockResponse.json().bedrock.confirmed).toBe(false);
  });
});
```

- [ ] **Step 2: Run the mock-server tests to verify the workflow tests fail**

Run: `npm test --workspace @ptce/mock-server -- --run`
Expected: FAIL with missing workflow routes or missing `/materials/import-obsidian`.

- [ ] **Step 3: Implement repositories, generators, workflow services, and write-back**

```ts
import { randomUUID } from 'node:crypto';
import { readFileSync, readdirSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import matter from 'gray-matter';
import type { ImportObsidianRequest, AddMaterialRequest } from '@ptce/shared';
import { MaterialService } from './material-service.js';

export class ObsidianImportService {
  constructor(private readonly materials: MaterialService) {}

  import(taskId: string, input: ImportObsidianRequest) {
    const absolutePath = join(input.vaultPath, input.path);
    const files = this.collectMarkdownFiles(absolutePath);

    for (const filePath of files) {
      const parsed = matter(readFileSync(filePath, 'utf8'));
      const request: AddMaterialRequest = {
        type: this.inferType(filePath),
        title: typeof parsed.data.title === 'string' ? parsed.data.title : relative(input.vaultPath, filePath),
        source: 'obsidian',
        content: parsed.content.trim(),
        vaultPath: input.vaultPath,
        relativePath: relative(input.vaultPath, filePath),
        frontmatter: parsed.data,
        tags: Array.isArray(parsed.data.tags) ? parsed.data.tags.map(String) : [],
      };
      this.materials.addMaterial(taskId, request);
    }

    return this.materials.listMaterials(taskId);
  }

  private collectMarkdownFiles(pathName: string): string[] {
    if (statSync(pathName).isFile()) {
      return [pathName];
    }

    return readdirSync(pathName, { withFileTypes: true }).flatMap((entry) => {
      const child = join(pathName, entry.name);
      return entry.isDirectory() ? this.collectMarkdownFiles(child) : child.endsWith('.md') ? [child] : [];
    });
  }

  private inferType(filePath: string): AddMaterialRequest['type'] {
    if (filePath.includes('history') || filePath.includes('article')) return 'article';
    if (filePath.includes('draft')) return 'draft';
    return 'note';
  }
}
```

```ts
import { randomUUID } from 'node:crypto';
import type { InformationBedrock, Material } from '@ptce/shared';

export function generateBedrock(taskId: string, materials: Material[]): InformationBedrock {
  const first = materials[0];
  const articleLike = materials.filter((material) => material.type === 'article');

  return {
    id: randomUUID(),
    taskId,
    theme: first?.title ?? 'Untitled technical theme',
    coreQuestion: first?.content.split('.').at(0) ?? 'What should this article explain clearly?',
    arguments: [
      'Break the topic into the smallest useful mental model.',
      'Tie the explanation to concrete evidence from the materials.',
      'Leave uncertainty visible instead of filling it with generic prose.',
    ],
    evidence: materials.slice(0, 3).map((material) => `${material.type}:${material.title}`),
    uncertainties: articleLike.length === 0 ? ['No historical article was provided for style extraction yet.'] : [],
    confirmed: false,
  };
}
```

```ts
import { randomUUID } from 'node:crypto';
import type { ArticleOutline, InformationBedrock } from '@ptce/shared';

export function generateOutline(taskId: string, bedrock: InformationBedrock): ArticleOutline {
  return {
    id: randomUUID(),
    taskId,
    title: bedrock.theme,
    confirmed: false,
    sections: [
      {
        title: 'Why this mechanism matters',
        goal: 'Establish the problem the reader should care about.',
        evidenceRefs: bedrock.evidence.slice(0, 1),
      },
      {
        title: 'The smallest correct mental model',
        goal: 'Explain the core moving parts without tutorial filler.',
        evidenceRefs: bedrock.evidence.slice(0, 2),
      },
      {
        title: 'How the pieces interact under pressure',
        goal: 'Turn the main argument into a concrete execution story.',
        evidenceRefs: bedrock.evidence,
      },
      {
        title: 'What is still uncertain',
        goal: 'Call out open questions and boundaries explicitly.',
        evidenceRefs: bedrock.uncertainties,
      },
    ],
  };
}
```

```ts
import type { ArticleOutline, InformationBedrock } from '@ptce/shared';

export function generateDraftMarkdown(bedrock: InformationBedrock, outline: ArticleOutline): string {
  const sections = outline.sections
    .map(
      (section) => `## ${section.title}

${section.goal}

Evidence:
- ${section.evidenceRefs.join('\n- ') || 'Pending confirmation'}
`,
    )
    .join('\n');

  return `# ${outline.title}

> Core question: ${bedrock.coreQuestion}

## Core arguments
- ${bedrock.arguments.join('\n- ')}

${sections}
`;
}
```

```ts
import { randomUUID } from 'node:crypto';
import type { Material, StyleProfile } from '@ptce/shared';

export function generateStyleProfile(taskId: string, materials: Material[]): StyleProfile {
  const articleMaterials = materials.filter((material) => material.type === 'article');

  return {
    id: randomUUID(),
    taskId,
    sourceMaterialIds: articleMaterials.map((material) => material.id),
    openingTraits: articleMaterials.length > 0 ? ['Start from a concrete engineering tension.'] : ['Open with the main question directly.'],
    rhythmTraits: ['Prefer short declarative sentences around key claims.'],
    explanationTraits: ['Explain mechanisms before naming abstractions.'],
    forbiddenPatterns: ['Do not use tutorial filler such as "let us dive into".'],
    summary: articleMaterials.length > 0 ? 'Derived from historical article materials.' : 'Fallback profile because no historical article exists.',
  };
}
```

```ts
import type { ArticleVersion, StyleProfile } from '@ptce/shared';

export function rewriteMarkdown(version: ArticleVersion, style: StyleProfile, instruction: string): string {
  return `> Rewrite summary: ${instruction}
> Style summary: ${style.summary}

${version.content.replace('## Core arguments', '## What I think matters here')}
`;
}
```

```ts
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { ExportChannel } from '@ptce/shared';

export function renderExportMarkdown(input: {
  title: string;
  content: string;
  channel: ExportChannel;
}): string {
  const intro = input.channel === 'wechat' ? '> 这是一版适合公众号节奏的导出稿。\n\n' : '';
  return `${intro}${input.content}`;
}

export function writeArtifact(pathName: string, content: string): string {
  mkdirSync(dirname(pathName), { recursive: true });
  writeFileSync(pathName, content);
  return pathName;
}
```

- [ ] **Step 4: Register the workflow routes in the app**

```ts
import { registerWorkflowRoutes } from './routes/workflow-routes.js';

// after task and material routes
registerWorkflowRoutes(app, {
  taskRepository,
  materialRepository,
  dataDir,
});
```

- [ ] **Step 5: Run the mock-server tests to verify the full workflow passes**

Run: `npm test --workspace @ptce/mock-server -- --run`
Expected: PASS with task, material, and workflow tests green.

- [ ] **Step 6: Manually verify Obsidian write-back**

Run: `npm run dev --workspace @ptce/mock-server`
Expected: server starts on `127.0.0.1:4312`.

Run:

```bash
node --input-type=module -e "const base='http://127.0.0.1:4312'; const headers={'content-type':'application/json'}; const run=async()=>{const task=await fetch(base+'/tasks',{method:'POST',headers,body:JSON.stringify({title:'Fiber',articleType:'source-analysis',reader:'frontend engineers'})}).then(r=>r.json()); await fetch(base+'/tasks/'+task.task.id+'/materials',{method:'POST',headers,body:JSON.stringify({type:'article',title:'History post',source:'inline',content:'I usually start from the engineering tension first.'})}); await fetch(base+'/tasks/'+task.task.id+'/materials',{method:'POST',headers,body:JSON.stringify({type:'note',title:'Fiber note',source:'inline',content:'Fiber splits work by priority and keeps UI responsive.'})}); const bedrock=await fetch(base+'/tasks/'+task.task.id+'/bedrock/generate',{method:'POST',headers}).then(r=>r.json()); await fetch(base+'/tasks/'+task.task.id+'/bedrock/'+bedrock.bedrock.id+'/confirm',{method:'POST',headers}); const outline=await fetch(base+'/tasks/'+task.task.id+'/outlines/generate',{method:'POST',headers}).then(r=>r.json()); await fetch(base+'/tasks/'+task.task.id+'/outlines/'+outline.outline.id+'/confirm',{method:'POST',headers}); const draft=await fetch(base+'/tasks/'+task.task.id+'/drafts/generate',{method:'POST',headers}).then(r=>r.json()); const rewrite=await fetch(base+'/tasks/'+task.task.id+'/rewrites',{method:'POST',headers,body:JSON.stringify({versionId:draft.version.id,instruction:'更像我，减少教程腔'})}).then(r=>r.json()); const exported=await fetch(base+'/tasks/'+task.task.id+'/exports',{method:'POST',headers,body:JSON.stringify({versionId:rewrite.version.id,channel:'blog',format:'markdown',target:'obsidian',vaultPath:'./fixtures/obsidian-vault',outputPath:'content-engine/articles/fiber.md'})}).then(r=>r.json()); console.log(JSON.stringify(exported,null,2));}; run();"
```

Expected: JSON response with an `exportRecord.outputPath` and a Markdown file written into `fixtures/obsidian-vault/content-engine/articles/fiber.md`.

- [ ] **Step 7: Commit the workflow services**

```bash
git add packages/mock-server/src packages/mock-server/tests fixtures/obsidian-vault
git commit -m "feat: add ptce workflow generation and obsidian loop"
```

### Task 5: Build the CLI HTTP client, command surface, and output formatting

**Files:**
- Create: `packages/cli/src/client/api-client.ts`
- Create: `packages/cli/src/output/renderers.ts`
- Create: `packages/cli/src/commands/task.ts`
- Create: `packages/cli/src/commands/material.ts`
- Create: `packages/cli/src/commands/bedrock.ts`
- Create: `packages/cli/src/commands/outline.ts`
- Create: `packages/cli/src/commands/draft.ts`
- Create: `packages/cli/src/commands/rewrite.ts`
- Create: `packages/cli/src/commands/export.ts`
- Create: `packages/cli/src/index.ts`
- Create: `packages/cli/tests/cli.test.ts`

- [ ] **Step 1: Write a failing CLI test for task creation and export command wiring**

```ts
import { describe, expect, it, vi } from 'vitest';
import { buildProgram } from '../src/index';

describe('ptce cli', () => {
  it('registers task create and export run commands', () => {
    const program = buildProgram({
      request: vi.fn(),
    });

    const names = program.commands.map((command) => command.name());

    expect(names).toContain('task');
    expect(names).toContain('export');
  });
});
```

- [ ] **Step 2: Run the CLI tests to verify they fail**

Run: `npm test --workspace @ptce/cli -- --run`
Expected: FAIL with missing `buildProgram` or command modules.

- [ ] **Step 3: Implement the API client, renderers, and command registration**

```ts
export class ApiClient {
  constructor(private readonly baseUrl: string) {}

  async request(pathName: string, init?: RequestInit) {
    const response = await fetch(`${this.baseUrl}${pathName}`, {
      headers: {
        'content-type': 'application/json',
      },
      ...init,
    });

    const body = await response.json();

    if (!response.ok) {
      throw new Error(`${body.code}: ${body.message}`);
    }

    return body;
  }
}
```

```ts
export type OutputMode = 'json' | 'text' | 'markdown';

export function renderOutput(mode: OutputMode, payload: unknown): string {
  if (mode === 'json') {
    return JSON.stringify(payload, null, 2);
  }

  if (mode === 'markdown') {
    return '```json\n' + JSON.stringify(payload, null, 2) + '\n```';
  }

  return JSON.stringify(payload);
}
```

```ts
import { Command } from 'commander';
import { ApiClient } from './client/api-client.js';
import { renderOutput, type OutputMode } from './output/renderers.js';
import { registerTaskCommands } from './commands/task.js';
import { registerMaterialCommands } from './commands/material.js';
import { registerBedrockCommands } from './commands/bedrock.js';
import { registerOutlineCommands } from './commands/outline.js';
import { registerDraftCommands } from './commands/draft.js';
import { registerRewriteCommands } from './commands/rewrite.js';
import { registerExportCommands } from './commands/export.js';

export function buildProgram({
  baseUrl = 'http://127.0.0.1:4312',
}: {
  baseUrl?: string;
}) {
  const program = new Command();
  const client = new ApiClient(baseUrl);

  program.name('ptce').option('--output <mode>', 'json | text | markdown', 'json');

  const emit = (payload: unknown) => console.log(renderOutput(program.opts().output as OutputMode, payload));

  registerTaskCommands(program, client, emit);
  registerMaterialCommands(program, client, emit);
  registerBedrockCommands(program, client, emit);
  registerOutlineCommands(program, client, emit);
  registerDraftCommands(program, client, emit);
  registerRewriteCommands(program, client, emit);
  registerExportCommands(program, client, emit);

  return program;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await buildProgram().parseAsync(process.argv);
}
```

- [ ] **Step 4: Add the remaining workflow command modules**

```ts
import type { Command } from 'commander';
import { ApiClient } from '../client/api-client.js';

export function registerBedrockCommands(program: Command, client: ApiClient, emit: (payload: unknown) => void) {
  const bedrock = program.command('bedrock');

  bedrock
    .command('generate')
    .requiredOption('--task-id <taskId>')
    .action(async (options) => {
      emit(
        await client.request(`/tasks/${options.taskId}/bedrock/generate`, {
          method: 'POST',
        }),
      );
    });

  bedrock
    .command('confirm')
    .requiredOption('--task-id <taskId>')
    .requiredOption('--bedrock-id <bedrockId>')
    .action(async (options) => {
      emit(
        await client.request(`/tasks/${options.taskId}/bedrock/${options.bedrockId}/confirm`, {
          method: 'POST',
        }),
      );
    });
}
```

```ts
import type { Command } from 'commander';
import { ApiClient } from '../client/api-client.js';

export function registerOutlineCommands(program: Command, client: ApiClient, emit: (payload: unknown) => void) {
  const outline = program.command('outline');

  outline
    .command('generate')
    .requiredOption('--task-id <taskId>')
    .action(async (options) => {
      emit(
        await client.request(`/tasks/${options.taskId}/outlines/generate`, {
          method: 'POST',
        }),
      );
    });

  outline
    .command('confirm')
    .requiredOption('--task-id <taskId>')
    .requiredOption('--outline-id <outlineId>')
    .action(async (options) => {
      emit(
        await client.request(`/tasks/${options.taskId}/outlines/${options.outlineId}/confirm`, {
          method: 'POST',
        }),
      );
    });
}
```

```ts
import type { Command } from 'commander';
import { ApiClient } from '../client/api-client.js';

export function registerDraftCommands(program: Command, client: ApiClient, emit: (payload: unknown) => void) {
  program
    .command('draft')
    .command('generate')
    .requiredOption('--task-id <taskId>')
    .action(async (options) => {
      emit(
        await client.request(`/tasks/${options.taskId}/drafts/generate`, {
          method: 'POST',
        }),
      );
    });
}
```

```ts
import type { Command } from 'commander';
import { ApiClient } from '../client/api-client.js';

export function registerRewriteCommands(program: Command, client: ApiClient, emit: (payload: unknown) => void) {
  program
    .command('rewrite')
    .command('run')
    .requiredOption('--task-id <taskId>')
    .requiredOption('--version-id <versionId>')
    .requiredOption('--instruction <instruction>')
    .action(async (options) => {
      emit(
        await client.request(`/tasks/${options.taskId}/rewrites`, {
          method: 'POST',
          body: JSON.stringify({
            versionId: options.versionId,
            instruction: options.instruction,
          }),
        }),
      );
    });
}
```

- [ ] **Step 5: Run the CLI tests to verify they pass**

Run: `npm test --workspace @ptce/cli -- --run`
Expected: PASS with command registration tests green.

- [ ] **Step 6: Manually verify the CLI against the running mock server**

Run: `node packages/cli/dist/index.js task create --title "React Fiber scheduling" --article-type "source-analysis" --reader "frontend engineers"`
Expected: JSON response with the created task.

Run:

```bash
node --input-type=module -e "const base='http://127.0.0.1:4312'; const task=await fetch(base+'/tasks',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({title:'React Fiber scheduling',articleType:'source-analysis',reader:'frontend engineers'})}).then(r=>r.json()); console.log(task.task.id);"
```

Expected: prints a concrete task id such as `8f5e9ab0-9f0d-4b9a-a1e0-d0dfd6d2b693`.

Run: `node packages/cli/dist/index.js material import-obsidian --task-id 8f5e9ab0-9f0d-4b9a-a1e0-d0dfd6d2b693 --vault-path ./fixtures/obsidian-vault --path .`
Expected: JSON response listing imported materials with `source: "obsidian"`.

- [ ] **Step 7: Commit the CLI**

```bash
git add packages/cli/src packages/cli/tests
git commit -m "feat: add ptce cli command surface"
```

### Task 6: Add end-to-end smoke coverage and final verification scripts

**Files:**
- Create: `tests/e2e/package.json`
- Create: `tests/e2e/tsconfig.json`
- Create: `tests/e2e/cli-workflow.test.ts`
- Modify: `package.json`

- [ ] **Step 1: Write the failing end-to-end smoke test**

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { buildApp } from '../../packages/mock-server/src/app';
import { ApiClient } from '../../packages/cli/src/client/api-client';

describe('cli workflow smoke test', () => {
  let dataDir: string;
  let vaultDir: string;

  beforeEach(() => {
    dataDir = mkdtempSync(join(tmpdir(), 'ptce-e2e-data-'));
    vaultDir = mkdtempSync(join(tmpdir(), 'ptce-e2e-vault-'));
    mkdirSync(join(vaultDir, 'notes'), { recursive: true });
    writeFileSync(join(vaultDir, 'notes', 'note.md'), '# Note\n\nFiber scheduling notes.');
  });

  it('walks the full workflow and exports to obsidian', async () => {
    const app = buildApp({ dataDir });
    await app.listen({ host: '127.0.0.1', port: 0 });
    const address = app.server.address();
    if (!address || typeof address === 'string') throw new Error('server address unavailable');

    const client = new ApiClient(`http://127.0.0.1:${address.port}`);

    const task = await client.request('/tasks', {
      method: 'POST',
      body: JSON.stringify({
        title: 'React Fiber scheduling',
        articleType: 'source-analysis',
        reader: 'frontend engineers',
      }),
    });

    expect(task.task.stage).toBe('created');
  });
});
```

- [ ] **Step 2: Run the full test suite to verify the smoke test fails**

Run: `npm test -- --run`
Expected: FAIL in `tests/e2e/cli-workflow.test.ts` until the shared imports and remaining workflow calls are completed.

- [ ] **Step 3: Flesh out the smoke test to cover the full staged flow**

```ts
const importResponse = await client.request(`/tasks/${task.task.id}/materials/import-obsidian`, {
  method: 'POST',
  body: JSON.stringify({
    vaultPath: vaultDir,
    path: 'notes',
  }),
});

const bedrock = await client.request(`/tasks/${task.task.id}/bedrock/generate`, {
  method: 'POST',
});

await client.request(`/tasks/${task.task.id}/bedrock/${bedrock.bedrock.id}/confirm`, {
  method: 'POST',
});

const outline = await client.request(`/tasks/${task.task.id}/outlines/generate`, {
  method: 'POST',
});

await client.request(`/tasks/${task.task.id}/outlines/${outline.outline.id}/confirm`, {
  method: 'POST',
});

const draft = await client.request(`/tasks/${task.task.id}/drafts/generate`, {
  method: 'POST',
});

const rewrite = await client.request(`/tasks/${task.task.id}/rewrites`, {
  method: 'POST',
  body: JSON.stringify({
    versionId: draft.version.id,
    instruction: '更像我，减少教程腔',
  }),
});

const exported = await client.request(`/tasks/${task.task.id}/exports`, {
  method: 'POST',
  body: JSON.stringify({
    versionId: rewrite.version.id,
    channel: 'blog',
    format: 'markdown',
    target: 'obsidian',
    vaultPath: vaultDir,
    outputPath: 'content-engine/articles/fiber.md',
  }),
});

expect(importResponse.task.stage).toBe('collecting_materials');
expect(bedrock.task.stage).toBe('bedrock_review');
expect(outline.task.stage).toBe('outline_review');
expect(draft.task.stage).toBe('draft_ready');
expect(rewrite.task.stage).toBe('rewriting');
expect(exported.task.stage).toBe('exported');
```

- [ ] **Step 4: Add the e2e package metadata**

```json
{
  "name": "@ptce/e2e",
  "private": true,
  "type": "module"
}
```

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": ".",
    "outDir": "dist"
  },
  "include": [
    "*.ts"
  ]
}
```

- [ ] **Step 5: Add a root verification script**

```json
{
  "scripts": {
    "build": "npm run build --workspaces",
    "test": "vitest --run",
    "verify": "npm run build && npm test -- --run"
  }
}
```

- [ ] **Step 6: Run final verification**

Run: `npm run verify`
Expected: all workspace builds succeed and all unit plus smoke tests pass.

- [ ] **Step 7: Commit the smoke coverage**

```bash
git add package.json tests/e2e
git commit -m "test: add end-to-end workflow verification"
```

## Spec Coverage Check

- CLI, mock server, shared contracts, file-backed persistence, and stage-gated workflow are covered by Tasks 1 through 5.
- Obsidian import and selective write-back are covered by Task 4.
- End-to-end validation of the exact MVP chain is covered by Task 6.
- No spec requirement is intentionally deferred inside this plan.

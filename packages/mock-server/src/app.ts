import Fastify, { type FastifyInstance } from 'fastify';
import { join } from 'node:path';

import { FileStore } from './repository/file-store.js';
import { BedrockRepository } from './repository/bedrock-repository.js';
import { ExportRepository } from './repository/export-repository.js';
import { MaterialRepository } from './repository/material-repository.js';
import { OutlineRepository } from './repository/outline-repository.js';
import { StyleProfileRepository } from './repository/style-profile-repository.js';
import { TaskRepository } from './repository/task-repository.js';
import { VersionRepository } from './repository/version-repository.js';
import { registerMaterialRoutes } from './routes/material-routes.js';
import { registerTaskRoutes } from './routes/task-routes.js';
import { registerWorkflowRoutes } from './routes/workflow-routes.js';
import { BedrockService } from './services/bedrock-service.js';
import { DraftService } from './services/draft-service.js';
import { ExportService } from './services/export-service.js';
import { MaterialService } from './services/material-service.js';
import { ObsidianImportService } from './services/obsidian-import-service.js';
import { OutlineService } from './services/outline-service.js';
import { RewriteService } from './services/rewrite-service.js';
import { TaskService } from './services/task-service.js';
import { AppError } from './workflow/stage-guards.js';

export interface BuildAppOptions {
  dataDir: string;
}

export const buildApp = ({ dataDir }: BuildAppOptions): FastifyInstance => {
  const app = Fastify();

  const taskRepository = new TaskRepository(
    new FileStore({
      dataDir,
      fileName: 'tasks.json',
    }),
  );
  const materialRepository = new MaterialRepository(
    new FileStore({
      dataDir,
      fileName: 'materials.json',
    }),
  );
  const bedrockRepository = new BedrockRepository(
    new FileStore({
      dataDir,
      fileName: 'bedrocks.json',
    }),
  );
  const outlineRepository = new OutlineRepository(
    new FileStore({
      dataDir,
      fileName: 'outlines.json',
    }),
  );
  const versionRepository = new VersionRepository(
    new FileStore({
      dataDir,
      fileName: 'versions.json',
    }),
  );
  const styleProfileRepository = new StyleProfileRepository(
    new FileStore({
      dataDir,
      fileName: 'style-profiles.json',
    }),
  );
  const exportRepository = new ExportRepository(
    new FileStore({
      dataDir,
      fileName: 'exports.json',
    }),
  );

  const taskService = new TaskService(taskRepository);
  const materialService = new MaterialService(taskRepository, materialRepository);
  const obsidianImportService = new ObsidianImportService(materialService);
  const bedrockService = new BedrockService(
    taskRepository,
    materialRepository,
    bedrockRepository,
  );
  const outlineService = new OutlineService(
    taskRepository,
    outlineRepository,
    bedrockService,
  );
  const draftService = new DraftService(
    taskRepository,
    materialRepository,
    styleProfileRepository,
    versionRepository,
    bedrockService,
    outlineService,
  );
  const rewriteService = new RewriteService(
    taskRepository,
    materialRepository,
    versionRepository,
    draftService,
  );
  const exportService = new ExportService(
    taskRepository,
    versionRepository,
    exportRepository,
    join(dataDir, 'artifacts'),
  );

  registerTaskRoutes(app, { taskService });
  registerMaterialRoutes(app, { materialService });
  registerWorkflowRoutes(app, {
    obsidianImportService,
    bedrockService,
    outlineService,
    draftService,
    rewriteService,
    exportService,
  });

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        code: error.code,
        message: error.message,
        details: error.details,
      });
    }

    return reply.status(500).send({
      message: 'Internal server error',
    });
  });

  return app;
};

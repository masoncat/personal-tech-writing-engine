import Fastify, { type FastifyInstance } from 'fastify';

import { FileStore } from './repository/file-store.js';
import { MaterialRepository } from './repository/material-repository.js';
import { TaskRepository } from './repository/task-repository.js';
import { registerMaterialRoutes } from './routes/material-routes.js';
import { registerTaskRoutes } from './routes/task-routes.js';
import { MaterialService } from './services/material-service.js';
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

  const taskService = new TaskService(taskRepository);
  const materialService = new MaterialService(taskRepository, materialRepository);

  registerTaskRoutes(app, { taskService });
  registerMaterialRoutes(app, { materialService });

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

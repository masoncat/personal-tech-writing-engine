import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { ErrorCode, type CreateTaskRequest, type TaskEnvelope } from '@ptce/shared';

import type { TaskService } from '../services/task-service.js';
import { AppError } from '../workflow/stage-guards.js';

const createTaskSchema = z.object({
  title: z.string().trim().min(1),
  articleType: z.string().trim().min(1),
  preferredChannel: z.enum(['blog', 'wechat']).default('blog'),
  reader: z.string().trim().min(1),
});

const taskParamsSchema = z.object({
  taskId: z.string().trim().min(1),
});

export interface TaskRoutesOptions {
  taskService: TaskService;
}

export const registerTaskRoutes = (
  app: FastifyInstance,
  { taskService }: TaskRoutesOptions,
) => {
  app.post('/tasks', async (request, reply) => {
    const input = parseWithZod<CreateTaskRequest>(createTaskSchema, request.body);
    const task = await taskService.createTask(input);
    const response: TaskEnvelope = { task };

    return reply.status(201).send(response);
  });

  app.get('/tasks/:taskId', async (request) => {
    const { taskId } = parseWithZod(taskParamsSchema, request.params);
    const task = await taskService.getTask(taskId);
    const response: TaskEnvelope = { task };

    return response;
  });
};

const parseWithZod = <T>(schema: z.ZodType<T>, input: unknown): T => {
  const parsed = schema.safeParse(input);

  if (!parsed.success) {
    throw new AppError(
      ErrorCode.InvalidArgument,
      'Invalid request',
      { issues: parsed.error.issues },
      400,
    );
  }

  return parsed.data;
};

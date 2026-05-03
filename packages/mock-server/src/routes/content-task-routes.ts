import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import {
  ErrorCode,
  type ContentTaskEnvelope,
  type ContentArtifactsResponse,
  type ContentRunResponse,
  type AddContentArtifactRequest,
  type CreateContentTaskRequest,
  type RunContentTaskRequest,
} from '@ptce/shared';

import type { ContentTaskService } from '../services/content-task-service.js';
import { AppError } from '../workflow/stage-guards.js';

const createContentTaskSchema = z.object({
  title: z.string().trim().min(1),
  contentType: z.enum(['general', 'public_article', 'prd', 'technical_doc']),
  contentSubtype: z.string().trim().min(1),
  audience: z.string().trim().min(1),
  purpose: z.string().trim().min(1).optional(),
  preferredChannel: z.enum(['blog', 'wechat']).optional(),
  sourceMaterialRefs: z.array(z.string().trim().min(1)).optional(),
});

const runContentTaskSchema = z.object({
  actionId: z.string().trim().min(1).optional(),
  untilActionId: z.string().trim().min(1).optional(),
  dryRun: z.boolean().optional(),
});

const addContentArtifactSchema = z.object({
  artifactType: z.string().trim().min(1),
  title: z.string().trim().min(1),
  content: z.string(),
  format: z.enum(['markdown', 'json', 'text']),
  createdBy: z.enum(['agent', 'model', 'user', 'system']),
});

const contentTaskParamsSchema = z.object({
  taskId: z.string().trim().min(1),
});

export interface ContentTaskRoutesOptions {
  contentTaskService: ContentTaskService;
}

export const registerContentTaskRoutes = (
  app: FastifyInstance,
  { contentTaskService }: ContentTaskRoutesOptions,
) => {
  app.post('/content-tasks', async (request, reply) => {
    const parsed = parseWithZod(createContentTaskSchema, request.body);
    const input: CreateContentTaskRequest = {
      ...parsed,
      contentSubtype: parsed.contentSubtype as CreateContentTaskRequest['contentSubtype'],
    };
    const response: ContentTaskEnvelope = await contentTaskService.create(input);

    return reply.status(201).send(response);
  });

  app.get('/content-tasks/:taskId', async (request) => {
    const { taskId } = parseWithZod(contentTaskParamsSchema, request.params);
    const response: ContentTaskEnvelope = await contentTaskService.get(taskId);

    return response;
  });

  app.post('/content-tasks/:taskId/runs', async (request, reply) => {
    const { taskId } = parseWithZod(contentTaskParamsSchema, request.params);
    parseWithZod<RunContentTaskRequest>(runContentTaskSchema, request.body ?? {});
    const response: ContentRunResponse = await contentTaskService.run(taskId);

    return reply.status(201).send(response);
  });

  app.post('/content-tasks/:taskId/artifacts', async (request, reply) => {
    const { taskId } = parseWithZod(contentTaskParamsSchema, request.params);
    const input = parseWithZod<AddContentArtifactRequest>(addContentArtifactSchema, request.body);
    const response: ContentArtifactsResponse = await contentTaskService.addArtifact(taskId, input);

    return reply.status(201).send(response);
  });

  app.get('/content-tasks/:taskId/artifacts', async (request) => {
    const { taskId } = parseWithZod(contentTaskParamsSchema, request.params);
    const response: ContentArtifactsResponse = await contentTaskService.listArtifacts(taskId);

    return response;
  });

  app.post('/content-tasks/:taskId/complete', async (request) => {
    const { taskId } = parseWithZod(contentTaskParamsSchema, request.params);
    const response: ContentTaskEnvelope = await contentTaskService.complete(taskId);

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

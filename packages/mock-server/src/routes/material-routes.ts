import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import {
  ErrorCode,
  type AddMaterialRequest,
  type MaterialListResponse,
} from '@ptce/shared';

import type { MaterialService } from '../services/material-service.js';
import { AppError } from '../workflow/stage-guards.js';

const materialBaseSchema = {
  type: z.enum(['prompt', 'note', 'repo', 'article', 'draft', 'reference']),
  title: z.string().trim().min(1),
  content: z.string().trim().min(1),
  frontmatter: z.record(z.string(), z.unknown()).optional(),
  tags: z.array(z.string()).optional(),
};

const addMaterialSchema = z.discriminatedUnion('source', [
  z.object({
    ...materialBaseSchema,
    source: z.literal('inline'),
    vaultPath: z.never().optional(),
    relativePath: z.never().optional(),
  }),
  z.object({
    ...materialBaseSchema,
    source: z.literal('file'),
    relativePath: z.string().trim().min(1),
    vaultPath: z.never().optional(),
  }),
  z.object({
    ...materialBaseSchema,
    source: z.literal('obsidian'),
    vaultPath: z.string().trim().min(1),
    relativePath: z.string().trim().min(1),
  }),
]);

const taskParamsSchema = z.object({
  taskId: z.string().trim().min(1),
});

export interface MaterialRoutesOptions {
  materialService: MaterialService;
}

export const registerMaterialRoutes = (
  app: FastifyInstance,
  { materialService }: MaterialRoutesOptions,
) => {
  app.post('/tasks/:taskId/materials', async (request, reply) => {
    const { taskId } = parseWithZod(taskParamsSchema, request.params);
    const input = parseWithZod<AddMaterialRequest>(addMaterialSchema, request.body);
    const result = await materialService.addMaterial(taskId, input);
    const response: MaterialListResponse = {
      task: result.task,
      materials: result.materials,
    };

    return reply.status(201).send(response);
  });

  app.get('/tasks/:taskId/materials', async (request) => {
    const { taskId } = parseWithZod(taskParamsSchema, request.params);
    const result = await materialService.listMaterials(taskId);
    const response: MaterialListResponse = {
      task: result.task,
      materials: result.materials,
    };

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

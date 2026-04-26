import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import {
  ErrorCode,
  type BedrockResponse,
  type ExportResponse,
  type GenerateExportRequest,
  type GenerateRewriteRequest,
  type ImportObsidianRequest,
  type MaterialListResponse,
  type OutlineResponse,
  type VersionResponse,
  type VersionsResponse,
} from '@ptce/shared';

import type { BedrockService } from '../services/bedrock-service.js';
import type { DraftService } from '../services/draft-service.js';
import type { ExportService } from '../services/export-service.js';
import type { ObsidianImportService } from '../services/obsidian-import-service.js';
import type { OutlineService } from '../services/outline-service.js';
import type { RewriteService } from '../services/rewrite-service.js';
import { AppError } from '../workflow/stage-guards.js';

const taskParamsSchema = z.object({
  taskId: z.string().trim().min(1),
});

const bedrockConfirmParamsSchema = taskParamsSchema.extend({
  bedrockId: z.string().trim().min(1),
});

const outlineConfirmParamsSchema = taskParamsSchema.extend({
  outlineId: z.string().trim().min(1),
});

const importObsidianSchema = z.object({
  vaultPath: z.string().trim().min(1),
  path: z.string().trim().min(1),
});

const rewriteSchema = z.object({
  versionId: z.string().trim().min(1),
  instruction: z.string().trim().min(1),
});

const exportSchema = z.union([
  z.object({
    versionId: z.string().trim().min(1),
    channel: z.enum(['blog', 'wechat']),
    format: z.literal('markdown'),
    target: z.literal('obsidian'),
    vaultPath: z.string().trim().min(1),
    outputPath: z.string().trim().min(1),
  }),
  z.object({
    versionId: z.string().trim().min(1),
    channel: z.enum(['blog', 'wechat']),
    format: z.literal('markdown'),
    target: z.literal('local').optional(),
    outputPath: z.string().trim().min(1).optional(),
    vaultPath: z.never().optional(),
  }),
]);

export interface WorkflowRoutesOptions {
  obsidianImportService: ObsidianImportService;
  bedrockService: BedrockService;
  outlineService: OutlineService;
  draftService: DraftService;
  rewriteService: RewriteService;
  exportService: ExportService;
}

export const registerWorkflowRoutes = (
  app: FastifyInstance,
  {
    obsidianImportService,
    bedrockService,
    outlineService,
    draftService,
    rewriteService,
    exportService,
  }: WorkflowRoutesOptions,
) => {
  app.post('/tasks/:taskId/materials/import-obsidian', async (request, reply) => {
    const { taskId } = parseWithZod(taskParamsSchema, request.params);
    const input = parseWithZod<ImportObsidianRequest>(importObsidianSchema, request.body);
    const result = await obsidianImportService.import(taskId, input);
    const response: MaterialListResponse = {
      task: result.task,
      materials: result.materials,
    };

    return reply.status(201).send(response);
  });

  app.post('/tasks/:taskId/bedrock/generate', async (request, reply) => {
    const { taskId } = parseWithZod(taskParamsSchema, request.params);
    const result = await bedrockService.generate(taskId);
    const response: BedrockResponse = result;

    return reply.status(201).send(response);
  });

  app.post('/tasks/:taskId/bedrock/:bedrockId/confirm', async (request) => {
    const { taskId, bedrockId } = parseWithZod(bedrockConfirmParamsSchema, request.params);
    const result = await bedrockService.confirm(taskId, bedrockId);
    const response: BedrockResponse = result;

    return response;
  });

  app.get('/tasks/:taskId/bedrock/latest', async (request) => {
    const { taskId } = parseWithZod(taskParamsSchema, request.params);
    const result = await bedrockService.getLatest(taskId);
    const response: BedrockResponse = result;

    return response;
  });

  app.post('/tasks/:taskId/outlines/generate', async (request, reply) => {
    const { taskId } = parseWithZod(taskParamsSchema, request.params);
    const result = await outlineService.generate(taskId);
    const response: OutlineResponse = result;

    return reply.status(201).send(response);
  });

  app.post('/tasks/:taskId/outlines/:outlineId/confirm', async (request) => {
    const { taskId, outlineId } = parseWithZod(outlineConfirmParamsSchema, request.params);
    const result = await outlineService.confirm(taskId, outlineId);
    const response: OutlineResponse = result;

    return response;
  });

  app.get('/tasks/:taskId/outlines/latest', async (request) => {
    const { taskId } = parseWithZod(taskParamsSchema, request.params);
    const result = await outlineService.getLatest(taskId);
    const response: OutlineResponse = result;

    return response;
  });

  app.post('/tasks/:taskId/drafts/generate', async (request, reply) => {
    const { taskId } = parseWithZod(taskParamsSchema, request.params);
    const result = await draftService.generate(taskId);
    const response: VersionResponse = result;

    return reply.status(201).send(response);
  });

  app.get('/tasks/:taskId/versions', async (request) => {
    const { taskId } = parseWithZod(taskParamsSchema, request.params);
    const result = await draftService.listVersions(taskId);
    const response: VersionsResponse = result;

    return response;
  });

  app.post('/tasks/:taskId/rewrites', async (request, reply) => {
    const { taskId } = parseWithZod(taskParamsSchema, request.params);
    const input = parseWithZod<GenerateRewriteRequest>(rewriteSchema, request.body);
    const result = await rewriteService.rewrite(taskId, input);
    const response: VersionResponse = result;

    return reply.status(201).send(response);
  });

  app.post('/tasks/:taskId/exports', async (request, reply) => {
    const { taskId } = parseWithZod(taskParamsSchema, request.params);
    const input = parseWithZod<GenerateExportRequest>(exportSchema, request.body);
    const result = await exportService.run(taskId, input);
    const response: ExportResponse = result;

    return reply.status(201).send(response);
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

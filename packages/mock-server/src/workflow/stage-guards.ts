import type { AppErrorShape, WritingTask } from '@ptce/shared';
import { ErrorCode } from '@ptce/shared';

export class AppError extends Error implements AppErrorShape {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>,
    public readonly statusCode = 400,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const ensureTaskExists = (
  task: WritingTask | undefined,
  taskId: string,
): WritingTask => {
  if (!task) {
    throw new AppError(ErrorCode.TaskNotFound, 'Task not found', { taskId }, 404);
  }

  return task;
};

export const touchStage = <T extends WritingTask>(task: T, stage: T['stage']): T => ({
  ...task,
  stage,
  updatedAt: nextTimestamp(task.updatedAt),
});

const nextTimestamp = (currentUpdatedAt: string): string => {
  const now = Date.now();
  const current = Date.parse(currentUpdatedAt);

  return new Date(Number.isNaN(current) || now > current ? now : current + 1).toISOString();
};

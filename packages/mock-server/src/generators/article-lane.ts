import type { ExportChannel, WritingTask } from '@ptce/shared';

export const isBuildRetrospectiveTask = (task: WritingTask): boolean =>
  task.articleType === 'build-retrospective';

export const isBuildRetrospectiveBlogLane = (
  task: WritingTask,
  channel: ExportChannel,
): boolean => isBuildRetrospectiveTask(task) && channel === task.preferredChannel && channel === 'blog';

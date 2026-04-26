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

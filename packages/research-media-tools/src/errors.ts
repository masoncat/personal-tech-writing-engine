export type ResearchMediaErrorCode =
  | 'missing_provider_config'
  | 'provider_request_failed'
  | 'provider_response_invalid'
  | 'media_fit_rejected';

export class ResearchMediaError extends Error {
  readonly code: ResearchMediaErrorCode;
  readonly details: Record<string, unknown>;

  constructor(
    code: ResearchMediaErrorCode,
    message: string,
    details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = 'ResearchMediaError';
    this.code = code;
    this.details = details;
  }
}

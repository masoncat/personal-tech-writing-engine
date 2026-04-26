export const DEFAULT_BASE_URL = 'http://127.0.0.1:4312';

export interface ApiRequestOptions {
  method: 'GET' | 'POST';
  path: string;
  body?: unknown;
}

export interface ApiClientLike {
  request<T>(options: ApiRequestOptions): Promise<T>;
}

export interface CreateApiClientOptions {
  baseUrl?: string;
  fetchFn?: typeof fetch;
}

interface ErrorBody {
  code?: string;
  message?: string;
  details?: Record<string, unknown>;
}

export class ApiClientError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.body = body;
  }
}

export class ApiClient implements ApiClientLike {
  readonly #baseUrl: string;
  readonly #fetchFn: typeof fetch;

  constructor({ baseUrl = DEFAULT_BASE_URL, fetchFn = fetch }: CreateApiClientOptions = {}) {
    this.#baseUrl = baseUrl;
    this.#fetchFn = fetchFn;
  }

  async request<T>({ method, path, body }: ApiRequestOptions): Promise<T> {
    const response = await this.#fetchFn(new URL(path, this.#baseUrl), {
      method,
      headers: {
        'content-type': 'application/json',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const payload = await parseResponseBody(response);

    if (!response.ok) {
      const message =
        typeof payload === 'object' && payload !== null && 'message' in payload
          ? String(payload.message)
          : `Request failed with status ${response.status}`;

      throw new ApiClientError(message, response.status, payload);
    }

    return payload as T;
  }
}

export const createApiClient = (options: CreateApiClientOptions = {}): ApiClientLike =>
  new ApiClient(options);

const parseResponseBody = async (response: Response): Promise<unknown> => {
  const contentType = response.headers.get('content-type');

  if (contentType?.includes('application/json')) {
    return response.json();
  }

  const text = await response.text();
  return text.length > 0 ? text : undefined;
};

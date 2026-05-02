import { describe, expect, it, vi } from 'vitest';

import { ApiClient } from '../src/client/api-client.js';

describe('ApiClient', () => {
  it('omits the JSON content-type header for POST requests without a body', async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: {
          'content-type': 'application/json',
        },
      }),
    );

    const client = new ApiClient({
      baseUrl: 'http://127.0.0.1:4312',
      fetchFn,
    });

    await client.request({
      method: 'POST',
      path: '/tasks/task-1/bedrock/generate',
    });

    expect(fetchFn).toHaveBeenCalledWith(
      new URL('http://127.0.0.1:4312/tasks/task-1/bedrock/generate'),
      {
        method: 'POST',
        headers: undefined,
        body: undefined,
      },
    );
  });
});

import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

import { ResearchMediaError } from '../errors.js';
import type { ImageGenerationRequest, MediaAsset } from '../types.js';

interface OpenAIImageProviderOptions {
  apiKey: string;
  fetchFn?: typeof fetch;
  writeFile?: (path: string, data: Uint8Array) => Promise<void>;
}

interface OpenAIImageResponse {
  data?: Array<{ b64_json?: string }>;
}

export const createOpenAIImageProvider = ({
  apiKey,
  fetchFn = fetch,
  writeFile = defaultWriteFile,
}: OpenAIImageProviderOptions) => ({
  async generateImage(request: ImageGenerationRequest): Promise<MediaAsset> {
    if (!apiKey) {
      throw new ResearchMediaError('missing_provider_config', 'OPENAI_API_KEY is required.');
    }

    const model = request.model ?? 'gpt-image-2';
    const response = await fetchFn('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        prompt: request.prompt,
        size: request.size ?? '1024x1024',
        response_format: 'b64_json',
      }),
    });

    if (!response.ok) {
      throw new ResearchMediaError('provider_request_failed', 'OpenAI image generation request failed.', { status: response.status });
    }

    const payload = await response.json() as OpenAIImageResponse;
    const base64 = payload.data?.[0]?.b64_json;
    if (!base64) {
      throw new ResearchMediaError('provider_response_invalid', 'OpenAI image response did not include b64_json.');
    }

    const directory = request.outputDirectory ?? 'artifacts/images';
    await mkdir(directory, { recursive: true });
    const localPath = join(directory, `${randomUUID()}.png`);
    await writeFile(localPath, Buffer.from(base64, 'base64'));

    return {
      id: `openai-image-${randomUUID()}`,
      kind: 'generated_image',
      localPath,
      provider: 'openai',
      generated: true,
      model,
      prompt: request.prompt,
    };
  },
});

const defaultWriteFile = async (path: string, data: Uint8Array): Promise<void> => {
  const fs = await import('node:fs/promises');
  await fs.writeFile(path, data);
};

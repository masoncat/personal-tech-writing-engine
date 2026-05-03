import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

import { ResearchMediaError } from '../errors.js';
import type { ImageGenerationRequest, MediaAsset } from '../types.js';

type ImageApiStyle = 'openai-images' | 'gemini-generate-content';

interface OpenAIImageProviderOptions {
  apiKey: string;
  baseUrl?: string;
  defaultModel?: string;
  apiStyle?: ImageApiStyle;
  endpointPath?: string;
  fetchFn?: typeof fetch;
  writeFile?: (path: string, data: Uint8Array) => Promise<void>;
}

interface OpenAIImageResponse {
  data?: Array<{ b64_json?: string }>;
}

interface GeminiGenerateContentResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        inlineData?: {
          mimeType?: string;
          data?: string;
        };
      }>;
    };
  }>;
}

export const createOpenAIImageProvider = ({
  apiKey,
  baseUrl = 'https://api.openai.com/v1',
  defaultModel = 'gpt-image-2',
  apiStyle = 'openai-images',
  endpointPath,
  fetchFn = fetch,
  writeFile = defaultWriteFile,
}: OpenAIImageProviderOptions) => ({
  async generateImage(request: ImageGenerationRequest): Promise<MediaAsset> {
    if (!apiKey) {
      throw new ResearchMediaError('missing_provider_config', 'OPENAI_API_KEY is required.');
    }

    const model = request.model ?? defaultModel;
    if (apiStyle === 'gemini-generate-content') {
      return generateGeminiContentImage({
        apiKey,
        baseUrl,
        endpointPath,
        model,
        request,
        fetchFn,
        writeFile,
      });
    }

    const response = await fetchFn(new URL(endpointPath ?? 'images/generations', normalizeBaseUrl(baseUrl)).href, {
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

const generateGeminiContentImage = async ({
  apiKey,
  baseUrl,
  endpointPath,
  model,
  request,
  fetchFn,
  writeFile,
}: {
  apiKey: string;
  baseUrl: string;
  endpointPath?: string;
  model: string;
  request: ImageGenerationRequest;
  fetchFn: typeof fetch;
  writeFile: (path: string, data: Uint8Array) => Promise<void>;
}): Promise<MediaAsset> => {
  const endpoint = endpointPath ?? `/v1beta/models/${model}:generateContent`;
  const response = await fetchFn(new URL(endpoint, baseOrigin(baseUrl)).href, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: request.prompt,
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new ResearchMediaError('provider_request_failed', 'Gemini image generation request failed.', { status: response.status });
  }

  const payload = await response.json() as GeminiGenerateContentResponse;
  const inlineData = payload.candidates?.flatMap((candidate) => candidate.content?.parts ?? [])
    .find((part) => part.inlineData?.data)?.inlineData;
  if (!inlineData?.data) {
    throw new ResearchMediaError('provider_response_invalid', 'Gemini image response did not include inlineData.');
  }

  const directory = request.outputDirectory ?? 'artifacts/images';
  await mkdir(directory, { recursive: true });
  const localPath = join(directory, `${randomUUID()}${extensionForMimeType(inlineData.mimeType)}`);
  await writeFile(localPath, Buffer.from(inlineData.data, 'base64'));

  return {
    id: `openai-image-${randomUUID()}`,
    kind: 'generated_image',
    localPath,
    provider: 'openai',
    generated: true,
    model,
    prompt: request.prompt,
  };
};

const normalizeBaseUrl = (baseUrl: string): string =>
  baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;

const baseOrigin = (baseUrl: string): string =>
  new URL(baseUrl).origin;

const extensionForMimeType = (mimeType: string | undefined): string => {
  if (mimeType === 'image/jpeg') {
    return '.jpg';
  }
  if (mimeType === 'image/webp') {
    return '.webp';
  }
  return '.png';
};

const defaultWriteFile = async (path: string, data: Uint8Array): Promise<void> => {
  const fs = await import('node:fs/promises');
  await fs.writeFile(path, data);
};

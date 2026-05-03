import { ResearchMediaError } from '../errors.js';
import type { ExtractedPageImage, PageExtractionRequest, PageExtractionResult } from '../types.js';

interface PageExtractorOptions {
  fetchFn?: typeof fetch;
}

export const createPageExtractor = ({ fetchFn = fetch }: PageExtractorOptions = {}) => ({
  async extractPage(request: PageExtractionRequest): Promise<PageExtractionResult> {
    const html = request.html ?? await fetchHtml(request.url, fetchFn);
    const title = firstMatch(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
    const publishedAt =
      metaContent(html, 'article:published_time') ??
      metaContent(html, 'date') ??
      metaContent(html, 'pubdate');
    const canonicalUrl = linkHref(html, 'canonical') ?? request.url;
    const bodyHtml = firstMatch(html, /<article[^>]*>([\s\S]*?)<\/article>/i) ?? firstMatch(html, /<body[^>]*>([\s\S]*?)<\/body>/i) ?? html;
    const paragraphs = Array.from(bodyHtml.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)).map((match) => cleanText(match[1]));
    const textContent = paragraphs.filter(Boolean).join('\n\n');
    const images: ExtractedPageImage[] = Array.from(bodyHtml.matchAll(/<figure[^>]*>[\s\S]*?<img[^>]+src=["']([^"']+)["'][^>]*>[\s\S]*?(?:<figcaption[^>]*>([\s\S]*?)<\/figcaption>)?[\s\S]*?<\/figure>|<img[^>]+src=["']([^"']+)["'][^>]*>/gi)).map((match) => {
      const src = match[1] ?? match[3];
      const figureHtml = match[0];
      const alt = firstMatch(figureHtml, /alt=["']([^"']+)["']/i);
      const caption = match[2] ? cleanText(match[2]) : undefined;
      return {
        imageUrl: new URL(src, request.url).href,
        sourcePageUrl: canonicalUrl,
        alt,
        caption,
        roleHint: 'inline' as const,
      };
    });

    if (images[0]) {
      images[0].roleHint = 'hero';
    }

    return {
      url: request.url,
      canonicalUrl,
      title: title ? cleanText(title) : undefined,
      publishedAt,
      extractedAt: new Date().toISOString(),
      textContent,
      evidenceBlocks: textContent
        ? [{ sourceUrl: canonicalUrl, text: textContent.slice(0, 1200) }]
        : [],
      images,
      warnings: textContent ? [] : [{ code: 'empty_body', message: 'No readable body found.' }],
    };
  },
});

const fetchHtml = async (url: string, fetchFn: typeof fetch): Promise<string> => {
  const response = await fetchFn(url);
  if (!response.ok) {
    throw new ResearchMediaError('provider_request_failed', 'Page fetch failed.', { url, status: response.status });
  }
  return response.text();
};

const firstMatch = (value: string, pattern: RegExp): string | undefined => pattern.exec(value)?.[1];

const metaContent = (html: string, name: string): string | undefined =>
  firstMatch(html, new RegExp(`<meta[^>]+(?:property|name)=["']${escapeRegExp(name)}["'][^>]+content=["']([^"']+)["'][^>]*>`, 'i'));

const linkHref = (html: string, rel: string): string | undefined =>
  firstMatch(html, new RegExp(`<link[^>]+rel=["']${escapeRegExp(rel)}["'][^>]+href=["']([^"']+)["'][^>]*>`, 'i'));

const cleanText = (value: string): string =>
  value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

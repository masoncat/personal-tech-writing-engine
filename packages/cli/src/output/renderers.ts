export const OUTPUT_FORMATS = ['json', 'text', 'markdown'] as const;

export type OutputFormat = (typeof OUTPUT_FORMATS)[number];

export interface Writer {
  write(chunk: string): unknown;
}

export const renderOutput = (value: unknown, format: OutputFormat): string => {
  switch (format) {
    case 'json':
      return JSON.stringify(value, null, 2);
    case 'markdown':
      return renderMarkdown(value).trimEnd();
    case 'text':
    default:
      return renderText(value).trimEnd();
  }
};

export const writeRenderedOutput = (
  writer: Writer,
  value: unknown,
  format: OutputFormat,
): void => {
  writer.write(`${renderOutput(value, format)}\n`);
};

const renderText = (value: unknown, depth = 0, key?: string): string => {
  const indent = '  '.repeat(depth);

  if (isPrimitive(value)) {
    return key === undefined ? `${indent}${formatPrimitive(value)}` : `${indent}${key}: ${formatPrimitive(value)}`;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return key === undefined ? `${indent}[]` : `${indent}${key}: []`;
    }

    const lines: string[] = [];
    if (key !== undefined) {
      lines.push(`${indent}${key}:`);
    }

    for (const item of value) {
      if (isPrimitive(item)) {
        lines.push(`${indent}${key === undefined ? '' : '  '}- ${formatPrimitive(item)}`);
        continue;
      }

      lines.push(`${indent}${key === undefined ? '' : '  '}-`);
      lines.push(renderText(item, depth + (key === undefined ? 1 : 2)));
    }

    return lines.join('\n');
  }

  const entries = Object.entries(value);
  if (entries.length === 0) {
    return key === undefined ? `${indent}{}` : `${indent}${key}: {}`;
  }

  const lines: string[] = [];
  if (key !== undefined) {
    lines.push(`${indent}${key}:`);
  }

  for (const [entryKey, entryValue] of entries) {
    lines.push(renderText(entryValue, depth + (key === undefined ? 0 : 1), entryKey));
  }

  return lines.join('\n');
};

const renderMarkdown = (value: unknown, depth = 0, key?: string): string => {
  const headingLevel = Math.min(depth + 2, 6);

  if (isPrimitive(value)) {
    if (key === undefined) {
      return `${formatPrimitive(value)}`;
    }

    return `- **${key}:** ${formatPrimitive(value)}`;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return key === undefined ? '- _(empty list)_' : `- **${key}:** _(empty list)_`;
    }

    const lines: string[] = [];
    if (key !== undefined) {
      lines.push(`${'#'.repeat(headingLevel)} ${key}`);
    }

    for (const item of value) {
      if (isPrimitive(item)) {
        lines.push(`- ${formatPrimitive(item)}`);
        continue;
      }

      lines.push('-');
      lines.push(indentBlock(renderMarkdown(item, depth + 1), 2));
    }

    return lines.join('\n');
  }

  const entries = Object.entries(value);
  if (entries.length === 0) {
    return key === undefined ? '- _(empty object)_' : `- **${key}:** _(empty object)_`;
  }

  const lines: string[] = [];
  if (key !== undefined) {
    lines.push(`${'#'.repeat(headingLevel)} ${key}`);
  }

  for (const [entryKey, entryValue] of entries) {
    if (isPrimitive(entryValue)) {
      lines.push(`- **${entryKey}:** ${formatPrimitive(entryValue)}`);
      continue;
    }

    lines.push(renderMarkdown(entryValue, depth + 1, entryKey));
  }

  return lines.join('\n');
};

const indentBlock = (value: string, spaces: number): string =>
  value
    .split('\n')
    .map((line) => `${' '.repeat(spaces)}${line}`)
    .join('\n');

const isPrimitive = (value: unknown): value is boolean | number | string | null | undefined =>
  value === null || value === undefined || typeof value !== 'object';

const formatPrimitive = (value: boolean | number | string | null | undefined): string => {
  if (value === null) {
    return 'null';
  }

  if (value === undefined) {
    return 'undefined';
  }

  return String(value);
};

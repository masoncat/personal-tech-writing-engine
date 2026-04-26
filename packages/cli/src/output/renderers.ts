import { InvalidArgumentError } from 'commander';

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
      return renderMarkdown(value).join('\n').trimEnd();
    case 'text':
      return renderText(value).join('\n').trimEnd();
  }

  throw new Error(`Unsupported output format: ${String(format)}`);
};

export const writeRenderedOutput = (
  writer: Writer,
  value: unknown,
  format: OutputFormat,
): void => {
  writer.write(`${renderOutput(value, format)}\n`);
};

export const createChoiceParser =
  <T extends string>(allowedValues: readonly T[], optionName: string) =>
  (value: string): T => {
    if ((allowedValues as readonly string[]).includes(value)) {
      return value as T;
    }

    throw new InvalidArgumentError(
      `${optionName} must be one of: ${allowedValues.join(', ')}`,
    );
  };

const renderText = (value: unknown, depth = 0, key?: string): string[] => {
  const indent = '  '.repeat(depth);

  if (isPrimitive(value)) {
    return renderTextPrimitive(value, indent, key);
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return [key === undefined ? `${indent}[]` : `${indent}${key}: []`];
    }

    const lines: string[] = [];
    if (key !== undefined) {
      lines.push(`${indent}${key}:`);
    }

    const itemIndent = '  '.repeat(key === undefined ? depth : depth + 1);

    for (const item of value) {
      if (typeof item === 'string' && item.includes('\n')) {
        lines.push(`${itemIndent}- |`);
        lines.push(...renderMultilineBlock(item, key === undefined ? depth + 1 : depth + 2));
        continue;
      }

      if (isPrimitive(item)) {
        lines.push(`${itemIndent}- ${formatPrimitive(item)}`);
        continue;
      }

      lines.push(`${itemIndent}-`);
      lines.push(...renderText(item, key === undefined ? depth + 1 : depth + 2));
    }

    return lines;
  }

  const entries = Object.entries(value);
  if (entries.length === 0) {
    return [key === undefined ? `${indent}{}` : `${indent}${key}: {}`];
  }

  const lines: string[] = [];
  if (key !== undefined) {
    lines.push(`${indent}${key}:`);
  }

  for (const [entryKey, entryValue] of entries) {
    lines.push(...renderText(entryValue, depth + (key === undefined ? 0 : 1), entryKey));
  }

  return lines;
};

const renderMarkdown = (value: unknown, depth = 0, key?: string): string[] => {
  const headingLevel = Math.min(depth + 2, 6);

  if (isPrimitive(value)) {
    return renderMarkdownPrimitive(value, key);
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return [key === undefined ? '- _(empty list)_' : `- **${key}:** _(empty list)_`];
    }

    const lines: string[] = [];
    if (key !== undefined) {
      lines.push(`${'#'.repeat(headingLevel)} ${key}`);
    }

    for (const item of value) {
      if (typeof item === 'string' && item.includes('\n')) {
        lines.push('-');
        lines.push(...renderMarkdownCodeFence(item, 1));
        continue;
      }

      if (isPrimitive(item)) {
        lines.push(`- ${formatPrimitive(item)}`);
        continue;
      }

      lines.push('-');
      lines.push(...indentLines(renderMarkdown(item, depth + 1), 2));
    }

    return lines;
  }

  const entries = Object.entries(value);
  if (entries.length === 0) {
    return [key === undefined ? '- _(empty object)_' : `- **${key}:** _(empty object)_`];
  }

  const lines: string[] = [];
  if (key !== undefined) {
    lines.push(`${'#'.repeat(headingLevel)} ${key}`);
  }

  for (const [entryKey, entryValue] of entries) {
    if (typeof entryValue === 'string' && entryValue.includes('\n')) {
      lines.push(`- **${entryKey}:**`);
      lines.push(...renderMarkdownCodeFence(entryValue, 1));
      continue;
    }

    if (isPrimitive(entryValue)) {
      lines.push(`- **${entryKey}:** ${formatPrimitive(entryValue)}`);
      continue;
    }

    lines.push(...renderMarkdown(entryValue, depth + 1, entryKey));
  }

  return lines;
};

const renderTextPrimitive = (
  value: boolean | number | string | null | undefined,
  indent: string,
  key?: string,
): string[] => {
  if (typeof value === 'string' && value.includes('\n')) {
    if (key === undefined) {
      return ['|', ...renderMultilineBlock(value, 1)];
    }

    return [`${indent}${key}: |`, ...renderMultilineBlock(value, indent.length / 2 + 1)];
  }

  return [
    key === undefined
      ? `${indent}${formatPrimitive(value)}`
      : `${indent}${key}: ${formatPrimitive(value)}`,
  ];
};

const renderMarkdownPrimitive = (
  value: boolean | number | string | null | undefined,
  key?: string,
): string[] => {
  if (typeof value === 'string' && value.includes('\n')) {
    if (key === undefined) {
      return renderMarkdownCodeFence(value, 0);
    }

    return [`- **${key}:**`, ...renderMarkdownCodeFence(value, 1)];
  }

  if (key === undefined) {
    return [`${formatPrimitive(value)}`];
  }

  return [`- **${key}:** ${formatPrimitive(value)}`];
};

const renderMultilineBlock = (value: string, depth: number): string[] => {
  const indent = '  '.repeat(depth);
  return value.split('\n').map((line) => `${indent}${line}`);
};

const renderMarkdownCodeFence = (value: string, indentLevel: number): string[] => {
  const indent = '  '.repeat(indentLevel);
  return [
    `${indent}\`\`\`text`,
    ...value.split('\n').map((line) => `${indent}${line}`),
    `${indent}\`\`\``,
  ];
};

const indentLines = (lines: string[], spaces: number): string[] =>
  lines.map((line) => `${' '.repeat(spaces)}${line}`);

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

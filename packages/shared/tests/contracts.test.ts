import { describe, expect, it } from 'vitest';
import {
  ErrorCode,
  type CreateTaskRequest,
  type ExportTarget,
} from '../src/index.js';

describe('shared contracts', () => {
  it('keeps export targets explicit', () => {
    const target: ExportTarget = 'obsidian';

    expect(target).toBe('obsidian');
  });

  it('defines the required task creation request shape', () => {
    const request: CreateTaskRequest = {
      title: 'React Fiber scheduling',
      articleType: 'source-analysis',
      reader: 'frontend engineers',
    };

    expect(request.title).toContain('Fiber');
    expect(request.articleType).toBe('source-analysis');
    expect(request.reader).toBe('frontend engineers');
  });

  it('defines the invalid stage transition error code', () => {
    expect(ErrorCode.InvalidStageTransition).toBe('INVALID_STAGE_TRANSITION');
  });
});

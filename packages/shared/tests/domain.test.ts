import { describe, expect, it } from 'vitest';
import { TaskStage } from '../src/domain.js';

describe('shared domain bootstrap', () => {
  it('exposes the task stages needed by the workflow', () => {
    expect(TaskStage.Created).toBe('created');
    expect(TaskStage.Exported).toBe('exported');
  });
});

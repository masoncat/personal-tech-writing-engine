import { describe, expect, it } from 'vitest';
import { TaskStage } from '../src/index.js';

describe('shared domain', () => {
  it('defines the forward-only workflow stages', () => {
    expect(Object.values(TaskStage)).toEqual([
      'created',
      'collecting_materials',
      'bedrock_review',
      'outline_review',
      'draft_ready',
      'rewriting',
      'exported',
    ]);
  });
});

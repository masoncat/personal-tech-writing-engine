import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  'packages/shared',
  'packages/mock-server',
  'packages/cli',
  'packages/research-media-tools',
]);

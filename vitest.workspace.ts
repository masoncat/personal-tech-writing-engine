import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  'packages/shared',
  'packages/mock-server',
  'packages/cli',
  'tests/e2e',
]);

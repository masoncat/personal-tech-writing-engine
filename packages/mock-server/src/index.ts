import { join } from 'node:path';

import { buildApp } from './app.js';

const host = '127.0.0.1';
const port = 4312;
const dataDir = join(process.cwd(), '.ptce-data');

const app = buildApp({ dataDir });

try {
  await app.listen({ host, port });
  console.log(`PTCE mock server listening at http://${host}:${port}`);
} catch (error) {
  console.error(error);
  process.exit(1);
}

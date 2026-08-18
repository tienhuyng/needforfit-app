import { createApp } from './app';
import { env } from './config/env';
import { disconnectDatabase } from './config/database';

const app = createApp();

const server = app.listen(env.port, () => {
  console.log(`Needforfit API running on port ${env.port}`);
});

process.on('SIGTERM', async () => {
  await disconnectDatabase();
  server.close();
});

export default app;

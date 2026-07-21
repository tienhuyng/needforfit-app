import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes';
import { i18nMiddleware } from './middleware/i18n.middleware';
import { errorHandler } from './middleware/validation.middleware';

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(i18nMiddleware);

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/auth', authRoutes);

  app.use(errorHandler);

  return app;
}

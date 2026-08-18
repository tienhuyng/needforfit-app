import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes';
import ptRoutes from './routes/pt.routes';
import traineeRoutes from './routes/trainee.routes';
import { i18nMiddleware } from './middleware/i18n.middleware';
import { errorHandler } from './middleware/validation.middleware';

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(i18nMiddleware);

  const healthHandler = (_req: express.Request, res: express.Response) => {
    res.json({ status: 'ok' });
  };

  app.get('/health', healthHandler);
  app.get('/api/health', healthHandler);

  app.use('/api/auth', authRoutes);
  app.use('/api/pt', ptRoutes);
  app.use('/api/trainee', traineeRoutes);

  app.use(errorHandler);

  return app;
}

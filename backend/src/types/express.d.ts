import { UserRole } from '@prisma/client';
import { AuthTokenPayload } from '../types/auth';

declare global {
  namespace Express {
    interface Request {
      user?: AuthTokenPayload;
    }
  }
}

export {};

import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import { verifyJwt } from '../utils/password';
import { AppError } from '../utils/errors';
import { PT_ERROR_CODES, PT_I18N_KEYS } from '../types/pt.errors';

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    next(new AppError(PT_ERROR_CODES.UNAUTHORIZED, PT_I18N_KEYS.unauthorized, 401));
    return;
  }

  try {
    req.user = verifyJwt(header.slice(7));
    next();
  } catch {
    next(new AppError(PT_ERROR_CODES.UNAUTHORIZED, PT_I18N_KEYS.unauthorized, 401));
  }
}

export function requireRoles(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      next(new AppError(PT_ERROR_CODES.FORBIDDEN, PT_I18N_KEYS.forbidden, 403));
      return;
    }
    next();
  };
}

export function getPtId(req: Request): string {
  if (!req.user) {
    throw new AppError(PT_ERROR_CODES.UNAUTHORIZED, PT_I18N_KEYS.unauthorized, 401);
  }
  return req.user.sub;
}

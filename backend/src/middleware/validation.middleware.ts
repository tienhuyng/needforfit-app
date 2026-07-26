import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { AUTH_ERROR_CODES } from '../types/errors';
import { AUTH_I18N_KEYS } from '../types/errors';
import { AppError, buildErrorResponse, formatZodErrors } from '../utils/errors';
import { t } from '../config/i18n';

export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const errors = formatZodErrors(result.error, req.language);
      res.status(400).json(
        buildErrorResponse(
          AUTH_ERROR_CODES.VALIDATION_ERROR,
          AUTH_I18N_KEYS.emailInvalid,
          req.language,
          errors
        )
      );
      return;
    }
    req.query = result.data as Request['query'];
    next();
  };
}

export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = formatZodErrors(result.error, req.language);
      res.status(400).json(
        buildErrorResponse(
          AUTH_ERROR_CODES.VALIDATION_ERROR,
          AUTH_I18N_KEYS.emailInvalid,
          req.language,
          errors
        )
      );
      return;
    }
    req.body = result.data;
    next();
  };
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json(
      buildErrorResponse(err.code, err.i18nKey, req.language, err.details)
    );
    return;
  }

  console.error(err);
  res.status(500).json(
    buildErrorResponse(
      AUTH_ERROR_CODES.INTERNAL_ERROR,
      AUTH_I18N_KEYS.emailInvalid,
      req.language
    )
  );
}

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
}

export function successMessage(key: string, lng: Parameters<typeof t>[1]): string {
  return t(key, lng);
}

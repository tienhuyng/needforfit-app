import { Request, Response, NextFunction } from 'express';
import { SupportedLanguage, resolveLanguage } from '../config/i18n';

declare global {
  namespace Express {
    interface Request {
      language: SupportedLanguage;
    }
  }
}

export function i18nMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const acceptLanguage = req.headers['accept-language'];
  const queryLang = typeof req.query.lang === 'string' ? req.query.lang : undefined;
  req.language = queryLang && isValidLang(queryLang)
    ? (queryLang as SupportedLanguage)
    : resolveLanguage(acceptLanguage);
  next();
}

function isValidLang(lang: string): boolean {
  return ['vi', 'en', 'zh', 'ja', 'es'].includes(lang);
}

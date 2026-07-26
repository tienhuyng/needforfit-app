import { ZodError, ZodIssue } from 'zod';
import { SupportedLanguage, t } from '../config/i18n';
import { ApiErrorDetail } from '../types/auth';

const FIELD_I18N_MAP: Record<string, string> = {
  email: 'auth.errors.emailInvalid',
  password: 'auth.errors.passwordTooShort',
  newPassword: 'auth.errors.passwordTooShort',
  confirmPassword: 'auth.errors.passwordMismatch',
  firstName: 'auth.errors.firstNameRequired',
  lastName: 'auth.errors.lastNameRequired',
  role: 'auth.errors.roleInvalid',
  token: 'auth.errors.tokenRequired',
};

export function formatZodErrors(
  error: ZodError,
  lng: SupportedLanguage
): ApiErrorDetail[] {
  return error.issues.map((issue: ZodIssue) => {
    const field = issue.path[0]?.toString();
    const i18nKey =
      typeof issue.message === 'string' &&
      (issue.message.startsWith('auth.') || issue.message.startsWith('pt.'))
        ? issue.message
        : field
          ? (FIELD_I18N_MAP[field] ?? 'auth.errors.validation')
          : 'auth.errors.validation';

    return {
      field,
      i18nKey,
      message: t(i18nKey, lng),
    };
  });
}

export class AppError extends Error {
  constructor(
    public readonly code: string,
    public readonly i18nKey: string,
    public readonly statusCode: number,
    public readonly details?: ApiErrorDetail[]
  ) {
    super(i18nKey);
    this.name = 'AppError';
  }
}

export function buildErrorResponse(
  code: string,
  i18nKey: string,
  lng: SupportedLanguage,
  errors?: ApiErrorDetail[]
) {
  return {
    status: 'error' as const,
    code,
    message: t(i18nKey, lng),
    ...(errors ? { errors } : {}),
  };
}

export function buildSuccessResponse<T>(data: T, message?: string) {
  return {
    status: 'success' as const,
    data,
    ...(message ? { message } : {}),
  };
}
